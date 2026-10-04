import Link from "next/link";
import { Award, BookOpen, ListChecks, Radar as RadarIcon } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageSection } from "@/components/shared/page-section";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import type { StatsData } from "@/modules/progress/services/stats";
import { MasteryRadar, QuizTrendChart } from "./lazy-charts";

/** Quiz score trend and the JavaScript mastery radar. */
export function QuizMasterySection({ stats: s }: { stats: StatsData }) {
  const mastered = s.radar.filter((r) => r.mastered);
  return (
    <PageSection title="Quizzes & mastery">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Quiz scores"
          description={`Best score per daily and weekly quiz. Dots are green when ≥ ${s.passPct}%.`}
          action={
            s.quizzes.length > 0 ? (
              <Button asChild variant="ghost" size="sm" className="h-9">
                <Link href="/quiz/history">History</Link>
              </Button>
            ) : undefined
          }
        >
          {s.quizzes.length > 0 ? (
            <QuizTrendChart data={s.quizzes} passPct={s.passPct} />
          ) : (
            <EmptyState
              compact
              icon={ListChecks}
              title="No quiz scores yet"
              action={
                <Button asChild size="lg" className="h-10 px-4">
                  <Link href="/quiz">Go to today&apos;s quiz</Link>
                </Button>
              }
            >
              Take today&apos;s quiz to see your trend.
            </EmptyState>
          )}
        </ChartCard>

        <ChartCard title="JavaScript mastery" description="Practice and topic-quiz scores per JS topic.">
          {s.radar.some((r) => r.score > 0) ? (
            <>
              <MasteryRadar data={s.radar} />
              {mastered.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="sr-only">Mastered:</span>
                  {mastered.map((r) => (
                    <ToneBadge key={r.title} tone="success" icon={Award}>
                      {r.title}
                    </ToneBadge>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              compact
              icon={RadarIcon}
              title="Radar is empty"
              action={
                <Button asChild size="lg" className="h-10 px-4">
                  <Link href="/learn/practice?ref=js-basics:0">
                    <BookOpen /> Run a practice quiz
                  </Link>
                </Button>
              }
            >
              Practise from any JS topic in Learn to fill it in.
            </EmptyState>
          )}
        </ChartCard>
      </div>
    </PageSection>
  );
}
