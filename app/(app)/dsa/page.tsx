import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2, RotateCcw } from "lucide-react";
import { DsaBrowser } from "@/components/dsa/dsa-browser";
import { nextUnsolved, parseFilters } from "@/components/dsa/dsa-filters";
import { DsaOverview } from "@/components/dsa/dsa-overview";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { dsaSheets, problems } from "@/lib/content";
import { todayIn } from "@/lib/services/plan";
import { countDueReviews, getProgressMap } from "@/lib/services/problems";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "DSA" };

export default async function DsaPage({ searchParams }: PageProps<"/dsa">) {
  const [progress, settings, sp] = await Promise.all([getProgressMap(), getSettings(), searchParams]);
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
      <DsaBrowser problems={problems} progress={progress} initial={parseFilters(sp)} sheets={dsaSheets} />
    </>
  );
}
