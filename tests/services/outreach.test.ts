import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/core/env";
import { Job } from "@/core/models/jobs";
import { JobPosting } from "@/core/models/job-postings";
import { Settings } from "@/core/models/system";
import { ingestPushed } from "@/modules/jobs/services/job-ingest";
import { addJob } from "@/modules/jobs/services/jobs";
import { draftRecruiterEmail, listOutreach, sendRecruiterEmail } from "@/modules/jobs/services/outreach";
import { saveBaseResume } from "@/modules/resume/services/resume";
import { invalidateSettings } from "@/modules/settings/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
  await Promise.all([JobPosting.syncIndexes(), Job.syncIndexes()]);
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ["GEMINI_API_KEY", "GROQ_API_KEY", "BREVO_API_KEY", "BREVO_SENDER_EMAIL", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]) delete process.env[k];
  resetEnvForTests();
});

const RESUME = "Aarav Mehta. Backend engineer. Built payment APIs in Node.js and PostgreSQL serving 2,000 requests per second. Cut p95 latency by 40%. Led a team of two on a Redis caching layer. Open source contributor.";
const BODY = "Hello, I am interested in the Backend Engineer role at Acme. I built payment APIs in Node.js and PostgreSQL and cut p95 latency by 40%. I would value a short conversation about how I can help.";
const geminiJson = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });

function env(extra: Record<string, string> = {}) {
  Object.assign(process.env, extra);
  resetEnvForTests();
}
async function seedJob() {
  await ingestPushed([{ title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/1", description: "Node.js, PostgreSQL and Kafka. 5 years of experience." }]);
  return String((await JobPosting.findOne({}).lean())!._id);
}

describe("draftRecruiterEmail", () => {
  it("needs a resume, a job and an AI key, and says which is missing", async () => {
    const id = await seedJob();
    expect(await draftRecruiterEmail({ kind: "posting", id })).toMatchObject({ ok: false, error: expect.stringContaining("resume") });
    await saveBaseResume(RESUME);
    expect(await draftRecruiterEmail({ kind: "posting", id: "a".repeat(24) })).toMatchObject({ ok: false, error: expect.stringContaining("no longer") });
    expect(await draftRecruiterEmail({ kind: "posting", id })).toMatchObject({ ok: false, unavailable: true });
  });

  it("returns a validated draft built from the resume, with the job and resume fenced in the prompt", async () => {
    await saveBaseResume(RESUME);
    const id = await seedJob();
    env({ GEMINI_API_KEY: "gem-key-1234567" });
    const fetchMock = vi.fn(async (..._a: unknown[]) => geminiJson({ subject: "Backend Engineer at Acme", body: BODY }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await draftRecruiterEmail({ kind: "posting", id });
    expect(r).toMatchObject({ ok: true, warnings: [] });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const sent = (JSON.parse(String(init.body)) as { contents: Array<{ parts: Array<{ text: string }> }> }).contents[0]!.parts[0]!.text;
    expect(sent).toContain("<resume>");
    expect(sent).toContain("<job ");
  });

  it("warns about claims the resume does not back up instead of hiding them", async () => {
    await saveBaseResume(RESUME);
    const id = await seedJob();
    env({ GEMINI_API_KEY: "gem-key-1234567" });
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ subject: "Backend Engineer at Acme", body: `${BODY} I also run Kafka clusters handling 50000 events per second.` })));
    const r = await draftRecruiterEmail({ kind: "posting", id });
    expect(r.ok && r.warnings.join(" ").toLowerCase()).toMatch(/kafka/);
    expect(r.ok && r.warnings.join(" ")).toContain("50000");
  });

  it("rejects a model reply that does not match the schema", async () => {
    await saveBaseResume(RESUME);
    const id = await seedJob();
    env({ GEMINI_API_KEY: "gem-key-1234567" });
    vi.stubGlobal("fetch", vi.fn(async () => geminiJson({ subject: "x" })));
    expect((await draftRecruiterEmail({ kind: "posting", id })).ok).toBe(false);
  });

  it("never uses the paid provider (resume is personal data)", async () => {
    await saveBaseResume(RESUME);
    const id = await seedJob();
    env({ META_LLAMA_API_KEY: "meta-key-1234567", META_LLAMA_BASE_URL: "https://llama.example/v1", META_LLAMA_MODEL: "m" });
    const fetchMock = vi.fn(async () => new Response("no", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    await draftRecruiterEmail({ kind: "posting", id });
    expect(fetchMock).not.toHaveBeenCalled();
    delete process.env.META_LLAMA_API_KEY;
    delete process.env.META_LLAMA_BASE_URL;
    delete process.env.META_LLAMA_MODEL;
  });
});

describe("sendRecruiterEmail", () => {
  const email = { to: "Jane@Acme.com", subject: "Backend Engineer at Acme", body: BODY };
  const brevo = () => env({ BREVO_API_KEY: "xkeysib-abcdef123456", BREVO_SENDER_EMAIL: "me@example.com" });

  it("saves the job to the tracker, sends with your address as Reply-To and records it without the body", async () => {
    const id = await seedJob();
    brevo();
    const fetchMock = vi.fn(async (..._a: unknown[]) => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendRecruiterEmail({ kind: "posting", id }, email);
    expect(r).toMatchObject({ ok: true, provider: "brevo" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.brevo.com");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ to: [{ email: "jane@acme.com" }], replyTo: { email: "owner@example.com" }, subject: email.subject, textContent: BODY });
    const job = await Job.findById((r as { jobId: string }).jobId).lean();
    expect(job?.outreach).toHaveLength(1);
    expect(job?.outreach[0]).toMatchObject({ to: "jane@acme.com", subject: email.subject });
    expect(JSON.stringify(job?.outreach)).not.toContain("payment APIs");
    expect(job?.contact).toBe("jane@acme.com");
    expect(await listOutreach((r as { jobId: string }).jobId)).toHaveLength(1);
  });

  it("works for an already tracked job and through Resend with a verified sender", async () => {
    const added = await addJob({ title: "SRE", company: "Beta", url: "https://beta.com/jobs/2", jd: "x".repeat(60) }, "2026-10-05");
    if (!added.ok) throw new Error("setup");
    env({ RESEND_API_KEY: "re_abcdefghijk", RESEND_FROM_EMAIL: "prepos@example.com" });
    const fetchMock = vi.fn(async (..._a: unknown[]) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendRecruiterEmail({ kind: "job", id: added.job.id }, email)).toMatchObject({ ok: true, provider: "resend" });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).toMatchObject({ reply_to: "owner@example.com", to: ["jane@acme.com"] });
  });

  it("explains when no sending provider is configured, and sends nothing", async () => {
    const id = await seedJob();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await sendRecruiterEmail({ kind: "posting", id }, email);
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("No email provider") });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await Job.countDocuments({ "outreach.0": { $exists: true } })).toBe(0);
  });

  it("does not record anything when the provider refuses, and lets you retry", async () => {
    const id = await seedJob();
    brevo();
    let ok = false;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(ok ? "{}" : "bad sender", { status: ok ? 201 : 400 })));
    expect(await sendRecruiterEmail({ kind: "posting", id }, email)).toMatchObject({ ok: false, error: expect.stringContaining("refused") });
    expect(await Job.countDocuments({ "outreach.0": { $exists: true } })).toBe(0);
    ok = true;
    expect((await sendRecruiterEmail({ kind: "posting", id }, email)).ok).toBe(true);
  });

  it("blocks an immediate duplicate and caps the day at ten emails", async () => {
    const id = await seedJob();
    brevo();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    expect((await sendRecruiterEmail({ kind: "posting", id }, email)).ok).toBe(true);
    expect(await sendRecruiterEmail({ kind: "posting", id }, email)).toMatchObject({ ok: false, error: expect.stringContaining("just sent") });
    for (let i = 0; i < 9; i++) expect((await sendRecruiterEmail({ kind: "posting", id }, { ...email, subject: `Hello ${i}` })).ok).toBe(true);
    expect(await sendRecruiterEmail({ kind: "posting", id }, { ...email, subject: "One more" })).toMatchObject({ ok: false, error: expect.stringContaining("limit") });
  });

  it("validates the address, subject and body before anything else", async () => {
    const id = await seedJob();
    brevo();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const bad of [{ ...email, to: "nope" }, { ...email, subject: "Hi\r\nBcc: x@y.com" }, { ...email, body: "short" }, {}]) expect((await sendRecruiterEmail({ kind: "posting", id }, bad)).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an unknown tracked job", async () => {
    brevo();
    vi.stubGlobal("fetch", vi.fn());
    expect(await sendRecruiterEmail({ kind: "job", id: "b".repeat(24) }, email)).toMatchObject({ ok: false, error: expect.stringContaining("no longer") });
  });
});

describe("the send action", () => {
  it("requires the explicit confirmation flag", async () => {
    vi.doMock("@/core/auth/dal", () => ({ requireSession: async () => undefined }));
    const { sendEmailAction } = await import("@/app/(app)/jobs/outreach-actions");
    const r = await sendEmailAction({ target: { kind: "job", id: "a".repeat(24) }, email: {}, confirm: false });
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("Confirm") });
    vi.doUnmock("@/core/auth/dal");
  });
});
