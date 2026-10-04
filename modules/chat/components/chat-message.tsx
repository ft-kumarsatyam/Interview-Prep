import { AlertTriangle, Bot, Database, User } from "lucide-react";
import type { ChatToolUse } from "@/modules/chat/domain/chat-events";
import { cn } from "@/core/utils";

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ChatToolUse[];
  provider?: string | null;
  failed?: boolean;
  /** Still streaming. */
  pending?: boolean;
}

/** One turn. Text only (model output is untrusted and never rendered as HTML); the data views it used appear as chips. */
export function ChatMessage({ message }: { message: ChatMessageView }) {
  const mine = message.role === "user";
  return (
    <li className={cn("flex gap-3", mine && "flex-row-reverse")}>
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", mine ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")} aria-hidden>
        {mine ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div className={cn("min-w-0 max-w-[85%] space-y-2", mine && "items-end text-right")}>
        <span className="sr-only">{mine ? "You said" : "Assistant said"}</span>
        {!mine && message.tools.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Data used">
            {message.tools.map((t) => (
              <li key={t.name} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <Database className="size-3" aria-hidden /> {t.label}
              </li>
            ))}
          </ul>
        )}
        <div className={cn("inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed", mine ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm border bg-card")}>
          {message.text ? (
            <p className="break-words whitespace-pre-wrap">{message.text}</p>
          ) : message.pending ? (
            <p className="text-muted-foreground">{message.tools.length ? "Writing…" : "Looking at your data…"}</p>
          ) : null}
        </div>
        {!mine && (message.failed || (message.provider && !message.pending)) && (
          <p className={cn("flex items-center gap-1 text-[11px]", message.failed ? "text-warning" : "text-muted-foreground")}>
            {message.failed ? (
              <>
                <AlertTriangle className="size-3" aria-hidden /> This answer was cut off.
              </>
            ) : (
              `via ${message.provider}`
            )}
          </p>
        )}
      </div>
    </li>
  );
}
