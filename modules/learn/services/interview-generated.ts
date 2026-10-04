import { interviewQuestions, interviewTracks } from "@/core/content";
import { connectDb } from "@/core/db";
import { GeneratedInterviewDoc } from "@/core/models/webdev";
import { takeToken } from "@/core/services/rate-limit";
import { runAi } from "@/modules/ai/services/ai";
import { generatedInterviewId, generatedInterviewSetSchema, interviewGenerationPrompt, selectNewInterview } from "@/modules/learn/domain/interview-generated";
import type { InterviewLevel, TrackedQuestion } from "@/modules/learn/domain/web-interview";

export const INTERVIEW_GENERATE_LIMIT = { max: 10, windowSec: 3600 };
export const INTERVIEW_BATCH = 3;

/** Model-written questions, in the same shape as the hand-written bank, optionally for one track. */
export async function loadGeneratedInterview(track?: string): Promise<TrackedQuestion[]> {
  await connectDb();
  const rows = await GeneratedInterviewDoc.find(track ? { track } : {}).sort({ createdAt: 1 }).lean();
  return rows.map((r) => ({ id: r.qid, track: r.track, level: r.level as InterviewLevel, q: r.q, answer: r.answer, followUps: r.followUps ?? [], mistakes: r.mistakes ?? [] }));
}

export async function isGeneratedInterviewQuestion(qid: string): Promise<boolean> {
  await connectDb();
  return Boolean(await GeneratedInterviewDoc.exists({ qid }));
}

export type InterviewGenerateResult = { ok: true; added: number; skippedDuplicates: number } | { ok: false; error: string };

/** Asks the model for new questions on a track at a level, keeps only the well-formed ones that are new, and stores them. */
export async function generateInterviewQuestions(trackId: string, level: InterviewLevel, count = INTERVIEW_BATCH): Promise<InterviewGenerateResult> {
  const track = interviewTracks.find((t) => t.id === trackId);
  if (!track) return { ok: false, error: "Pick a track to add questions to" };
  const limit = await takeToken("interview-generate", INTERVIEW_GENERATE_LIMIT);
  if (!limit.allowed) return { ok: false, error: "You've generated a lot recently. Try again in a little while" };

  const existing = [...interviewQuestions.filter((q) => q.track === trackId).map((q) => q.q), ...(await loadGeneratedInterview(trackId)).map((q) => q.q)];
  const res = await runAi("generate-questions", {}, (llm) => llm.generateJson(interviewGenerationPrompt({ track, level, count, avoid: existing }), generatedInterviewSetSchema(count)));
  if (!res.ok) return { ok: false, error: res.error };

  const picked = selectNewInterview(res.data.questions, existing, count);
  if (picked.accepted.length === 0) return { ok: false, error: "The model's questions were repeats or malformed. Try again" };
  await connectDb();
  await GeneratedInterviewDoc.insertMany(picked.accepted.map((q) => ({ qid: generatedInterviewId(trackId, q.q), track: trackId, level, q: q.q, answer: q.answer, followUps: q.followUps, mistakes: q.mistakes, provider: res.provider ?? null })), { ordered: false }).catch((err: { code?: number }) => {
    if (err.code !== 11000) throw err; // a concurrent click wrote the same question: fine
  });
  return { ok: true, added: picked.accepted.length, skippedDuplicates: picked.duplicates };
}
