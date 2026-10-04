import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { InterviewDeck, type DeckQuestion } from "@/components/web/interview-deck";
import { interviewQuestions, interviewTracks, webLessonById } from "@/lib/content";
import type { InterviewStatus } from "@/lib/domain/web-interview";
import { getInterviewStatus } from "@/lib/services/webdev";

/** Besides each track id: "all" is every question and "review" is the ones you marked for review. */
const VIRTUAL = {
  all: { name: "Every web interview question", blurb: "All topics mixed together, as a real interview would." },
  review: { name: "Review queue", blurb: "The questions you marked to review again." },
} as const;

function deckFor(id: string) {
  const track = interviewTracks.find((t) => t.id === id);
  if (track) return { name: track.name, blurb: track.blurb, virtual: false };
  if (id === "all" || id === "review") return { ...VIRTUAL[id], virtual: true };
  return null;
}

export async function generateMetadata({ params }: PageProps<"/web/interview/[track]">): Promise<Metadata> {
  const { track } = await params;
  return { title: `${deckFor(track)?.name ?? "Interview"} questions` };
}

export default async function InterviewTrackPage({ params }: PageProps<"/web/interview/[track]">) {
  const { track } = await params;
  const deck = deckFor(track);
  if (!deck) notFound();
  const status = await getInterviewStatus();
  const trackName = new Map(interviewTracks.map((t) => [t.id, t.name]));

  const source = track === "all" ? interviewQuestions : track === "review" ? interviewQuestions.filter((q) => status.get(q.id) === "review") : interviewQuestions.filter((q) => q.track === track);
  const questions: DeckQuestion[] = source.map((q) => {
    const lesson = q.lesson ? webLessonById.get(q.lesson) : undefined;
    return {
      id: q.id,
      level: q.level,
      q: q.q,
      answer: q.answer,
      followUps: q.followUps,
      mistakes: q.mistakes,
      trackName: trackName.get(q.track) ?? q.track,
      lesson: lesson ? { id: lesson.id, title: lesson.title } : undefined,
    };
  });
  const initialStatus: Record<string, InterviewStatus> = Object.fromEntries(source.flatMap((q) => (status.has(q.id) ? [[q.id, status.get(q.id)!]] : [])));

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/web/interview">Web interview prep</BackLink>
      <PageHeader icon={MessageCircleQuestion} title={deck.name} description={deck.blurb} />
      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing to review right now. Mark a question &quot;Review again&quot; and it shows up here.</p>
      ) : (
        <InterviewDeck questions={questions} initialStatus={initialStatus} showTrack={deck.virtual} />
      )}
    </div>
  );
}
