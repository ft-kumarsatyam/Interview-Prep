import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Timer, XCircle } from "lucide-react";
import { DeleteMockButton, GradePanel, SelfReviewForm } from "@/modules/mock/components/grade-panel";
import { scoreTone } from "@/modules/mock/components/mock-history";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CONFIG, RUBRIC_MAX, isBlank, reportInsights, type MockQuestion, type QuestionAnswer } from "@/modules/mock/domain/mock";
import { formatDate } from "@/core/plan-clock";
import { freeAiConfigured, getMock } from "@/modules/mock/services/mock";
import { cn } from "@/core/utils";

export const metadata: Metadata = { title: "Mock report" };

const mins = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))}m`;

export default async function MockReportPage({ params }: PageProps<"/mock/[id]/report">) {
  const { id } = await params;
  const mock = await getMock(id);
  if (!mock) notFound();
  if (mock.status === "in_progress") redirect(`/mock/${id}`);

  const cfg = MOCK_CONFIG[mock.type];
  const used = mock.submittedAt ? new Date(mock.submittedAt).getTime() - new Date(mock.startedAt).getTime() : mock.durationMin * 60_000;
  const insights = reportInsights(mock.rounds, mock.answers);
  const total = mock.score.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/mock" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Mock interviews
        </Link>
        <DeleteMockButton id={mock.id} />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{cfg.label} mock</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDate(mock.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3.5" /> {mins(used)} of {mock.durationMin}m
            </span>
            {mock.autoSubmitted && <Badge variant="outline">Auto-submitted when time ran out</Badge>}
          </p>
        </div>
        <div className="text-right">
          <div className={cn("text-4xl font-semibold tabular-nums", scoreTone(total))}>{total ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{total == null ? "waiting for grades" : "out of 100"}</div>
        </div>
      </header>

      <GradePanel id={mock.id} pending={mock.score.pending} aiConfigured={freeAiConfigured()} />

      {mock.score.rounds.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mock.score.rounds.map((r, i) => (
            <Card key={r.topic} size="sm">
              <CardContent className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {r.title} · {mock.rounds[i].minutes}m
                </div>
                <div className={cn("text-2xl font-semibold tabular-nums", scoreTone(r.score))}>{r.score ?? "—"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(insights.strengths.length > 0 || insights.gaps.length > 0 || insights.practise.length > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          <InsightList title="Strengths" items={insights.strengths} empty="Nothing stood out yet." tone="text-success" />
          <InsightList title="Gaps" items={insights.gaps} empty="No clear gaps. Nice." tone="text-destructive" />
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Practise next</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.practise.length ? (
                <ul className="space-y-1.5 text-sm">
                  {insights.practise.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                        {p.label} <ArrowRight className="size-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Keep going with today&apos;s plan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {mock.rounds.map((r, ri) => (
        <section key={r.topic} className="space-y-3">
          {mock.rounds.length > 1 && <h2 className="text-lg font-semibold">{r.title}</h2>}
          {r.questions.map((q, qi) => (
            <QuestionReport key={q.id} mockId={mock.id} n={qi + 1} q={q} a={mock.answers[q.id]} score={mock.score.rounds[ri].questions[qi]} />
          ))}
        </section>
      ))}
    </div>
  );
}

function InsightList({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className={cn("text-sm", tone)}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {items.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionReport({ mockId, n, q, a, score }: { mockId: string; n: number; q: MockQuestion; a?: QuestionAnswer; score: number | null }) {
  const title = q.kind === "coding" ? q.title : q.prompt;
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <CardTitle className="min-w-0 text-sm leading-snug font-medium">
          <span className="text-muted-foreground">Q{n}.</span> {title}
        </CardTitle>
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", scoreTone(score))}>{score == null ? "pending" : `${score}/100`}</span>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {q.kind === "coding" && (
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
              <Badge variant="outline">{q.difficulty}</Badge>
              <span>
                {a?.total ? `${a.passed ?? 0}/${a.total} tests passed` : "No submission"}
                {a?.accepted ? " · accepted" : ""}
              </span>
              {a?.msSpent ? <span>{mins(a.msSpent)} spent</span> : null}
              {a?.hintsUsed ? <span>{a.hintsUsed} hint{a.hintsUsed === 1 ? "" : "s"} used</span> : null}
              {a?.language && <span>{a.language}</span>}
            </p>
            <Link href={q.source === "sheet" ? `/dsa/${q.slug}` : `/problems/${q.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              Open the problem <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}

        {q.kind === "mcq" && (
          <>
            {q.code && <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{q.code}</pre>}
            <ul className="space-y-1">
              {q.options.map((o, i) => {
                const right = i === q.answerIndex;
                const picked = a?.choice === i;
                return (
                  <li key={i} className={cn("flex items-start gap-2", right ? "text-success" : picked ? "text-destructive" : "text-muted-foreground")}>
                    {right ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : picked ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <Circle className="mt-0.5 size-4 shrink-0" />}
                    <span className="font-mono text-xs leading-5 whitespace-pre-wrap">{o}</span>
                    {picked && <span className="text-xs">(your answer)</span>}
                  </li>
                );
              })}
            </ul>
            {a?.choice == null && <p className="text-muted-foreground">Not answered.</p>}
            <p className="text-muted-foreground">{q.explanation}</p>
          </>
        )}

        {q.kind === "written" && (
          <>
            {isBlank(a) ? (
              <p className="text-muted-foreground">Left blank.</p>
            ) : (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-muted-foreground">Your answer</summary>
                <div className="mt-2 space-y-2">
                  {q.sections.map((s) =>
                    a?.sections?.[s.id]?.trim() ? (
                      <div key={s.id}>
                        <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                        <p className={cn("whitespace-pre-wrap", s.code && "font-mono text-xs")}>{a.sections[s.id]}</p>
                      </div>
                    ) : null,
                  )}
                </div>
              </details>
            )}

            {a?.scores?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{a.gradedBy === "self" ? "Self-reviewed" : "Graded by AI against the rubric"}</p>
                {a.summary && <p>{a.summary}</p>}
                <ul className="space-y-1.5">
                  {a.scores.map((s) => (
                    <li key={s.criterion} className="flex gap-3">
                      <span className="w-10 shrink-0 font-semibold tabular-nums">
                        {s.score}/{RUBRIC_MAX}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium">{q.criteria.find((c) => c.id === s.criterion)?.label ?? s.criterion}</span>
                        {s.feedback && <span className="text-muted-foreground"> · {s.feedback}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {q.points.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">A strong answer covers</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {q.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {q.reference && (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-muted-foreground">Reference answer</summary>
                <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{q.reference}</pre>
              </details>
            )}
            {q.href && (
              <Link href={q.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                Study this case <ArrowRight className="size-3.5" />
              </Link>
            )}

            {!isBlank(a) &&
              (a?.scores?.length ? (
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Disagree? Override with your own scores</summary>
                  <div className="mt-2">
                    <SelfReviewForm id={mockId} qid={q.id} criteria={q.criteria} current={a.scores} />
                  </div>
                </details>
              ) : (
                <SelfReviewForm id={mockId} qid={q.id} criteria={q.criteria} />
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
