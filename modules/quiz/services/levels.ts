import { connectDb } from "@/core/db";
import { PracticeAttempt } from "@/core/models/learning";
import { getSettings } from "@/modules/settings/services/settings";
import { countByLevel, recommendedLevel, summarizeLevels, type LevelRow } from "@/modules/quiz/domain/levels";
import { bank } from "@/modules/quiz/lib/bank";
import type { Difficulty } from "@/modules/quiz/lib/question";
import { loadGenerated } from "@/modules/quiz/services/generated";
import { resolvePracticeTarget } from "@/modules/quiz/services/practice";

export interface LevelProgress {
  rows: LevelRow[];
  recommended: Difficulty | null;
  /** The score that clears a level (the topic mastery mark for a topic, the pass mark otherwise). */
  passPct: number;
}

/** The easy / medium / hard ladder for a subtopic or topic: question counts, your runs and scores, and the next level to try. */
export async function getLevelProgress(ref: string): Promise<LevelProgress | null> {
  const target = resolvePracticeTarget(ref);
  if (!target || (target.scope !== "subtopic" && target.scope !== "topic")) return null;
  await connectDb();
  const [settings, attempts] = await Promise.all([getSettings(), PracticeAttempt.find({ ref, submittedAt: { $ne: null }, pct: { $ne: null } }, { level: 1, pct: 1, submittedAt: 1 }).lean()]);
  const ids = target.scope === "topic" ? target.subtopicIds : [target.ref];
  const pool = [...ids.flatMap((id) => bank().bySubtopic.get(id) ?? []), ...(await loadGenerated(ids))];
  const passPct = target.scope === "topic" ? settings.topicMasteryPct : settings.quizPassPct;
  const rows = summarizeLevels(
    attempts.map((a) => ({ level: (a.level as Difficulty | null) ?? null, pct: a.pct ?? 0, at: a.submittedAt ?? new Date(0) })),
    countByLevel(pool),
    passPct,
  );
  return { rows, recommended: recommendedLevel(rows), passPct };
}
