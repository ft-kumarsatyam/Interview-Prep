import { MessagesSquare } from "lucide-react";
import { AskNotes } from "@/modules/ai/components/ask-notes";

type Target = { kind: "posting"; id: string } | { kind: "job"; id: string };

/** Chat about this job with Gemini (or Groq): it sees the job description and your resume, and keeps the conversation. */
export function JobChatPanel({ target }: { target: Target }) {
  return (
    <section aria-label="Chat about this job" className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <MessagesSquare className="size-4" aria-hidden /> Chat about this job
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Try: &ldquo;What should I stress for this role?&rdquo;, &ldquo;What will they ask me?&rdquo; or &ldquo;Rewrite my summary for this JD&rdquo;. It uses only facts from your resume.</p>
      </div>
      <AskNotes endpoint="/api/ai/job-chat" extraBody={{ target }} withHistory idPrefix={`job-${target.id}`} placeholder="Ask about this job…" />
    </section>
  );
}
