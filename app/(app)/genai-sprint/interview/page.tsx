import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion, Timer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { genaiPrepQuestions } from "@/core/genai-prep-pack";

export const metadata: Metadata = { title: "GenAI sprint · Interview" };

export default function GenaiSprintInterviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={MessageCircleQuestion}
        title="Interview drills"
        description="Weekly question sets from the pack. Practice with flashcards or a timed mock."
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/web/interview/genai-sprint">Open flashcard deck</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/mock">
            <Timer className="size-4" aria-hidden />
            Mock interviews
          </Link>
        </Button>
      </div>
      {genaiPrepQuestions.groups.map((g) => (
        <section key={g.id} className="space-y-2">
          <h2 className="text-base font-semibold">{g.id.replace(/-/g, " ")}</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {g.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </section>
      ))}
      {genaiPrepQuestions.model_answer_outlines.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Model answer outlines</h2>
          {genaiPrepQuestions.model_answer_outlines.map((o) => (
            <details key={o.question} className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">{o.question}</summary>
              <p className="mt-2 text-muted-foreground">{o.outline}</p>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
