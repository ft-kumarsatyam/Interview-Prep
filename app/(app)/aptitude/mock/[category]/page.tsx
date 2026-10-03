import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AptitudeRunner, type TopicMeta } from "@/components/aptitude/aptitude-runner";
import { aptitudeCategoryById, APTITUDE_TOPICS, isCategoryId } from "@/lib/domain/aptitude/topics";
import { bankHistory, mockQuestions, newSeed } from "@/lib/services/aptitude";

export const metadata: Metadata = { title: "Aptitude mock test" };

export default async function AptitudeMockPage({ params, searchParams }: PageProps<"/aptitude/mock/[category]">) {
  const [{ category: raw }, { s }] = await Promise.all([params, searchParams]);
  if (!isCategoryId(raw)) notFound();
  const category = aptitudeCategoryById.get(raw)!;
  const sRaw = Array.isArray(s) ? s[0] : s;
  const seed = sRaw && /^\d{1,10}$/.test(sRaw) ? Number(sRaw) : null;
  if (seed === null) redirect(`/aptitude/mock/${raw}?s=${newSeed()}`);

  const categoryTopics = APTITUDE_TOPICS.filter((t) => t.category === category.id);
  const questions = mockQuestions(category.id, seed, await bankHistory(categoryTopics.map((t) => t.id)));
  const topics: Record<string, TopicMeta> = Object.fromEntries(
    categoryTopics.map((t) => [t.id, { title: t.title, targetSec: t.targetSec }]),
  );

  return (
    <>
      <Link href={`/aptitude?c=${category.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {category.title}
      </Link>
      <h1 className="mb-5 text-xl font-semibold tracking-tight sm:text-2xl">{category.title} mock test</h1>
      <div className="max-w-3xl">
        <AptitudeRunner
          key={seed}
          questions={questions}
          mode="mock"
          topics={topics}
          timeLimitSec={category.mockMinutes * 60}
          nextHref={`/aptitude/mock/${category.id}?s=${newSeed()}`}
          backHref={`/aptitude?c=${category.id}`}
          heading={`${category.title}: ${questions.length} mixed questions`}
        />
      </div>
    </>
  );
}
