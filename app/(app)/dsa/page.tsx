import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2, RotateCcw } from "lucide-react";
import { DsaBrowser } from "@/modules/dsa/components/dsa-browser";
import { nextUnsolved, parseFilters } from "@/modules/dsa/components/dsa-filters";
import { DsaOverview } from "@/modules/dsa/components/dsa-overview";
import { DsaCheatSheet } from "@/modules/dsa/components/dsa-cheat-sheet";
import { ExternalSheetBrowser } from "@/modules/dsa/components/external-sheet-browser";
import { ExternalResources } from "@/modules/dsa/components/external-resources";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { dsaCheatSheets, dsaSheets, externalDsaSheets, externalResources, problems } from "@/core/content";
import { todayIn } from "@/modules/planner/services/plan";
import { countDueReviews, getProgressMap } from "@/modules/dsa/services/problems";
import { getExternalProgress } from "@/modules/dsa/services/external-progress";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "DSA" };

export default async function DsaPage({ searchParams }: PageProps<"/dsa">) {
  const [progress, settings, sp, externalProgress] = await Promise.all([getProgressMap(), getSettings(), searchParams, getExternalProgress()]);
  const today = todayIn(settings);
  const dueReviews = await countDueReviews(today);
  const next = nextUnsolved(problems, progress);

  return (
    <>
      <PageHeader icon={Code2} title="DSA" description={`${problems.length} free LeetCode problems, solved in JavaScript. Work pattern by pattern, or follow Blind 75, NeetCode 150 or Striver's SDE sheet.`}>
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
      <DsaOverview problems={problems} progress={progress} today={today} />
      <DsaCheatSheet sheets={dsaCheatSheets} />
      <ExternalSheetBrowser sheets={externalDsaSheets} statuses={externalProgress} />
      <ExternalResources resources={externalResources} />
      <DsaBrowser problems={problems} progress={progress} initial={parseFilters(sp)} sheets={dsaSheets} />
    </>
  );
}
