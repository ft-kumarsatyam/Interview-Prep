import { describe, expect, it } from "vitest";
import { applicationPatterns, compareOffers, daysInStage, funnel, nextJobAction, type InsightJob } from "@/modules/jobs/domain/job-insights";

const T = "2026-10-20";
const job = (o: Partial<InsightJob> & { id: string }): InsightJob => ({ title: "Backend Engineer", company: "Acme", status: "saved", statusLog: [{ status: "saved", on: "2026-10-01" }], appliedOn: null, followUpOn: null, resumeId: null, ...o });

describe("funnel", () => {
  it("counts the furthest stage each job reached and the conversion from applied", () => {
    const jobs = [
      job({ id: "a", status: "saved" }),
      job({ id: "b", status: "applied", appliedOn: "2026-10-18", statusLog: [{ status: "applied", on: "2026-10-18" }] }),
      job({ id: "c", status: "rejected", appliedOn: "2026-10-02", statusLog: [{ status: "applied", on: "2026-10-02" }, { status: "screening", on: "2026-10-06" }, { status: "rejected", on: "2026-10-09" }] }),
      job({ id: "d", status: "offer", appliedOn: "2026-09-20", statusLog: [{ status: "applied", on: "2026-09-20" }, { status: "interview", on: "2026-10-01" }, { status: "offer", on: "2026-10-10" }] }),
    ];
    const f = funnel(jobs, T);
    expect(f.total).toBe(4);
    expect(f.applied).toBe(3);
    expect(f.reached).toEqual({ applied: 3, screening: 2, interview: 1, offer: 1 });
    expect(f.conversion).toEqual({ screening: 67, interview: 33, offer: 33 });
    expect(f.appliedThisWeek).toBe(1);
    expect(f.active).toBe(3);
  });

  it("has null conversion with nothing applied and flags stale applications", () => {
    expect(funnel([job({ id: "a" })], T).conversion).toEqual({ screening: null, interview: null, offer: null });
    const old = job({ id: "o", status: "applied", appliedOn: "2026-10-01", statusLog: [{ status: "applied", on: "2026-10-01" }] });
    const fresh = job({ id: "f", status: "applied", appliedOn: "2026-10-18", statusLog: [{ status: "applied", on: "2026-10-18" }] });
    expect(funnel([old, fresh], T).stale.map((j) => j.id)).toEqual(["o"]);
  });

  it("measures days in the current stage", () => {
    expect(daysInStage(job({ id: "x", statusLog: [{ status: "applied", on: "2026-10-15" }] }), T)).toBe(5);
    expect(daysInStage(job({ id: "y", statusLog: [], appliedOn: null }), T)).toBeNull();
  });
});

describe("nextJobAction", () => {
  it("asks for a resume first", () => {
    expect(nextJobAction({ hasResume: false, jobs: [], today: T }).kind).toBe("resume");
  });
  it("then follow-ups that are due, naming the job when there is one", () => {
    const due = job({ id: "due", status: "applied", followUpOn: "2026-10-19" });
    expect(nextJobAction({ hasResume: true, jobs: [due], today: T })).toMatchObject({ kind: "follow-up", href: "/jobs/due" });
    expect(nextJobAction({ hasResume: true, jobs: [due, job({ id: "d2", status: "screening", followUpOn: "2026-10-20" })], today: T }).href).toBe("/jobs/tracker");
  });
  it("then interview prep, tailoring, applying, finding roles", () => {
    expect(nextJobAction({ hasResume: true, jobs: [job({ id: "i", status: "interview", followUpOn: "2026-10-30" })], today: T }).kind).toBe("interview");
    expect(nextJobAction({ hasResume: true, jobs: [job({ id: "s" })], today: T })).toMatchObject({ kind: "tailor", href: "/resume/tailor?job=s" });
    expect(nextJobAction({ hasResume: true, jobs: [job({ id: "s", resumeId: "r1" })], today: T }).kind).toBe("apply");
    expect(nextJobAction({ hasResume: true, jobs: [], today: T }).kind).toBe("find");
  });
  it("says you are on top of it when nothing is waiting", () => {
    const waiting = job({ id: "w", status: "applied", followUpOn: "2026-10-27", appliedOn: "2026-10-20", statusLog: [{ status: "applied", on: "2026-10-20" }] });
    expect(nextJobAction({ hasResume: true, jobs: [waiting], today: T }).kind).toBe("clear");
  });
});

import { afterFollowUp, followUpDraft, snoozedFollowUp } from "@/modules/jobs/domain/jobs";

describe("follow-ups you can act on", () => {
  it("snoozes from today and schedules the next nudge a week after a follow-up", () => {
    expect(snoozedFollowUp("2026-10-20", 3)).toBe("2026-10-23");
    expect(afterFollowUp("applied", "2026-10-20")).toBe("2026-10-27");
    expect(afterFollowUp("interview", "2026-10-20")).toBe("2026-10-27");
    expect(afterFollowUp("rejected", "2026-10-20")).toBeNull();
    expect(afterFollowUp("saved", "2026-10-20")).toBeNull();
  });

  it("drafts a message for the stage using only facts it was given", () => {
    const applied = followUpDraft({ status: "applied", title: "Backend Engineer", company: "Acme", appliedOn: "2026-10-12" });
    expect(applied).toContain("Backend Engineer role at Acme");
    expect(applied).toContain("on 2026-10-12");
    expect(followUpDraft({ status: "applied", title: "X", company: "Y", appliedOn: null })).not.toContain(" on null");
    expect(followUpDraft({ status: "interview", title: "X", company: "Y", appliedOn: null })).toContain("next steps");
    expect(followUpDraft({ status: "offer", title: "X", company: "Y", appliedOn: null })).toContain("offer");
  });
});

import { interviewSchema, upcomingInterviews } from "@/modules/jobs/domain/jobs";

describe("interviews", () => {
  const iv = (id: string, status: "applied" | "interview" | "rejected", on: string | null) => ({ id, title: "T", company: "C", status, interviewOn: on, interviewRound: "" });
  it("lists upcoming interviews for live jobs, soonest first", () => {
    const list = upcomingInterviews([iv("a", "interview", "2026-10-25"), iv("b", "applied", "2026-10-22"), iv("c", "rejected", "2026-10-23"), iv("d", "interview", "2026-10-19"), iv("e", "interview", null)], T);
    expect(list.map((j) => j.id)).toEqual(["b", "a"]);
  });
  it("validates the interview form", () => {
    expect(interviewSchema.safeParse({ date: "2026-10-25", round: "Technical", contact: "Asha" }).success).toBe(true);
    expect(interviewSchema.safeParse({ date: null }).success).toBe(true);
    expect(interviewSchema.safeParse({ date: "25/10/2026" }).success).toBe(false);
    expect(interviewSchema.safeParse({ date: "2026-10-25", round: "x".repeat(61) }).success).toBe(false);
  });
});

describe("debriefs", () => {
  it("prompts for a debrief once the interview day has passed and none is recorded for it", () => {
    const past = job({ id: "a", status: "interview", interviewOn: "2026-10-18", interviewDebriefOn: null });
    const debriefed = job({ id: "b", status: "interview", interviewOn: "2026-10-18", interviewDebriefOn: "2026-10-18" });
    const future = job({ id: "c", status: "interview", interviewOn: "2026-10-25", interviewDebriefOn: null });
    expect(nextJobAction({ hasResume: true, jobs: [past], today: T })).toMatchObject({ kind: "debrief", href: "/jobs/a" });
    expect(nextJobAction({ hasResume: true, jobs: [debriefed], today: T }).kind).toBe("interview");
    expect(nextJobAction({ hasResume: true, jobs: [future], today: T }).kind).toBe("interview");
  });
});

describe("compareOffers", () => {
  it("lists offers oldest first with pipeline length and time since the offer", () => {
    const a = job({
      id: "a", title: "Backend Engineer", company: "Acme", status: "offer", appliedOn: "2026-09-20",
      statusLog: [{ status: "applied", on: "2026-09-20" }, { status: "interview", on: "2026-10-01" }, { status: "offer", on: "2026-10-10" }],
    });
    const b = job({
      id: "b", title: "SRE", company: "Globex", status: "offer", appliedOn: "2026-10-01", targetName: "Globex",
      statusLog: [{ status: "applied", on: "2026-10-01" }, { status: "offer", on: "2026-10-15" }],
    });
    const notOffer = job({ id: "c", status: "interview" });
    const out = compareOffers([notOffer, b, a], T);
    expect(out.map((o) => o.id)).toEqual(["a", "b"]);
    expect(out[0]).toMatchObject({ daysInPipeline: 20, daysSinceOffer: 10, isTarget: false });
    expect(out[1]).toMatchObject({ daysInPipeline: 14, daysSinceOffer: 5, isTarget: true });
  });
});

describe("applicationPatterns", () => {
  it("splits conversion to interview by tailoring and by source", () => {
    const tailoredHit = job({ id: "a", status: "interview", resumeId: "r1", source: "linkedin", statusLog: [{ status: "applied", on: "2026-10-01" }, { status: "interview", on: "2026-10-05" }] });
    const tailoredMiss = job({ id: "b", status: "applied", resumeId: "r2", source: "linkedin", statusLog: [{ status: "applied", on: "2026-10-01" }] });
    const genericMiss = job({ id: "c", status: "applied", resumeId: null, source: "naukri", statusLog: [{ status: "applied", on: "2026-10-01" }] });
    const notApplied = job({ id: "d", status: "saved", resumeId: null });
    const out = applicationPatterns([tailoredHit, tailoredMiss, genericMiss, notApplied]);
    expect(out.byTailoring.tailored).toEqual({ label: "Tailored resume", applied: 2, interviewPct: 50 });
    expect(out.byTailoring.untailored).toEqual({ label: "Generic resume", applied: 1, interviewPct: 0 });
    expect(out.bySource).toEqual([
      { label: "Naukri", applied: 1, interviewPct: 0 },
      { label: "LinkedIn", applied: 2, interviewPct: 50 },
    ]);
  });
});
