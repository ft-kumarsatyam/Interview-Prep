"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AlertTriangle, FileText, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askEventSchema, type AskDone, type AskSource } from "@/modules/ai/domain/ask-events";

type State =
  | { phase: "idle" }
  | { phase: "running"; sources: AskSource[]; text: string }
  | { phase: "done"; sources: AskSource[]; text: string; result: AskDone }
  | { phase: "error"; sources: AskSource[]; text: string; error: string; unavailable?: boolean };

export interface AskNotesProps {
  /** The streaming endpoint (default: your notes and saved articles). */
  endpoint?: string;
  /** Extra fields sent with the question, e.g. which job the chat is about. */
  extraBody?: Record<string, unknown>;
  placeholder?: string;
  /** Send the earlier turns back so the answer can follow the conversation. */
  withHistory?: boolean;
  /** Distinguishes two chats on one page. */
  idPrefix?: string;
}

/** Reads the newline-delimited JSON stream from the endpoint and renders tokens as they arrive. Text only: never HTML. */
export function AskNotes({ endpoint = "/api/ai/ask", extraBody, placeholder = "Ask anything from your notes and saved articles, e.g. how does TCP guarantee delivery?", withHistory = false, idPrefix = "ask" }: AskNotesProps) {
  const history = useRef<Array<{ role: "you" | "assistant"; text: string }>>([]);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    let sources: AskSource[] = [];
    let text = "";
    setState({ phase: "running", sources, text });
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, ...extraBody, ...(withHistory ? { history: history.current.slice(-6) } : {}) }), signal: controller.signal });
      if (!res.ok || !res.body) {
        const msg = (await res.json().catch(() => null)) as { error?: string } | null;
        setState({ phase: "error", sources, text, error: msg?.error ?? "Something went wrong. Try again." });
        return;
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
          const parsed = askEventSchema.safeParse(JSON.parse(line));
          if (!parsed.success) continue;
          const ev = parsed.data;
          if (ev.type === "sources") sources = ev.sources;
          else if (ev.type === "token") text += ev.text;
          else if (ev.type === "done") {
            if (withHistory) history.current = [...history.current, { role: "you" as const, text: question }, { role: "assistant" as const, text: ev.result.answer }].slice(-12);
            setState({ phase: "done", sources, text: ev.result.answer, result: ev.result });
            return;
          } else {
            setState({ phase: "error", sources, text, error: ev.error, unavailable: ev.unavailable });
            return;
          }
          setState({ phase: "running", sources, text });
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setState({ phase: "error", sources, text, error: "The connection dropped. Try again." });
    }
  }

  const running = state.phase === "running";
  const sources = state.phase === "idle" ? [] : state.sources;
  const text = state.phase === "idle" ? "" : state.text;

  return (
    <div className="space-y-4">
      <form onSubmit={ask} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${idPrefix}-q`} className="sr-only">
          Your question
        </label>
        <input
          id={`${idPrefix}-q`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
        <Button type="submit" disabled={running || question.trim().length < 3} className="h-11">
          {running ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          Ask
        </Button>
      </form>

      {state.phase !== "idle" && (
        <div className="rounded-xl border bg-card p-4 sm:p-5" aria-live="polite">
          {text ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p> : running ? <p className="text-sm text-muted-foreground">Searching your notes…</p> : null}
          {state.phase === "done" && !state.result.grounded && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="size-3.5" aria-hidden /> This answer cites a source that was not found. Check the passages below.
            </p>
          )}
          {state.phase === "done" && state.result.cached && <p className="mt-3 text-xs text-muted-foreground">From your earlier answer, no AI call.</p>}
          {state.phase === "error" && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="size-4" aria-hidden /> {state.error}
            </p>
          )}
        </div>
      )}

      {sources.length > 0 && (
        <section aria-label="Sources">
          <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Sources</h2>
          <ol className="space-y-1.5">
            {sources.map((s) => {
              const cited = state.phase === "done" && state.result.cited.some((c) => c.n === s.n);
              return (
                <li key={s.n} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 inline-grid size-5 shrink-0 place-items-center rounded font-mono text-[11px] ${cited ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{s.n}</span>
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {s.href ? (
                    <Link href={s.href} className="min-w-0 break-words underline-offset-2 hover:underline">
                      {s.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 break-words">{s.title}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
