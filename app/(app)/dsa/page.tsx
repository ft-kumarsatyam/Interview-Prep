import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Code2, RotateCcw } from "lucide-react";
import { nextUnsolved } from "@/modules/dsa/components/dsa-filters";
import { CompanySidebar } from "@/modules/dsa/components/company-sidebar";
import { DsaPageTabs } from "@/modules/dsa/components/dsa-page-tabs";
import { DsaProgressCard } from "@/modules/dsa/components/dsa-progress-card";
import { topCompanies } from "@/modules/dsa/domain/company-tags";
import { cheatSheetSlugs } from "@/modules/dsa/domain/dsa-cheat-sheet";
import { effectiveStatuses } from "@/modules/dsa/domain/external-catalogue";
import { buildPracticeRows, levelProgress, rowResources, topicOptions } from "@/modules/dsa/domain/practice-table";
import { sheetCardGroups } from "@/modules/dsa/domain/sheet-hub";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { companyDataset, dsaCheatSheets, dsaSheets, externalDsaSheets, externalResources, problemBySlug, problems } from "@/core/content";
import { addDays } from "@/core/domain/dates";
import { todayIn } from "@/modules/planner/services/plan";
import { listBookmarks } from "@/modules/dsa/services/bookmarks";
import { countDueReviews, getProgressMap } from "@/modules/dsa/services/problems";
import { getExternalProgress } from "@/modules/dsa/services/external-progress";
import { getProblemOfDay } from "@/modules/dsa/services/problem-of-day";
import { hubSheet, hubSheets } from "@/modules/dsa/services/sheet-catalogue";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "DSA" };

export default async function DsaPage({ searchParams }: PageProps<"/dsa">) {
  const sp = await searchParams;
  const sheetId = typeof sp.sheet === "string" ? sp.sheet : "";
  if (sheetId && hubSheet(sheetId)) {
    const rest = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (k === "tab" || k === "sheet" || v === undefined ? [] : [v].flat().map((x) => [k, x]))));
    redirect(`/dsa/sheets/${sheetId}${rest.size ? `?${rest}` : ""}`);
  }
  const [progress, settings, externalProgress, bookmarks, potd] = await Promise.all([
    getProgressMap(),
    getSettings(),
    getExternalProgress(),
    listBookmarks(),
    getProblemOfDay().catch(() => null),
  ]);
  const today = todayIn(settings);
  const dueReviews = await countDueReviews(today);
  const next = nextUnsolved(problems, progress);
  const sheetGroups = sheetCardGroups(hubSheets, effectiveStatuses(hubSheets.map((entry) => entry.sheet), externalProgress, progress));

  const rows = buildPracticeRows(problems, companyDataset, rowResources(dsaSheets, externalDsaSheets));
  const solved = new Set(Object.entries(progress).flatMap(([slug, p]) => (p.status === "solved" ? [slug] : [])));
  const levels = levelProgress(rows, solved);
  const core = problems.filter((p) => p.track === "main" && p.tier === "core");
  const coreSolved = core.filter((p) => solved.has(p.slug)).length;
  const weekStart = addDays(today, -6);
  const lastWeek = Object.values(progress).filter((p) => p.status === "solved" && p.lastSolvedOn && p.lastSolvedOn >= weekStart && p.lastSolvedOn <= today).length;
  const problemTitles = Object.fromEntries(cheatSheetSlugs(dsaCheatSheets).flatMap((slug) => {
    const p = problemBySlug.get(slug);
    return p ? [[slug, p.title] as const] : [];
  }));
  const ranked = topCompanies(companyDataset);

  return (
    <>
      <PageHeader
        icon={Code2}
        title="DSA practice set"
        description="Build problem-solving skill by topic, pattern and company. Work through approaches, revisit hard problems, and prepare for coding interviews."
      >
        {dueReviews > 0 && (
          <Button variant="outline" size="lg" asChild>
            <Link href="/review">
              <RotateCcw /> {dueReviews} review{dueReviews === 1 ? "" : "s"} due
            </Link>
          </Button>
        )}
        {next && (
          <Button size="lg" asChild className="max-w-full">
            <Link href={`/dsa/${next.slug}`} title={`Continue with ${next.title}`}>
              <span className="truncate">
                <span className="text-primary-foreground/70">Next:</span> {next.title}
              </span>
              <ArrowRight />
            </Link>
          </Button>
        )}
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <DsaProgressCard
            progress={levels}
            footer={
              <>
                Core pass {coreSolved} / {core.length} · {lastWeek} solved in the last 7 days ·{" "}
                <Link href="/dsa/sheets" className="text-primary underline-offset-2 hover:underline">All sheets</Link>
              </>
            }
          />
          <DsaPageTabs
            problems={problems}
            progress={progress}
            sheets={dsaSheets}
            cheatSheets={dsaCheatSheets}
            sheetGroups={sheetGroups}
            resources={externalResources}
            rows={rows}
            bookmarks={bookmarks}
            potdSlug={potd?.pick?.slug ?? null}
            topics={topicOptions(rows)}
            companyNames={ranked.slice(0, 60).map((c) => c.name)}
            companies={companyDataset.companies}
            problemTitles={problemTitles}
          />
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <CompanySidebar companies={ranked} source={companyDataset.source} />
        </div>
      </div>
    </>
  );
}
