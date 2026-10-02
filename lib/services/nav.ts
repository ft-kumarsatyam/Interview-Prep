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

/** Today's targets for the sidebar mini-card. Null until the dashboard has created today's plan. */
export interface NavToday {
  kind: DayKind;
  dsaSolved: number;
  dsaTarget: number;
  theoryDone: number;
  theoryTarget: number;
  quizPassed: boolean;
  quizUnlocked: boolean;
  complete: boolean;
}

export interface NavState {
  badges: NavBadges;
  today: NavToday | null;
}

/** Read-only state for the sidebar and tab bar; never creates today's plan. */
export async function getNavState(now = new Date()): Promise<NavState> {
  await connectDb();
  const s = await getSettings();
  const today = todayIn(s, now);
  const [reviews, unread, plan, log] = await Promise.all([
    countDueReviews(today),
    unreadArticleCount(),
    DailyPlan.findOne({ date: today }, { kind: 1, dsaTarget: 1, theoryTarget: 1 }).lean(),
    DayLog.findOne({ date: today }, { dsaSolved: 1, theoryDone: 1, quizPassed: 1, complete: 1 }).lean(),
  ]);
  const progress = plan
    ? {
        kind: plan.kind as DayKind,
        dsaTarget: plan.dsaTarget,
        theoryTarget: plan.theoryTarget,
        dsaSolved: log?.dsaSolved ?? 0,
        theoryDone: log?.theoryDone ?? 0,
      }
    : null;
  const quizUnlocked = !!progress && isQuizUnlocked(progress);
  const quizPassed = !!log?.quizPassed;
  return {
    badges: {
      ...(reviews > 0 ? { "/review": reviews } : {}),
      ...(unread > 0 ? { "/news": unread } : {}),
      ...(quizUnlocked && !quizPassed ? { "/quiz": true as const } : {}),
    },
    today: progress ? { ...progress, quizPassed, quizUnlocked, complete: !!log?.complete } : null,
  };
}

export async function getNavBadges(now = new Date()): Promise<NavBadges> {
  return (await getNavState(now)).badges;
}
