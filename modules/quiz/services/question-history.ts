import { connectDb } from "@/core/db";
import { buildHistory, type AnswerEvent, type QuestionHistory } from "@/modules/quiz/domain/question-history";
import { isAnswerCorrect } from "@/modules/quiz/domain/quiz";
import { Quiz } from "@/core/models/day";
import { PracticeAttempt } from "@/core/models/learning";
import type { QuestionType } from "@/modules/quiz/lib/question";

/** How far back history reaches. Plenty for one person; keeps the read small. */
const PRACTICE_LIMIT = 400;
const QUIZ_LIMIT = 120;

/** The question as it was asked, so a mistakes run can re-ask it even if the bank changed or an LLM wrote it. */
export interface AskedQuestion {
  id: string;
  prompt: string;
  code?: string;
  options: string[];
  answerIndex: number;
  type?: QuestionType;
  answerIndices?: number[];
  explanation: string;
  /** Subtopic, pattern, problem slug or `case:…` ref the question belongs to. */
  ref: string;
}

export interface LoadedHistory {
  history: QuestionHistory;
  asked: Map<string, AskedQuestion>;
}

interface StoredQuestion {
  id: string;
  prompt: string;
  code?: string | null;
  options: string[];
  answerIndex: number;
  type?: string | null;
  answerIndices?: number[] | null;
  explanation?: string | null;
}

function snapshot(q: StoredQuestion, ref: string): AskedQuestion {
  const type = q.type === "multi" || q.type === "truefalse" ? q.type : undefined;
  return {
    id: q.id,
    prompt: q.prompt,
    ...(q.code ? { code: q.code } : {}),
    options: [...q.options],
    answerIndex: q.answerIndex,
    ...(type ? { type } : {}),
    ...(type === "multi" && q.answerIndices?.length ? { answerIndices: [...q.answerIndices] } : {}),
    explanation: q.explanation ?? "",
    ref,
  };
}

/** Every answered question from finished practice runs and daily/weekly quiz attempts. */
export async function loadQuestionHistory(): Promise<LoadedHistory> {
  await connectDb();
  const [runs, quizzes] = await Promise.all([
    PracticeAttempt.find({ submittedAt: { $ne: null } }, { questions: 1, answers: 1, submittedAt: 1 }).sort({ submittedAt: -1 }).limit(PRACTICE_LIMIT).lean(),
    Quiz.find({ "attempts.0": { $exists: true } }, { questions: 1, attempts: 1 }).sort({ date: -1 }).limit(QUIZ_LIMIT).lean(),
  ]);
  const events: AnswerEvent[] = [];
  const asked = new Map<string, AskedQuestion>();
  const askedAt = new Map<string, number>();
  const remember = (q: AskedQuestion, at: number) => {
    if ((askedAt.get(q.id) ?? -1) > at) return;
    asked.set(q.id, q);
    askedAt.set(q.id, at);
  };

  for (const run of runs) {
    const at = (run.submittedAt as Date | null)?.getTime() ?? 0;
    (run.questions ?? []).forEach((q, i) => {
      events.push({ id: q.id, correct: isAnswerCorrect(q, run.answers?.[i]), at });
      remember(snapshot(q, q.ref), at);
    });
  }
  for (const quiz of quizzes) {
    for (const attempt of quiz.attempts ?? []) {
      const at = (attempt.submittedAt as Date | null | undefined)?.getTime() ?? 0;
      (quiz.questions ?? []).forEach((q, i) => {
        events.push({ id: q.id, correct: isAnswerCorrect(q, attempt.answers?.[i]), at });
        remember(snapshot(q, q.source?.ref ?? ""), at);
      });
    }
  }
  return { history: buildHistory(events), asked };
}
