import type { Metadata } from "next";
import { AlertTriangle, ChevronDown, ExternalLink, Network } from "lucide-react";
import { LinkCard } from "@/components/shared/link-card";
import { CaseBrowser } from "@/components/design/case-browser";
import { CaseOverview, JumpLinks, type CaseCardData } from "@/components/design/case-overview";
import { DesignTabs } from "@/components/design/design-tabs";
import { OpenHashDetails } from "@/components/design/open-hash-details";
import { SectionHeading } from "@/components/shared/section-heading";
import { PageHeader } from "@/components/shared/page-header";
import { DESIGN_CATEGORIES, engineeringBlogs, systemDesign } from "@/lib/content";
import { DESIGN_SECTION_IDS } from "@/lib/domain/design";
import { getDesignOverview } from "@/lib/services/designs";

export const metadata: Metadata = { title: "System Design" };

export default async function DesignPage() {
  const overview = await getDesignOverview();
  const { framework, blocks } = systemDesign;
  const ordered = DESIGN_CATEGORIES.flatMap((cat) => systemDesign.cases.filter((c) => c.category === cat));
  const cases: CaseCardData[] = ordered.map((c) => {
    const s = overview[c.slug];
    return {
      slug: c.slug,
      href: `/design/${c.slug}`,
      title: c.title,
      summary: c.summary,
      level: c.level,
      category: c.category,
      keywords: c.keywords,
      status: s.status,
      subtopicsDone: s.subtopicsDone,
      subtopicsTotal: s.subtopicsTotal,
      sectionsAttempted: s.sectionsAttempted,
      sectionsTotal: DESIGN_SECTION_IDS.length,
      minutesSpent: s.minutesSpent,
    };
  });
  const totalMinutes = framework.steps.reduce((n, s) => n + s.minutes, 0);

  return (
    <>
      <OpenHashDetails />
      <PageHeader
        icon={Network}
        title="System Design"
        description={`${cases.length} classic interview designs with diagrams, deep dives and real big-tech write-ups. Study a case, then run a timed ${totalMinutes}-minute mock.`}
      />
      <DesignTabs active="hld" />
      <CaseOverview cases={cases} />
      <JumpLinks
        links={[
          { href: "#cases", label: "Case studies" },
          { href: "#framework", label: `${totalMinutes}-min framework` },
          { href: "#blocks", label: "Building blocks" },
          { href: "#numbers", label: "Cheat sheet" },
        ]}
      />

      <section aria-labelledby="cases" className="mb-10 scroll-mt-20">
        <SectionHeading id="cases" title="Case studies" hint="Open a case to study it, then switch to the mock tab." />
        <CaseBrowser cases={cases} categories={DESIGN_CATEGORIES} />
      </section>

      <section aria-labelledby="framework" className="mb-10 scroll-mt-20">
        <SectionHeading id="framework" title={`The ${totalMinutes}-minute framework`} hint="Tap a step for its checklist." />
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {framework.steps.map((s, i) => (
            <li key={s.id}>
              <details className="group h-full rounded-xl border bg-card p-3 open:bg-muted/30">
                <summary className="flex min-h-9 cursor-pointer list-none items-start gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{s.title}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">{s.minutes} min</span>
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

      <section aria-labelledby="blocks" className="mb-10 scroll-mt-20">
        <SectionHeading id="blocks" title="Building blocks" hint={`${blocks.length} components to reach for, with trade-offs.`} />
        <div className="grid gap-2 md:grid-cols-2">
          {blocks.map((b) => (
            <details key={b.id} id={`block-${b.id}`} className="group scroll-mt-20 rounded-xl border bg-card p-3 open:bg-muted/30 target:border-primary/60">
              <summary className="flex min-h-9 cursor-pointer list-none items-start gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
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
                <p className="flex gap-2 rounded-lg bg-warning/10 p-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <span>
                    <span className="font-medium">Interview pitfall: </span>
                    {b.pitfall}
                  </span>
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="numbers" className="scroll-mt-20">
        <SectionHeading id="numbers" title="Back-of-the-envelope cheat sheet" />
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { title: "Latency numbers", rows: framework.latency },
            { title: "Capacity rules of thumb", rows: framework.numbers },
          ].map((t) => (
            <div key={t.title} className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 font-medium">{t.title}</h3>
              <dl className="divide-y text-sm">
                {t.rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 py-1.5">
                    <dt className="min-w-0 text-muted-foreground">{r.label}</dt>
                    <dd className="shrink-0 text-right font-mono tabular">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="blogs" className="scroll-mt-20">
        <SectionHeading id="blogs" title="Engineering blogs to read" hint="Real architectures from real companies" />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {engineeringBlogs.map((b) => (
            <li key={b.url}>
              <LinkCard external href={b.url} className="gap-2 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{b.tags.join(" · ")}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </LinkCard>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
