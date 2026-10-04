import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Job } from "@/core/models/jobs";
import { Settings } from "@/core/models/system";
import { Target } from "@/core/models/targets";
import { buildBriefing } from "@/modules/progress/services/briefing";
import { addJob, attachResumeToJob, deleteJob, getJob, jobsDueForFollowUp, interviewsBetween, listJobs, saveJobNotes, setFollowUp, setInterview, setJobStatus } from "@/modules/jobs/services/jobs";
import { ensureToday } from "@/modules/planner/services/plan";
import { createVersion, listProfiles, MAX_PROFILES, saveBaseResume, saveProfileSnapshot } from "@/modules/resume/services/resume";
import { invalidateSettings } from "@/modules/settings/services/settings";
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

describe("follow-ups you can act on", () => {
  it("snoozes, reschedules, clears and records a follow-up, and never accepts a past or invalid day", async () => {
    const added = await addJob(JOB, "2026-10-05");
    if (!added.ok) throw new Error("add failed");
    const id = added.job.id;
    await setJobStatus(id, "applied", "2026-10-05");
    expect((await getJob(id))!.followUpOn).toBe("2026-10-12");

    await setFollowUp(id, { date: "2026-10-15" }, "2026-10-12");
    expect((await getJob(id))!.followUpOn).toBe("2026-10-15");

    await setFollowUp(id, { followedUp: true }, "2026-10-15");
    expect((await getJob(id))!.followUpOn).toBe("2026-10-22");

    await setFollowUp(id, { date: null }, "2026-10-15");
    expect((await getJob(id))!.followUpOn).toBeNull();
    expect(await jobsDueForFollowUp("2026-11-30")).toEqual([]);

    await expect(setFollowUp(id, { date: "2026-10-01" }, "2026-10-15")).rejects.toThrow(/today or a later day/);
    await expect(setFollowUp(id, { date: "not-a-date" }, "2026-10-15")).rejects.toThrow();
    await expect(setFollowUp("0".repeat(24), { date: null }, "2026-10-15")).rejects.toThrow(/Unknown job/);
  });

  it("a finished job stops asking after you mark it followed up", async () => {
    const added = await addJob({ ...JOB, url: "https://example.com/jobs/9" }, "2026-10-05");
    if (!added.ok) throw new Error("add failed");
    await setJobStatus(added.job.id, "rejected", "2026-10-06");
    await setFollowUp(added.job.id, { followedUp: true }, "2026-10-07");
    expect((await getJob(added.job.id))!.followUpOn).toBeNull();
  });
});

describe("interviews", () => {
  it("saves the next interview, lists it on its day for live jobs only, and rejects past days", async () => {
    const added = await addJob(JOB, "2026-10-05");
    if (!added.ok) throw new Error("add failed");
    const id = added.job.id;
    await setJobStatus(id, "interview", "2026-10-05");
    await setInterview(id, { date: "2026-10-14", round: "System design", contact: "Asha" }, "2026-10-05");
    expect(await getJob(id)).toMatchObject({ interviewOn: "2026-10-14", interviewRound: "System design", contact: "Asha" });
    expect(await interviewsBetween("2026-10-01", "2026-10-31")).toEqual([{ id, title: "Backend Engineer", company: "Razorpay Software Pvt Ltd", round: "System design", date: "2026-10-14" }]);
    expect(await interviewsBetween("2026-10-15", "2026-10-31")).toEqual([]);

    await setJobStatus(id, "rejected", "2026-10-10");
    expect(await interviewsBetween("2026-10-01", "2026-10-31")).toEqual([]);

    await expect(setInterview(id, { date: "2026-10-01", round: "", contact: "" }, "2026-10-05")).rejects.toThrow(/today or a later day/);
    await setInterview(id, { date: null, round: "", contact: "" }, "2026-10-05");
    expect((await getJob(id))!.interviewOn).toBeNull();
  });
});
