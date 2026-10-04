import { highlightSegments } from "@/modules/jobs/domain/job-match";

/** The job description as text, with the skills your resume has in green and the ones it lacks in amber. Plain text nodes only. */
export function JdView({ text, have, lack }: { text: string; have: ReadonlySet<string>; lack: ReadonlySet<string> }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {highlightSegments(p, have, lack).map((s, j) =>
            s.mark ? (
              <mark key={j} className={s.mark === "have" ? "rounded bg-success/15 px-0.5 text-foreground" : "rounded bg-warning/20 px-0.5 text-foreground"} title={s.mark === "have" ? "On your resume" : "Not on your resume"}>
                {s.text}
              </mark>
            ) : (
              <span key={j}>{s.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
