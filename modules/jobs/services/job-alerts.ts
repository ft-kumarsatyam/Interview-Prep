import { connectDb } from "@/core/db";
import { renderMail } from "@/modules/notifications/domain/mail-html";
import { matchPosting } from "@/modules/jobs/domain/job-match";
import { plural } from "@/modules/notifications/domain/reminders";
import { env } from "@/core/env";
import type { NotifyChannel } from "@/core/notify";
import { JobPosting } from "@/core/models/job-postings";
import { matchContext } from "@/modules/jobs/services/job-discovery";
import { countSince, notify } from "@/modules/notifications/services/notifications";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings } from "@/modules/settings/services/settings";

/** Alerts are about newly listed jobs only, so an old posting never surfaces as "new" because you changed a preference. */
const WINDOW_HOURS = 36;
const DAILY_CAP = 3;
const SCAN = 500;
const SHOWN = 8;

export type AlertResult = { sent: false; reason: "off" | "no preferences" | "nothing new" | "daily cap" } | { sent: true; count: number; pushed: string[] };

/**
 * After a refresh: one notification for the new postings that clear your threshold, with a push to your
 * channels. Needs roles in your preferences (nothing to match without them), is capped per day, and never
 * announces a posting twice.
 */
export async function alertNewJobs(now = new Date(), channels?: readonly NotifyChannel[]): Promise<AlertResult> {
  const settings = await getSettings();
  if (!settings.mail.jobs) return { sent: false, reason: "off" };
  const ctx = await matchContext(now);
  if (ctx.prefs.roles.length === 0) return { sent: false, reason: "no preferences" };

  await connectDb();
  const since = new Date(now.getTime() - WINDOW_HOURS * 3_600_000);
  const rows = await JobPosting.find({ closedAt: null, dismissed: false, alerted: false, firstSeenAt: { $gte: since } }, { jd: 0 }).sort({ firstSeenAt: -1 }).limit(SCAN).lean();
  if (rows.length === 0) return { sent: false, reason: "nothing new" };

  const scored = rows.map((r) => ({ r, m: matchPosting({ title: r.title, company: r.company, location: r.location ?? "", remote: r.remote ?? null, postedAt: r.postedAt ?? null, tier: r.tier ?? "", terms: r.terms ?? [] }, ctx) }));
  const hits = scored.filter(({ m }) => !m.excluded && m.score >= ctx.prefs.minScore).toSorted((a, b) => b.m.score - a.m.score);
  const misses = scored.filter((s) => !hits.includes(s));
  // Those below your threshold will never alert: mark them so the next run has less to read.
  if (misses.length) await JobPosting.updateMany({ _id: { $in: misses.map((s) => s.r._id) } }, { $set: { alerted: true } });
  if (hits.length === 0) return { sent: false, reason: "nothing new" };

  // The cap is per calendar day in your time zone, which is exactly what the day-scoped dedupe key encodes.
  const day = todayIn(settings, now);
  const used = await countSince(`jobs:${day}:`, new Date(0));
  if (used >= DAILY_CAP) return { sent: false, reason: "daily cap" };

  const top = hits.slice(0, SHOWN);
  const title = `${plural(hits.length, "new job")} match${hits.length === 1 ? "es" : ""} you`;
  const body = top.slice(0, 3).map(({ r, m }) => `${r.title} at ${r.company} (${m.score}%)`).join(" · ");
  const items = top.map(({ r, m }) => ({ title: `${r.title} at ${r.company}`, path: `/jobs/discover/${String(r._id)}`, note: `${m.score}% match${r.location ? ` · ${r.location}` : ""}${r.remote ? " · remote" : ""}` }));
  const { text, html, spec } = renderMail({
    title,
    kicker: "New job matches",
    intro: `Newly listed roles that fit what you are looking for. Open one to see why it matches, upgrade your resume for it and apply.`,
    sections: [{ heading: "Best matches", tone: "info", items, more: { count: Math.max(0, hits.length - top.length), path: "/jobs", label: "jobs" } }],
    cta: { label: "Open Jobs", path: "/jobs" },
    ...(env().APP_URL ? { appUrl: env().APP_URL } : {}),
  });
  const res = await notify({ kind: "news", title, body, dedupeKey: `jobs:${day}:${used + 1}` }, { push: true, channels, pushContent: { title, body: text, html, spec } });
  if (res.created) await JobPosting.updateMany({ _id: { $in: hits.map((s) => s.r._id) } }, { $set: { alerted: true } });
  return { sent: res.created, count: hits.length, pushed: res.pushed } as AlertResult;
}
