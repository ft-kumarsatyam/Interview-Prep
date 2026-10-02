import { connectDb } from "@/lib/db";
import type { DayKind } from "@/lib/domain/planner";
import { isQuizUnlocked } from "@/lib/domain/streak";
import { DailyPlan, DayLog } from "@/lib/models/day";
import { todayIn } from "./plan";
import { countDueReviews } from "./problems";
import { unreadArticleCount } from "./news";
import { getSettings } from "./settings";

export interface NavBadges {
  "/review"?: number;
  "/news"?: number;
  /** Dot: today's quiz is open and not passed yet. */
  "/quiz"?: true;
}

/** Read-only counts for the sidebar and tab bar; never creates today's plan. */
export async function getNavBadges(now = new Date()): Promise<NavBadges> {
  await connectDb();
  const s = await getSettings();
  const today = todayIn(s, now);
  const [reviews, unread, plan, log] = await Promise.all([
    countDueReviews(today),
    unreadArticleCount(),
    DailyPlan.findOne({ date: today }, { kind: 1, dsaTarget: 1, theoryTarget: 1 }).lean(),
    DayLog.findOne({ date: today }, { dsaSolved: 1, theoryDone: 1, quizPassed: 1 }).lean(),
  ]);
  const quizOpen =
    !!plan &&
    !log?.quizPassed &&
    isQuizUnlocked({
      kind: plan.kind as DayKind,
      dsaTarget: plan.dsaTarget,
      theoryTarget: plan.theoryTarget,
      dsaSolved: log?.dsaSolved ?? 0,
      theoryDone: log?.theoryDone ?? 0,
    });
  return {
    ...(reviews > 0 ? { "/review": reviews } : {}),
    ...(unread > 0 ? { "/news": unread } : {}),
    ...(quizOpen ? { "/quiz": true as const } : {}),
  };
}
