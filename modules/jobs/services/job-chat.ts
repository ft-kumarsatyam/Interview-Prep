import { AllProvidersFailedError } from "@/core/llm/errors";
import type { AskEvent } from "@/modules/ai/domain/ask-events";
import { getAiFor } from "@/modules/ai/services/ai";
import { buildJobChatPrompt, chatQuestionSchema, turnSchema, type ChatTurn } from "@/modules/jobs/domain/job-chat";
import { getPostingDetail } from "@/modules/jobs/services/job-discovery";
import { getJob } from "@/modules/jobs/services/jobs";
import { getBaseResume } from "@/modules/resume/services/resume";
import type { OutreachTarget } from "@/modules/jobs/services/outreach";
import { z } from "zod";
import type { LlmProvider } from "@/core/llm/types";

const historySchema = z.array(turnSchema).max(40);

/**
 * Streams a coaching answer about one job, using the job description and your saved resume. Free models only: the
 * resume is personal data, so the paid provider is never used and nothing here logs the text. Events match the notes
 * chat (`sources` with none, `token`s, `done` or `error`), so the same screen renders both.
 */
export async function* chatAboutJob(target: OutreachTarget, questionRaw: unknown, historyRaw: unknown = [], deps: { llm?: LlmProvider | null } = {}): AsyncGenerator<AskEvent> {
  const q = chatQuestionSchema.safeParse(questionRaw);
  if (!q.success) {
    yield { type: "error", error: q.error.issues[0]?.message ?? "Ask a question" };
    return;
  }
  const history: ChatTurn[] = historySchema.safeParse(historyRaw).data ?? [];
  const job =
    target.kind === "posting"
      ? await getPostingDetail(target.id).then((p) => (p ? { title: p.title, company: p.company, jd: p.jd } : null))
      : await getJob(target.id).then((j) => (j ? { title: j.title, company: j.company, jd: j.jd } : null));
  if (!job) {
    yield { type: "error", error: "That job is no longer available" };
    return;
  }
  const base = await getBaseResume();
  yield { type: "sources", sources: [], mode: "keyword" };

  const llm = deps.llm === undefined ? await getAiFor("job-chat") : deps.llm;
  if (!llm?.streamText) {
    yield { type: "error", error: "No AI provider is configured. Add a Gemini or Groq key (see Setup).", unavailable: true };
    return;
  }
  let text = "";
  try {
    for await (const chunk of llm.streamText(buildJobChatPrompt({ ...job, resumeText: base?.text ?? null, question: q.data, history }))) {
      text += chunk;
      yield { type: "token", text: chunk };
    }
  } catch (err) {
    yield { type: "error", error: err instanceof AllProvidersFailedError ? err.message : "The answer was interrupted. Try again." };
    return;
  }
  yield { type: "done", result: { answer: text.trim(), cited: [], grounded: true, notFound: false, cached: false, ...(llm.lastProvider ? { provider: llm.lastProvider } : {}) } };
}
