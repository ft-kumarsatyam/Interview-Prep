"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, Building2, Shapes } from "lucide-react";
import { replaceQuery } from "@/components/shared/history-back-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentProblem, ContentSheet } from "@/core/content";
import type { CheatSheet } from "@/modules/dsa/domain/dsa-cheat-sheet";
import type { DatasetCompany } from "@/modules/dsa/domain/company-tags";
import type { ExternalResource } from "@/modules/dsa/domain/external-catalogue";
import { parseTableFilters, type PracticeRow, type TableFilters } from "@/modules/dsa/domain/practice-table";
import type { SheetCard } from "@/modules/dsa/domain/sheet-hub";
import type { ProgressSummary } from "@/modules/dsa/services/problems";
import { parseFilters } from "@/modules/dsa/components/dsa-filters";
import { DSA_TABS, paramsRecord, parseDsaView, type DsaTab } from "@/modules/dsa/components/dsa-view-state";
import { CompanyGrid } from "@/modules/dsa/components/company-grid";
import { DsaBrowser } from "@/modules/dsa/components/dsa-browser";
import { DsaCheatSheet } from "@/modules/dsa/components/dsa-cheat-sheet";
import { ExternalResources } from "@/modules/dsa/components/external-resources";
import { ProblemTable } from "@/modules/dsa/components/problem-table";
import { SheetHubGrid } from "@/modules/dsa/components/sheet-hub-grid";

/** Inactive tabs stay mounted (just hidden) so switching tabs never resets a filter or a picked section. */
const PANEL = "data-[state=inactive]:hidden";
const ENTRY = "inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted";

export function DsaPageTabs({
  problems,
  progress,
  sheets,
  cheatSheets,
  sheetGroups,
  resources,
  rows,
  bookmarks,
  potdSlug,
  topics,
  companyNames,
  companies,
  problemTitles,
}: {
  problems: ContentProblem[];
  progress: Record<string, ProgressSummary>;
  sheets: ContentSheet[];
  cheatSheets: readonly CheatSheet[];
  /** Sheet cards only: each sheet's rows load on its own page. */
  sheetGroups: { title: string; cards: SheetCard[] }[];
  resources: readonly ExternalResource[];
  rows: PracticeRow[];
  bookmarks: string[];
  potdSlug: string | null;
  topics: string[];
  /** Company names for the table's company filter, biggest first. */
  companyNames: string[];
  companies: DatasetCompany[];
  problemTitles: Record<string, string>;
}) {
  // Read from the live URL, not server props: going back re-renders this page from the router cache, whose props
  // are from the first visit and would reset the tab, section and open groups you left.
  const searchParams = useSearchParams();
  const [{ initial, view, table }] = useState(() => {
    const sp = paramsRecord(searchParams);
    return { initial: parseFilters(sp), view: parseDsaView(sp), table: parseTableFilters(sp) };
  });
  const [tab, setTab] = useState<DsaTab>(view.tab);
  /** Bumped by the entry buttons so the table remounts with a preset. */
  const [preset, setPreset] = useState<{ key: number; filters: TableFilters }>({ key: 0, filters: table });
  const select = (value: string) => {
    const next = DSA_TABS.find((item) => item === value) ?? "practice";
    setTab(next);
    replaceQuery({ tab: next === "practice" ? null : next });
  };
  const solved = Object.entries(progress).flatMap(([slug, p]) => (p.status === "solved" ? [slug] : []));
  const attempted = Object.entries(progress).flatMap(([slug, p]) => (p.status === "attempted" ? [slug] : []));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Browse problems by">
        <Link href="/dsa/companies" className={ENTRY}>
          <Building2 className="size-4 text-muted-foreground" aria-hidden /> Company asked
        </Link>
        <button type="button" className={ENTRY} onClick={() => select("patterns")}>
          <Shapes className="size-4 text-muted-foreground" aria-hidden /> Pattern based
        </button>
        <button
          type="button"
          className={ENTRY}
          onClick={() => {
            setPreset((p) => ({ key: p.key + 1, filters: { ...p.filters, sort: "frequency" } }));
            select("practice");
          }}
        >
          <Activity className="size-4 text-muted-foreground" aria-hidden /> Asked frequency
        </button>
      </div>
      <Tabs value={tab} onValueChange={select} className="gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="practice">Problems</TabsTrigger>
          <TabsTrigger value="topics">By topic</TabsTrigger>
          <TabsTrigger value="patterns">Patterns ({cheatSheets.length})</TabsTrigger>
          <TabsTrigger value="sheets">Sheets</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
        </TabsList>
        <TabsContent value="practice" forceMount className={PANEL}>
          <ProblemTable
            key={preset.key}
            rows={rows}
            solved={solved}
            attempted={attempted}
            bookmarks={bookmarks}
            potdSlug={potdSlug}
            initial={preset.filters}
            topics={topics}
            companies={companyNames}
          />
        </TabsContent>
        <TabsContent value="topics" forceMount className={PANEL}>
          <DsaBrowser problems={problems} progress={progress} initial={initial} initialOpen={view.open} sheets={sheets} />
        </TabsContent>
        <TabsContent value="patterns" forceMount className={PANEL}>
          <DsaCheatSheet sheets={cheatSheets} initialId={view.cheat} problemTitles={problemTitles} />
        </TabsContent>
        <TabsContent value="sheets" forceMount className={PANEL}>
          <SheetHubGrid groups={sheetGroups} />
        </TabsContent>
        <TabsContent value="companies" forceMount className={PANEL}>
          <CompanyGrid companies={companies} />
        </TabsContent>
        <TabsContent value="references" forceMount className={PANEL}>
          <ExternalResources resources={resources} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
