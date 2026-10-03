import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { AptitudeRunner } from "@/components/aptitude/aptitude-runner";
import { DifficultyPicker } from "@/components/quiz/difficulty-picker";
import { Card, CardContent } from "@/components/ui/card";
import { aptitudeBank } from "@/lib/content";
import { bankDifficultyCounts } from "@/lib/domain/aptitude";
import { percent } from "@/lib/domain/aptitude/progress";
import { parseDifficulty } from "@/lib/domain/quiz";
import type { Difficulty } from "@/lib/quiz/question";
import { aptitudeCategoryById, aptitudeTopicById } from "@/lib/domain/aptitude/topics";
import { bankHistory, drillQuestions, getAptitudeOverview, getTopicHistory, newSeed } from "@/lib/services/aptitude";

export async function generateMetadata({ params }: PageProps<"/aptitude/[topicId]">): Promise<Metadata> {
  const { topicId } = await params;
  return { title: aptitudeTopicById.get(topicId)?.title ?? "Aptitude" };
}

export default async function AptitudeTopicPage({ params, searchParams }: PageProps<"/aptitude/[topicId]">) {
  const [{ topicId }, { s, d }] = await Promise.all([params, searchParams]);
  const topic = aptitudeTopicById.get(topicId);
  if (!topic) notFound();
  const raw = Array.isArray(s) ? s[0] : s;
  const seed = raw && /^\d{1,10}$/.test(raw) ? Number(raw) : null;
  const difficulty = parseDifficulty(Array.isArray(d) ? d[0] : d);
  const drillHref = (level: Difficulty | null) => `/aptitude/${topic.id}?s=${newSeed()}${level ? `&d=${level}` : ""}`;
  // The seed lives in the URL so a reload mid-drill keeps the same questions.
  if (seed === null) redirect(drillHref(difficulty));

  const category = aptitudeCategoryById.get(topic.category)!;
  const [overview, history, rotation] = await Promise.all([getAptitudeOverview(), getTopicHistory(topic.id), bankHistory([topic.id], difficulty)]);
  const stats = overview.stats[topic.id];
  const questions = drillQuestions(topic.id, seed, rotation);
  const levels = bankDifficultyCounts(topic.id, aptitudeBank);
  const hasLevels = levels.easy + levels.medium + levels.hard > 0;

  return (
    <>
      <Link href={`/aptitude?c=${topic.category}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {category.title}
      </Link>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{topic.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {topic.summary} Target: {topic.targetSec}s per question.
          {stats.attempted > 0 && (
            <>
              {" "}
              You: {percent(stats.accuracy)} accuracy, {stats.avgSec?.toFixed(0)}s average over {stats.attempted} recent answers.
            </>
          )}
        </p>
        {hasLevels && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <DifficultyPicker value={difficulty} hrefFor={drillHref} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {levels.easy} easy · {levels.medium} medium · {levels.hard} hard · unseen questions first
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <AptitudeRunner
            key={seed}
            questions={questions}
            mode="topic"
            topics={{ [topic.id]: { title: topic.title, targetSec: topic.targetSec } }}
            nextHref={drillHref(difficulty)}
            backHref={`/aptitude?c=${topic.category}`}
            heading={`${topic.title}: ${questions.length}-question drill`}
          />
        </div>
        <aside className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="size-4 text-warning" aria-hidden /> Shortcuts to memorise
              </h2>
              <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-muted-foreground">
                {topic.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {history.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h2 className="mb-2 text-sm font-semibold">Recent sessions</h2>
                <ul className="flex flex-col gap-1 text-sm">
                  {history.map((h) => (
                    <li key={h.at} className="flex items-center justify-between gap-2 text-muted-foreground tabular-nums">
                      <span>{h.date}{h.mode === "mock" ? " · mock" : ""}</span>
                      <span>
                        {h.correct}/{h.total} · {(h.totalMs / h.total / 1000).toFixed(0)}s each
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
