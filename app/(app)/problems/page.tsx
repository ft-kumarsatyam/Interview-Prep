import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardPaste, Library } from "lucide-react";
import { GenerateProblemButton } from "@/modules/dsa/components/problems/generate-dialog";
import { ProblemOfDayCard } from "@/modules/dsa/components/problems/problem-of-day-card";
import { TopicGrid } from "@/modules/dsa/components/problems/topic-grid";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { problems } from "@/core/content";
import { topicProgress } from "@/modules/dsa/domain/topic-progress";
import { problemTopics } from "@/modules/progress/domain/problem-topics";
import { listCustomProblems } from "@/modules/dsa/services/custom-problems";
import { getProblemOfDay } from "@/modules/dsa/services/problem-of-day";
import { getProgressMap } from "@/modules/dsa/services/problems";
import { cn } from "@/core/utils";

export const metadata: Metadata = { title: "Problems" };

const DIFF_CLASS = { Easy: "text-success", Medium: "text-warning", Hard: "text-destructive" } as const;

export default async function ProblemsPage() {
  const [list, progress, potd] = await Promise.all([listCustomProblems(), getProgressMap(), getProblemOfDay()]);
  const topics = problemTopics(problems);
  const solvedSlugs = new Set(Object.entries(progress).flatMap(([slug, p]) => (p.status === "solved" ? [slug] : [])));
  const byTopic = topicProgress(problems, solvedSlugs, list.map((p) => p.topic));
  const solved = list.filter((p) => p.solvedOn).length;

  return (
    <>
      <PageHeader
        icon={Library}
        title="Problems"
        description="A problem of the day that pulls your plan forward, every sheet topic with its progress, and your own problems: generate one with AI or paste one from anywhere. They all run in the same editor."
      >
        <Button asChild variant="outline">
          <Link href="/practice">All practice</Link>
        </Button>
        <GenerateProblemButton topics={topics} />
        <Button asChild variant="outline">
          <Link href="/problems/new">
            <ClipboardPaste /> Paste a problem
          </Link>
        </Button>
      </PageHeader>

      <ProblemOfDayCard data={potd} />

      <section className="mb-8">
        <SectionHeading title="Problems by topic" hint={`${byTopic.length} topics · solving any of them early shortens the plan`} />
        <TopicGrid topics={byTopic} />
      </section>

      <section>
        <SectionHeading title="Your problems" hint={list.length > 0 ? `${list.length} problem${list.length === 1 ? "" : "s"} · ${solved} solved` : undefined} />
        {list.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 py-10 text-center text-sm text-muted-foreground">
              <p className="text-base font-medium text-foreground">No custom problems yet</p>
              <p>Generate one on any topic, or paste a question you saw in an interview, a company list or a book.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {list.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/problems/${p.slug}`}
                  className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <CheckCircle2 className={cn("size-4 shrink-0", p.solvedOn ? "text-success" : "text-muted-foreground/30")} aria-label={p.solvedOn ? "Solved" : "Not solved"} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{p.topic}</span>
                  <span className="hidden rounded-full bg-muted px-2 py-0.5 text-2xs text-muted-foreground md:inline">{p.source === "ai" ? "AI" : "Pasted"}</span>
                  <span className={cn("w-14 text-right text-xs font-medium", DIFF_CLASS[p.difficulty])}>{p.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
