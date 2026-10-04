"use client";

import ReactMarkdown from "react-markdown";
import { ExternalLink, Lightbulb } from "lucide-react";
import { MermaidDiagram } from "@/modules/design/components/mermaid-diagram";
import { readingMinutes, type SubtopicNote } from "@/modules/learn/domain/notes";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The authored lesson for one subtopic: explanation, key points, diagram and sources. */
export function LessonCard({ title, note }: { title: string; note: SubtopicNote }) {
  return (
    <article className="min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-4" aria-label={`Lesson: ${title}`}>
      <p className="text-xs text-muted-foreground">{readingMinutes(note.body)} min read</p>

      <div className="prose-notes text-sm leading-relaxed">
        <ReactMarkdown>{note.body}</ReactMarkdown>
      </div>

      {note.diagram && <MermaidDiagram code={note.diagram} label={`${title} diagram`} />}

      <section aria-label="Key points" className="rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
        <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Lightbulb className="size-3.5" aria-hidden /> Remember for the interview
        </h4>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {note.keyPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      {note.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sources</span>
          {note.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              title={`${s.title} (${hostname(s.url)}${s.license ? `, ${s.license}` : ""})`}
            >
              <span className="truncate">{s.title}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
