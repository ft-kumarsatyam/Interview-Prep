import { isValidObjectId, type Types } from "mongoose";
import { connectDb } from "@/core/db";
import { toLocalDate } from "@/core/domain/dates";
import { env } from "@/core/env";
import { AllProvidersFailedError } from "@/core/llm/errors";
import type { LlmProvider } from "@/core/llm/types";
import { ChatMessage, ChatThread } from "@/core/models/chat";
import { chatRequestSchema, type ChatEvent, type ChatToolUse } from "@/modules/chat/domain/chat-events";
import { buildAnswerPrompt, buildPlannerPrompt, type ChatTurn } from "@/modules/chat/domain/chat-prompt";
import { fallbackPlan, normalizePlan, plannerSchema, TOOLS, type ToolId, type ToolPlan } from "@/modules/chat/domain/chat-tools";
import { cleanTitle, threadTitle } from "@/modules/chat/domain/thread-title";
import { runTools } from "@/modules/chat/services/chat-tools";
import { getAiFor } from "@/modules/ai/services/ai";

export const MAX_THREADS = 200;
/** Turns loaded as context for a reply (older ones are summarised by the prompt builder). */
const CONTEXT_MESSAGES = 40;

export interface ThreadSummary {
  id: string;
  title: string;
  archived: boolean;
  messageCount: number;
  lastMessageAt: string;
}

export interface MessageDto {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ChatToolUse[];
  provider: string | null;
  failed: boolean;
  createdAt: string;
}

const toolUses = (names: readonly string[]): ChatToolUse[] => names.filter((n): n is ToolId => n in TOOLS).map((name) => ({ name, label: TOOLS[name].label }));

type ThreadRow = { _id: Types.ObjectId; title: string; archived?: boolean | null; messageCount?: number | null; lastMessageAt?: Date | null };
const toSummary = (t: ThreadRow): ThreadSummary => ({ id: String(t._id), title: t.title, archived: !!t.archived, messageCount: t.messageCount ?? 0, lastMessageAt: (t.lastMessageAt ?? new Date(0)).toISOString() });

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Your conversations, newest first. `q` matches titles; archived ones only when asked for. */
export async function listThreads(opts: { q?: string; archived?: boolean } = {}): Promise<ThreadSummary[]> {
  await connectDb();
  const filter: Record<string, unknown> = { archived: !!opts.archived };
  const q = opts.q?.trim().slice(0, 80);
  if (q) filter.title = { $regex: escapeRegex(q), $options: "i" };
  const rows = await ChatThread.find(filter).sort({ lastMessageAt: -1 }).limit(MAX_THREADS).lean<ThreadRow[]>();
  return rows.map(toSummary);
}

export async function getThread(id: string): Promise<{ thread: ThreadSummary; messages: MessageDto[] } | null> {
  if (!isValidObjectId(id)) return null;
  await connectDb();
  const thread = await ChatThread.findById(id).lean<ThreadRow>();
  if (!thread) return null;
  const rows = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).limit(500).lean();
  return {
    thread: toSummary(thread),
    messages: rows.map((m) => ({ id: String(m._id), role: m.role as MessageDto["role"], text: m.text, tools: toolUses(m.tools ?? []), provider: m.provider ?? null, failed: !!m.failed, createdAt: (m.createdAt as Date).toISOString() })),
  };
}

export async function renameThread(id: string, title: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDb();
  return (await ChatThread.updateOne({ _id: id }, { $set: { title: cleanTitle(title) } })).matchedCount > 0;
}

export async function setThreadArchived(id: string, archived: boolean): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDb();
  return (await ChatThread.updateOne({ _id: id }, { $set: { archived } })).matchedCount > 0;
}

export async function deleteThread(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDb();
  const res = await ChatThread.deleteOne({ _id: id });
  if (res.deletedCount === 0) return false;
  await ChatMessage.deleteMany({ threadId: id });
  return true;
}

async function appendMessage(threadId: Types.ObjectId, msg: { role: "user" | "assistant"; text: string; tools?: ToolId[]; provider?: string | null; failed?: boolean }): Promise<string> {
  const doc = await ChatMessage.create({ threadId, role: msg.role, text: msg.text.slice(0, 12_000), tools: msg.tools ?? [], provider: msg.provider ?? null, failed: !!msg.failed });
  await ChatThread.updateOne({ _id: threadId }, { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date() } });
  return String(doc._id);
}

async function planTools(llm: LlmProvider, question: string, history: readonly ChatTurn[], page: string | undefined): Promise<ToolPlan> {
  try {
    const out = await llm.generateJson(buildPlannerPrompt({ question, history, page }), plannerSchema);
    return normalizePlan(out.tools, question);
  } catch (err) {
    // No provider left at all: the answer call would fail the same way, so let the caller report it once.
    if (err instanceof AllProvidersFailedError) throw err;
    return fallbackPlan(question);
  }
}

/**
 * One assistant turn: saves your message (creating the thread on the first one), picks the data tools the
 * question needs, runs them, then streams an answer grounded in that data and saves it. Free providers only
 * (the `chat` feature is `paid: "never"`). With no provider the thread and your message are still saved.
 */
export async function* runTurn(raw: unknown, deps: { llm?: LlmProvider | null; now?: Date } = {}): AsyncGenerator<ChatEvent> {
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) {
    yield { type: "error", error: parsed.error.issues[0]?.message ?? "Type a message" };
    return;
  }
  const { message, page, context } = parsed.data;
  const groundedQuestion = context
    ? `${message}\n\n<selected-text source="${context.sourceTitle}" href="${context.sourceHref}">\n${context.selection}\n</selected-text>`
    : message;
  await connectDb();

  let thread: ThreadRow | null = parsed.data.threadId ? await ChatThread.findById(parsed.data.threadId).lean<ThreadRow>() : null;
  if (parsed.data.threadId && !thread) {
    yield { type: "error", error: "That conversation no longer exists." };
    return;
  }
  const created = !thread;
  if (!thread) {
    const doc = await ChatThread.create({ title: threadTitle(message) });
    thread = { _id: doc._id as Types.ObjectId, title: doc.title };
  }
  yield { type: "thread", threadId: String(thread._id), title: thread.title, created };

  const prior = created ? [] : await ChatMessage.find({ threadId: thread._id, failed: false }, { role: 1, text: 1 }).sort({ createdAt: -1 }).limit(CONTEXT_MESSAGES).lean();
  const history: ChatTurn[] = prior.reverse().map((m) => ({ role: m.role as ChatTurn["role"], text: m.text }));
  await appendMessage(thread._id, { role: "user", text: context ? `${message}\n\nSelected from: ${context.sourceTitle}\n${context.selection}` : message });

  const llm = deps.llm === undefined ? await getAiFor("chat") : deps.llm;
  if (!llm?.streamText) {
    yield { type: "error", error: "No AI provider is configured. Add a free key (NVIDIA, OpenRouter, Gemini or Groq) to your environment to chat. Your message was saved.", unavailable: true };
    return;
  }

  let plan: ToolPlan;
  try {
    plan = await planTools(llm, groundedQuestion, history, page);
  } catch (err) {
    yield { type: "error", error: err instanceof AllProvidersFailedError ? err.message : "The assistant is unavailable right now. Try again." };
    return;
  }
  yield { type: "tools", tools: toolUses(plan.map((t) => t.name)) };

  const results = await runTools(plan);
  const today = toLocalDate(deps.now ?? new Date(), env().APP_TIMEZONE);
  let text = "";
  try {
    for await (const chunk of llm.streamText(buildAnswerPrompt({ question: groundedQuestion, history, results, today, page }))) {
      text += chunk;
      yield { type: "token", text: chunk };
    }
  } catch (err) {
    if (text.trim()) await appendMessage(thread._id, { role: "assistant", text, tools: plan.map((t) => t.name), provider: llm.lastProvider ?? null, failed: true });
    yield { type: "error", error: err instanceof AllProvidersFailedError ? err.message : "The answer was interrupted. Try again." };
    return;
  }
  const messageId = await appendMessage(thread._id, { role: "assistant", text: text.trim() || "(no answer)", tools: plan.map((t) => t.name), provider: llm.lastProvider ?? null });
  yield { type: "done", messageId, ...(llm.lastProvider ? { provider: llm.lastProvider } : {}) };
}
