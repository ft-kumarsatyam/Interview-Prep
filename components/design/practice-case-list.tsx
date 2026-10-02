import { Cpu, Database, FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { practiceCases } from "@/lib/content";
import { EXPLAIN_MINUTES, EXPLAIN_SECTION_IDS, type PracticeKind } from "@/lib/domain/practice-cases";
import { getPracticeOverview } from "@/lib/services/practice-cases";
import { CaseBrowser } from "./case-browser";
import { CaseOverview, type CaseCardData } from "./case-overview";
import { DesignTabs } from "./design-tabs";

const COPY: Record<PracticeKind, { title: string; description: string; icon: typeof Cpu }> = {
  os: {
    title: "Operating Systems",
    description: `Classic OS interview questions with worked examples, trade-offs and follow-ups. Study a case, then write your own answer against a ${EXPLAIN_MINUTES}-minute clock.`,
    icon: Cpu,
  },
  dbms: {
    title: "Databases",
    description: `Classic DBMS interview questions: transactions, indexing, distributed data, query tuning. Study a case, then write your own answer against a ${EXPLAIN_MINUTES}-minute clock.`,
    icon: Database,
  },
};

export async function PracticeCaseList({ kind }: { kind: PracticeKind }) {
  const overview = await getPracticeOverview(kind);
  const cases: CaseCardData[] = practiceCases
    .filter((c) => c.kind === kind)
    .map((c) => {
      const s = overview[c.slug];
      return {
        slug: c.slug,
        href: `/design/${kind}/${c.slug}`,
        title: c.title,
        summary: c.summary,
        level: c.level,
        keywords: c.keywords,
        status: s.status,
        subtopicsDone: s.subtopicsDone,
        subtopicsTotal: s.subtopicsTotal,
        sectionsAttempted: s.sectionsAttempted,
        sectionsTotal: EXPLAIN_SECTION_IDS.length,
        minutesSpent: s.minutesSpent,
      };
    });

  return (
    <>
      <PageHeader icon={COPY[kind].icon} title={COPY[kind].title} description={COPY[kind].description} />
      <DesignTabs active={kind} />

      {cases.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No cases yet">
          Cases appear here once they are added to the content files and seeded.
        </EmptyState>
      ) : (
        <>
          <CaseOverview cases={cases} />
          <section aria-labelledby="cases" className="mb-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="cases" className="text-lg font-semibold tracking-tight">
                Case studies
              </h2>
              <p className="text-xs text-muted-foreground">
                Each mock is a {EXPLAIN_MINUTES}-minute answer: definition, example, trade-offs, real systems, follow-ups.
              </p>
            </div>
            <CaseBrowser cases={cases} />
          </section>
        </>
      )}
    </>
  );
}
