import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Timer } from "lucide-react";
import { TopicCard } from "@/modules/aptitude/components/topic-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { aptitudeBank } from "@/core/content";
import { hasQuestions } from "@/modules/aptitude/domain/aptitude";
import { percent } from "@/modules/aptitude/domain/aptitude/progress";
import { aptitudeCategoryById, APTITUDE_CATEGORIES, APTITUDE_TOPICS, isCategoryId, topicsIn, type AptitudeCategoryId } from "@/modules/aptitude/domain/aptitude/topics";
import { getAptitudeOverview } from "@/modules/aptitude/services/aptitude";
import { cn } from "@/core/utils";

export const metadata: Metadata = { title: "Aptitude" };

export default async function AptitudePage({ searchParams }: PageProps<"/aptitude">) {
  const { c } = await searchParams;
  const raw = Array.isArray(c) ? c[0] : c;
  const active: AptitudeCategoryId = raw && isCategoryId(raw) ? raw : "quantitative";
  const category = aptitudeCategoryById.get(active)!;
  const overview = await getAptitudeOverview();
  const topics = topicsIn(active).filter((t) => hasQuestions(t.id, aptitudeBank));
  const mastered = topics.filter((t) => overview.stats[t.id].status === "mastered").length;
  const allMastered = APTITUDE_TOPICS.filter((t) => overview.stats[t.id].status === "mastered").length;
  const todayAccuracy = overview.today.answered > 0 ? overview.today.correct / overview.today.answered : null;

  return (
    <>
      <PageHeader
        icon={Brain}
        title="Aptitude"
        description="Think faster. Topic drills with a live timer, instant shortcuts and timed mocks: quantitative, logical and verbal."
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Mastered", value: `${allMastered}/${APTITUDE_TOPICS.length}` },
          { label: "Today", value: `${overview.today.answered} answered` },
          { label: "Today accuracy", value: percent(todayAccuracy) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <nav aria-label="Aptitude categories" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {APTITUDE_CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/aptitude?c=${cat.id}`}
            aria-current={cat.id === active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors",
              cat.id === active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.title}
          </Link>
        ))}
      </nav>

      <Card className="mb-5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 sm:max-w-xl">
            <p className="text-sm text-pretty text-muted-foreground">{category.blurb}</p>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={topics.length ? (mastered / topics.length) * 100 : 0} className="h-1.5" aria-label={`${category.title} mastered`} />
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {mastered} / {topics.length} topics mastered
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Mastered = the latest 20 answers at 80% or better.</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/aptitude/mock/${active}`}>
              <Timer /> {category.mockMinutes}-min mock test
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => (
          <TopicCard key={t.id} topic={t} stats={overview.stats[t.id]} />
        ))}
      </div>
    </>
  );
}
