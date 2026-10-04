"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Loader2, MapPin, PanelLeft, SendHorizontal, Square, X } from "lucide-react";
import { toast } from "sonner";
import { deleteThreadAction, renameThreadAction } from "@/app/(app)/chat/actions";
import { Button } from "@/components/ui/button";
import { StudyActionLink } from "@/components/shared/study-action-link";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatMessage, type ChatMessageView } from "@/modules/chat/components/chat-message";
import { ThreadList, type ThreadItem } from "@/modules/chat/components/thread-list";
import { chatEventSchema, MAX_MESSAGE } from "@/modules/chat/domain/chat-events";

const SUGGESTIONS = [
  "What should I focus on today?",
  "How is my streak going?",
  "Which topics am I weakest in?",
  "Which job applications need a follow-up?",
  "How does the daily quiz unlock?",
];

export interface ChatWorkspaceProps {
  threads: ThreadItem[];
  thread: { id: string; title: string } | null;
  messages: ChatMessageView[];
  /** "Ask about this page": the route the question is about. */
  page: string | null;
  aiAvailable: boolean;
}

/**
 * The assistant: thread list (a sheet on mobile) and the conversation. Replies stream from /api/ai/chat as
 * newline-delimited JSON and render as plain text. A new thread updates the URL in place, without a reload.
 */
export function ChatWorkspace({ threads: initialThreads, thread, messages: initialMessages, page: initialPage, aiAvailable }: ChatWorkspaceProps) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [threadId, setThreadId] = useState(thread?.id ?? null);
  const [title, setTitle] = useState(thread?.title ?? "New chat");
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [input, setInput] = useState(initialPage ? "What can I do on this page, and what should I focus on here?" : "");
  const [page, setPage] = useState(initialPage);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => () => abort.current?.abort(), []);

  const patchLast = (patch: Partial<ChatMessageView>) => setMessages((m) => (m.length ? [...m.slice(0, -1), { ...m.at(-1)!, ...patch }] : m));

  async function send(text: string) {
    const message = text.trim();
    if (!message || running) return;
    setError(null);
    setInput("");
    setRunning(true);
    const controller = new AbortController();
    abort.current = controller;
    const now = Date.now();
    setMessages((m) => [...m, { id: `u-${now}`, role: "user", text: message, tools: [] }, { id: `a-${now}`, role: "assistant", text: "", tools: [], pending: true }]);
    let reply = "";
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, ...(threadId ? { threadId } : {}), ...(page ? { page } : {}) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Something went wrong. Try again.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const parsed = chatEventSchema.safeParse(JSON.parse(line));
          if (!parsed.success) continue;
          const ev = parsed.data;
          if (ev.type === "thread") {
            setThreadId(ev.threadId);
            setTitle(ev.title);
            if (ev.created) {
              setThreads((t) => [{ id: ev.threadId, title: ev.title, lastMessageAt: new Date().toISOString() }, ...t]);
              window.history.replaceState(null, "", `/chat?t=${ev.threadId}`);
            }
          } else if (ev.type === "tools") patchLast({ tools: ev.tools });
          else if (ev.type === "token") {
            reply += ev.text;
            patchLast({ text: reply });
          } else if (ev.type === "done") {
            patchLast({ id: ev.messageId, pending: false, provider: ev.provider ?? null });
            setPage(null);
          } else {
            setError(ev.error);
            if (reply) patchLast({ pending: false, failed: true });
            else setMessages((m) => m.slice(0, -1));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        if (reply) patchLast({ pending: false, failed: true });
        else setMessages((m) => m.slice(0, -1));
      } else {
        setError(err instanceof Error ? err.message : "The connection dropped. Try again.");
        if (reply) patchLast({ pending: false, failed: true });
        else setMessages((m) => m.slice(0, -1));
      }
    } finally {
      setRunning(false);
      abort.current = null;
      inputRef.current?.focus();
    }
  }

  async function rename(id: string, name: string) {
    const res = await renameThreadAction({ id, title: name });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 60);
    setThreads((t) => t.map((x) => (x.id === id ? { ...x, title: clean } : x)));
    if (id === threadId) setTitle(clean);
    return true;
  }

  async function remove(id: string) {
    const res = await deleteThreadAction(id);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setThreads((t) => t.filter((x) => x.id !== id));
    toast.success("Conversation deleted");
    if (id === threadId) router.push("/chat");
    return true;
  }

  const list = <ThreadList threads={threads} activeId={threadId} onRename={rename} onDelete={remove} onNavigate={() => setSheetOpen(false)} />;

  return (
    <div className="grid h-[calc(100dvh-13rem)] min-h-[28rem] gap-4 lg:h-[calc(100dvh-9rem)] lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 rounded-xl border bg-card p-3 lg:block">{list}</aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Conversations</SheetTitle>
            <SheetDescription className="sr-only">Open, rename or delete a conversation</SheetDescription>
          </SheetHeader>
          <div className="mt-3 min-h-0 flex-1">{list}</div>
        </SheetContent>
      </Sheet>

      <section className="flex min-h-0 flex-col rounded-xl border bg-card" aria-label="Conversation">
        <header className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setSheetOpen(true)} aria-label="Show conversations">
            <PanelLeft aria-hidden />
          </Button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="size-6" aria-hidden />
              </span>
              <div>
                <p className="font-medium">Ask anything about your prep</p>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">I can read your plan, streak, quizzes, notes, courses, jobs and mocks (never your resume), and explain how PrepOS works.</p>
              </div>
              {!aiAvailable && (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">No AI provider is configured yet. Add a free key (see Settings) to get answers.</p>
              )}
              <ul className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => send(s)} disabled={running} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-2">
                <StudyActionLink href="/quiz/mistakes" title="Fix your mistakes" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">Review mistakes</StudyActionLink>
                <StudyActionLink href="/targets" title="Target-company readiness" className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted">Open readiness</StudyActionLink>
              </div>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
            </ol>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3 sm:p-4">
          {error && (
            <p role="alert" className="mb-2 flex items-start gap-1.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          {page && (
            <p className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">About {page}</span>
              <button type="button" onClick={() => setPage(null)} aria-label="Stop asking about this page" className="rounded-full hover:text-foreground">
                <X className="size-3" aria-hidden />
              </button>
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={MAX_MESSAGE}
              placeholder="Ask about your plan, progress, a concept or the app…"
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
            />
            {running ? (
              <Button type="button" variant="outline" className="size-11 shrink-0" onClick={() => abort.current?.abort()} aria-label="Stop">
                <Square aria-hidden />
              </Button>
            ) : (
              <Button type="submit" className="size-11 shrink-0" disabled={!input.trim()} aria-label="Send">
                {running ? <Loader2 className="animate-spin" aria-hidden /> : <SendHorizontal aria-hidden />}
              </Button>
            )}
          </form>
          <p className="mt-1.5 hidden text-[11px] text-muted-foreground sm:block">Enter to send, Shift+Enter for a new line. Answers use free AI providers only.</p>
        </div>
      </section>
    </div>
  );
}
