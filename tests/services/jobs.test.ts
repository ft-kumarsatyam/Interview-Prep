import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Job } from "@/lib/models/jobs";
import { Settings } from "@/lib/models/system";
import { Target } from "@/lib/models/targets";
import { buildBriefing } from "@/lib/services/briefing";
import { addJob, attachResumeToJob, deleteJob, getJob, jobsDueForFollowUp, listJobs, saveJobNotes, setJobStatus } from "@/lib/services/jobs";
import { ensureToday } from "@/lib/services/plan";
import { createVersion, listProfiles, MAX_PROFILES, saveBaseResume, saveProfileSnapshot } from "@/lib/services/resume";
import { invalidateSettings } from "@/lib/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

const JOB = { title: "Backend Engineer", company: "Razorpay Software Pvt Ltd", url: "https://www.linkedin.com/jobs/view/backend-engineer-3801234567/?trk=x", jd: "Node.js and PostgreSQL" };

describe("job tracker", () => {
  it("saves a job once however it is reached, and matches it to a target", async () => {
    await Target.create({ name: "Razorpay", tier: "mid-tier", priority: "target" });
    const a = await addJob(JOB, "2026-10-05");
    const b = await addJob({ ...JOB, url: "https://in.linkedin.com/jobs/view/3801234567" }, "2026-10-05");
    expect(a).toMatchObject({ ok: true, duplicate: false });
    expect(b).toMatchObject({ ok: true, duplicate: true });
    expect(await Job.countDocuments()).toBe(1);
    if (a.ok) expect(a.job).toMatchObject({ source: "linkedin", status: "saved", targetName: "Razorpay" });
  });

  it("rejects non-web links", async () => {
    expect(await addJob({ ...JOB, url: "javascript:alert(1)" } as never, "2026-10-05")).toMatchObject({ ok: false });
  });

  it("applying stamps the date and schedules a follow-up; moving on reschedules; rejection clears it", async () => {
    const r = await addJob(JOB, "2026-10-05");
    if (!r.ok) throw new Error("add failed");
    await setJobStatus(r.job.id, "applied", "2026-10-06");
    let j = (await getJob(r.job.id))!;
    expect(j).toMatchObject({ status: "applied", appliedOn: "2026-10-06", followUpOn: "2026-10-13" });
    await setJobStatus(r.job.id, "interview", "2026-10-14");
    j = (await getJob(r.job.id))!;
    expect(j).toMatchObject({ status: "interview", appliedOn: "2026-10-06", followUpOn: "2026-10-16" });
    await setJobStatus(r.job.id, "rejected", "2026-10-15");
    j = (await getJob(r.job.id))!;
    expect(j.followUpOn).toBeNull();
    expect(j.statusLog.map((s) => s.status)).toEqual(["saved", "applied", "interview", "rejected"]);
    await expect(setJobStatus("0".repeat(24), "applied", "2026-10-06")).rejects.toThrow(/Unknown/);
  });

  it("lists follow-ups that are due, and only those", async () => {
    const a = await addJob(JOB, "2026-10-01");
    const b = await addJob({ ...JOB, url: "https://in.indeed.com/viewjob?jk=zzz" }, "2026-10-01");
    if (!a.ok || !b.ok) throw new Error("add failed");
    await setJobStatus(a.job.id, "applied", "2026-10-01"); // follow up 2026-10-08
    await setJobStatus(b.job.id, "applied", "2026-10-05"); // follow up 2026-10-12
    expect((await jobsDueForFollowUp("2026-10-07")).map((j) => j.id)).toEqual([]);
    expect((await jobsDueForFollowUp("2026-10-09")).map((j) => j.id)).toEqual([a.job.id]);
    expect((await jobsDueForFollowUp("2026-10-20")).map((j) => j.id)).toEqual([a.job.id, b.job.id]);
  });

  it("keeps notes, links a resume, and deletes", async () => {
    const r = await addJob(JOB, "2026-10-05");
    if (!r.ok) throw new Error("add failed");
    await saveJobNotes(r.job.id, "Referral from Asha");
    await saveBaseResume("Aarav\naarav@example.com\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built things with Node.js for 2M users\nSKILLS\nNode.js");
    const v = await createVersion({ label: "Razorpay", text: "Aarav\naarav@example.com\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built things with Node.js for 2M users\nSKILLS\nNode.js" });
    await attachResumeToJob(r.job.id, v.id, 71);
    expect(await getJob(r.job.id)).toMatchObject({ notes: "Referral from Asha", resumeId: v.id, atsScore: 71 });
    await deleteJob(r.job.id);
    expect(await listJobs()).toHaveLength(0);
    await expect(deleteJob("nope")).rejects.toThrow();
  });
});

describe("profile snapshots", () => {
  it("keeps only the most recent few", async () => {
    for (let i = 0; i < MAX_PROFILES + 3; i++) await saveProfileSnapshot({ title: `P${i}`, url: "https://www.linkedin.com/in/aarav", text: `Profile text ${i} `.repeat(20) });
    const list = await listProfiles();
    expect(list).toHaveLength(MAX_PROFILES);
    expect(list[0]!.role).toBe(`P${MAX_PROFILES + 2}`);
  });
});

describe("daily briefing and job follow-ups", () => {
  it("lists applications to follow up", async () => {
    const r = await addJob(JOB, "2026-10-01");
    if (!r.ok) throw new Error("add failed");
    await setJobStatus(r.job.id, "applied", "2026-10-01");
    const now = at("2026-10-12");
    const state = await ensureToday(now);
    const mail = await buildBriefing(state, now);
    expect(mail?.spec.sections.some((s) => s.heading === "Applications to follow up")).toBe(true);
    expect(mail?.text).toContain("Backend Engineer at Razorpay Software Pvt Ltd");
  });
});
