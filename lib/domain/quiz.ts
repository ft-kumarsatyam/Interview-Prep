export interface QuizScore {
  correct: number;
  total: number;
  pct: number;
}

/** Unanswered questions (null) count as wrong. */
export function scoreQuiz(answerKey: number[], answers: Array<number | null>): QuizScore {
  const total = answerKey.length;
  const correct = answerKey.reduce((n, key, i) => n + (answers[i] === key ? 1 : 0), 0);
  return { correct, total, pct: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

export function isPassing(score: QuizScore, passPct: number): boolean {
  return score.total > 0 && score.pct >= passPct;
}
