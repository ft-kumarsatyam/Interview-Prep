import type { Metadata } from "next";
import { Network } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { DesignSheetTable } from "@/modules/design/components/design-sheet-table";
import { designSheetRows } from "@/modules/design/domain/design-sheet";
import { systemDesign } from "@/core/content";
import { getDesignOverview } from "@/modules/design/services/designs";
import { getSubtopicProgressMap } from "@/modules/learn/services/learn";

export const metadata: Metadata = { title: "System design sheet" };

export default async function SystemDesignSheetPage() {
  const [overview, subtopics] = await Promise.all([getDesignOverview(), getSubtopicProgressMap()]);
  const status = Object.fromEntries(Object.values(overview).map((s) => [s.slug, s.status]));
  const rows = designSheetRows(systemDesign.cases, status, new Set(Object.keys(subtopics)));

  return (
    <>
      <BackLink href="/dsa/sheets">All sheets</BackLink>
      <PageHeader
        icon={Network}
        title="System design sheet"
        description="High-level design cases open in the design workspace; low-level design questions open their notes. A case counts as done once you have practised every section or mastered its topic quiz."
      />
      <DesignSheetTable rows={rows} />
      <p className="mt-6 text-xs text-muted-foreground">Companies are where candidates commonly report the question, not an official list.</p>
    </>
  );
}
