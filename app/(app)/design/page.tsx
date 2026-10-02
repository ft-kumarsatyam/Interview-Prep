import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Clock, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { systemDesign } from "@/lib/content";
import type { DesignStatus } from "@/lib/domain/design";
import { getDesignOverview } from "@/lib/services/designs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "System Design" };

const STATUS: Record<DesignStatus, { label: string; className: string }> = {
  new: { label: "Not started", className: "bg-muted text-muted-foreground" },
  studying: { label: "Studying", className: "bg-warning/12 text-warning" },
  practised: { label: "Practised", className: "bg-primary/12 text-primary" },
  mastered: { label: "Mastered", className: "bg-success/12 text-success" },
};

export default async function DesignPage() {
  const overview = await getDesignOverview();
  const { framework, blocks, cases } = systemDesign;
  const counts = Object.values(overview).reduce<Record<DesignStatus, number>>(
    (acc, s) => ({ ...acc, [s.status]: acc[s.status] + 1 }),
    { new: 0, studying: 0, practised: 0, mastered: 0 },
  );

  return (
    <>
      <PageHeader
        title="System Design"
        description={`${cases.length} classic interview designs with diagrams, deep dives and real big-tech write-ups. Study a case, then run a timed 45-minute mock.`}
      />

      <section aria-labelledby="framework" className="mb-8">
        <h2 id="framework" className="mb-3 font-semibold">
          The 45-minute framework
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {framework.steps.map((s, i) => (
            <li key={s.id}>
              <details className="group h-full rounded-xl border bg-card p-3 open:bg-muted/30">
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{s.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.minutes} min</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{s.goal}</span>
                  </span>
                  <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mt-3 list-disc space-y-1 pl-12 text-sm">
                  {s.checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cases" className="mb-8">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="cases" className="font-semibold">
            Case studies
          </h2>
          <span className="text-xs text-muted-foreground">
            {counts.mastered} mastered · {counts.practised} practised · {counts.studying} studying
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => {
            const s = overview[c.slug];
            return (
              <Link
                key={c.slug}
                href={`/design/${c.slug}`}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS[s.status].className)}>
                    {s.status === "mastered" && <Trophy className="mr-1 inline size-3" aria-hidden />}
                    {STATUS[s.status].label}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{c.level}</span>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
                <h3 className="font-medium leading-snug group-hover:text-primary">{c.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="size-3" aria-hidden /> {s.subtopicsDone}/{s.subtopicsTotal} topic subtopics
                  </span>
                  {s.minutesSpent > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden /> {s.minutesSpent} min practised
                    </span>
                  )}
                  {s.sectionsAttempted > 0 && <span>{s.sectionsAttempted}/6 sections written</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="blocks" className="mb-8">
        <h2 id="blocks" className="mb-3 font-semibold">
          Building blocks
        </h2>
        <div className="grid gap-2 md:grid-cols-2">
          {blocks.map((b) => (
            <details key={b.id} id={`block-${b.id}`} className="group scroll-mt-20 rounded-xl border bg-card p-3 open:bg-muted/30">
              <summary className="flex cursor-pointer list-none items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{b.name}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{b.summary}</span>
                </span>
                <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Use when</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {b.useWhen.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Trade-offs</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {b.tradeoffs.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-lg bg-warning/10 p-2.5">
                  <span className="font-medium">Interview pitfall: </span>
                  {b.pitfall}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="numbers" className="grid gap-3 md:grid-cols-2">
        <h2 id="numbers" className="sr-only">
          Back-of-the-envelope cheat sheet
        </h2>
        {[
          { title: "Latency numbers", rows: framework.latency },
          { title: "Capacity rules of thumb", rows: framework.numbers },
        ].map((t) => (
          <div key={t.title} className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 font-medium">{t.title}</h3>
            <dl className="divide-y text-sm">
              {t.rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="shrink-0 text-right font-mono tabular">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>
    </>
  );
}
