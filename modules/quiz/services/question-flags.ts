import { connectDb } from "@/core/db";
import { QuestionFlag } from "@/core/models/question-flags";
import type { FlagReason } from "@/modules/quiz/lib/flag-reasons";

/** Reports a question. Safe to repeat: the latest reason wins. */
export async function flagQuestion(qid: string, reason: FlagReason, note = ""): Promise<void> {
  await connectDb();
  await QuestionFlag.updateOne({ qid }, { $set: { reason, note: note.slice(0, 300) } }, { upsert: true });
}

/** Ids of the questions you reported; they are never drawn for your quizzes again. */
export async function flaggedQuestionIds(): Promise<Set<string>> {
  await connectDb();
  const rows = await QuestionFlag.find({}, { qid: 1 }).lean();
  return new Set(rows.map((r) => r.qid));
}
