import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { InterviewDeck, type DeckQuestion } from "@/modules/learn/components/web/interview-deck";
import { interviewQuestions, interviewTracks, webLessonById } from "@/core/content";
import type { InterviewStatus } from "@/modules/learn/domain/web-interview";
import { WEB_AREA_INFO, WEB_AREAS, type WebArea } from "@/modules/learn/domain/webdev";
import { getInterviewStatus } from "@/modules/learn/services/webdev";
import { GenerateInterview } from "@/modules/learn/components/web/generate-interview";
import { loadGeneratedInterview } from "@/modules/learn/services/interview-generated";
import { isGeneratedInterviewId } from "@/modules/learn/domain/interview-generated";

/** Besides each track id: "all" is every question and "review" is the ones you marked for review. */
const VIRTUAL = {
  all: { name: "Every web interview question", blurb: "All topics mixed together, as a real interview would." },
  review: { name: "Review queue", blurb: "The questions you marked to review again." },
} as const;

const AREA_PREFIX = "area-";

function deckFor(id: string) {
  const track = interviewTracks.find((t) => t.id === id);
  if (track) return { name: track.name, blurb: track.blurb, virtual: false };
  if (id === "all" || id === "review") return { ...VIRTUAL[id], virtual: true };
  const area = id.slice(AREA_PREFIX.length);
  if (id.startsWith(AREA_PREFIX) && (WEB_AREAS as readonly string[]).includes(area)) {
    const info = WEB_AREA_INFO[area as WebArea];
    return { name: `${info.name}: mixed round`, blurb: `Every ${info.name.toLowerCase()} question, mixed across topics the way a real round jumps around.`, virtual: true };
  }
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
  const [status, generated] = await Promise.all([getInterviewStatus(), loadGeneratedInterview()]);
  const allQuestions = [...interviewQuestions, ...generated];
  const trackName = new Map(interviewTracks.map((t) => [t.id, t.name]));

  const trackArea = new Map(interviewTracks.map((t) => [t.id, t.area]));
  const source =
    track === "all"
      ? allQuestions
      : track === "review"
        ? allQuestions.filter((q) => status.get(q.id) === "review")
        : track.startsWith(AREA_PREFIX)
          ? allQuestions.filter((q) => `${AREA_PREFIX}${trackArea.get(q.track)}` === track)
          : allQuestions.filter((q) => q.track === track);
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
      ...(isGeneratedInterviewId(q.id) ? { generated: true } : {}),
      lesson: lesson ? { id: lesson.id, title: lesson.title } : undefined,
    };
  });
  const initialStatus: Record<string, InterviewStatus> = Object.fromEntries(source.flatMap((q) => (status.has(q.id) ? [[q.id, status.get(q.id)!]] : [])));

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/web/interview">Interview bank</BackLink>
      <PageHeader icon={MessageCircleQuestion} title={deck.name} description={deck.blurb} />
      {!deck.virtual && <GenerateInterview track={track} />}
      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing to review right now. Mark a question &quot;Review again&quot; and it shows up here.</p>
      ) : (
        <InterviewDeck questions={questions} initialStatus={initialStatus} showTrack={deck.virtual} />
      )}
    </div>
  );
}
