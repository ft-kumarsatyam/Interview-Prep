import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { GradeWithAiButton, SelfGradeForm } from "@/modules/genai-test/components/grade-controls";
import { CRITERIA } from "@/modules/genai-test/domain/schemas";
import { VERDICT_LABEL } from "@/modules/genai-test/domain/scoring";
import type { ResultItem, ResultView } from "@/modules/genai-test/domain/views";

const letter = (i: number) => String.fromCharCode(65 + i);

function Item({ id, item, n }: { id: string; item: ResultItem; n: number }) {
  const waiting = item.kind === "written" && item.pct === null;
  return (
    <li className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono tabular">Q{n}</span>
        <ToneBadge tone="neutral">{item.kind === "mcq" ? "MCQ" : "Written"}</ToneBadge>
        <span>Level {item.level}</span>
        {item.review && <ToneBadge tone="info">Review</ToneBadge>}
        <span className="ml-auto font-mono tabular text-foreground">{item.pct === null ? "Ungraded" : `${item.pct}%`}</span>
      </div>
      <p className="text-sm font-medium">{item.q}</p>
      {item.kind === "mcq" ? (
        <>
          <ul className="space-y-1 text-sm">
            {item.options?.map((o, k) => (
              <li key={k} className={k === item.correct ? "font-medium text-success" : k === item.chosen ? "text-destructive" : "text-muted-foreground"}>
                {letter(k)}. {o} {k === item.correct ? "(correct)" : k === item.chosen ? "(your answer)" : ""}
              </li>
            ))}
          </ul>
          {item.chosen === null && <p className="text-xs text-muted-foreground">You left this unanswered.</p>}
          <p className="text-sm text-muted-foreground">{item.why}</p>
        </>
      ) : (
        <>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Your answer</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{item.text?.trim() ? item.text : "(blank)"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">A strong answer covers</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {item.points?.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {item.reference && item.reference !== item.points?.join("\n") && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">Model answer: {item.reference}</p>}
          </div>
          {item.scores && (
            <div className="text-sm">
              <p className="text-xs font-medium text-muted-foreground">{item.gradedBy === "ai" ? "AI grade" : "Your grade"}</p>
              <ul className="mt-1 space-y-1">
                {item.scores.map((s) => (
                  <li key={s.criterion}>
                    {CRITERIA.find((c) => c.id === s.criterion)?.label ?? s.criterion}: <span className="font-mono tabular">{s.score}/4</span>
                    {s.feedback ? ` · ${s.feedback}` : ""}
                  </li>
                ))}
              </ul>
              {item.summary && <p className="mt-2 text-muted-foreground">{item.summary}</p>}
            </div>
          )}
          {(waiting || item.scores) && item.text?.trim() && <SelfGradeForm id={id} qid={item.id} initial={item.gradedBy === "self" ? Object.fromEntries(item.scores?.map((s) => [s.criterion, s.score]) ?? []) : undefined} />}
        </>
      )}
    </li>
  );
}

export function ResultSummary({ view }: { view: ResultView }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-3xl font-semibold tabular">{view.pct === null ? "Waiting for grades" : `${view.pct}%`}</p>
          {view.verdict && <ToneBadge tone={view.verdict === "strong" ? "success" : view.verdict === "on-track" ? "primary" : "warning"}>{VERDICT_LABEL[view.verdict]}</ToneBadge>}
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">MCQ</dt>
            <dd className="font-mono tabular">{view.mcqTotal ? `${view.mcqCorrect}/${view.mcqTotal}` : "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Written</dt>
            <dd className="font-mono tabular">{view.writtenPct === null ? (view.pendingWritten ? `${view.pendingWritten} ungraded` : "-") : `${view.writtenPct}%`}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pass mark</dt>
            <dd className="font-mono tabular">{view.passMark}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Syllabus covered</dt>
            <dd className="font-mono tabular">{view.coverage.expected ? `${view.coverage.pct}%` : "-"}</dd>
          </div>
        </dl>
        {view.coverage.expected > 0 && <Progress value={view.coverage.pct} className="h-1" aria-label="Syllabus covered when you took this test" />}
        {view.verdict === "behind" && <p className="text-sm text-muted-foreground">Your answers may be fine, but you have ticked only {view.coverage.covered} of the {view.coverage.expected} topics due by this week. Tick topics on the roadmap as you study them so tests can follow your progress.</p>}
        {view.byLevel.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {view.byLevel.map((l) => (
              <li key={l.level} className="rounded-md border px-2 py-1">
                Level {l.level}: <span className="font-mono tabular">{l.pct}%</span>
              </li>
            ))}
          </ul>
        )}
        {view.pendingWritten > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">{view.pendingWritten} written answer(s) need a grade.</span>
            <GradeWithAiButton id={view.id} />
          </div>
        )}
      </div>
      <ol className="space-y-4">
        {view.items.map((item, i) => (
          <Item key={item.id} id={view.id} item={item} n={i + 1} />
        ))}
      </ol>
    </div>
  );
}
