import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubtopicChecklist } from "@/modules/progress/components/subtopic-checklist";
import type { PlanSubtopic } from "@/modules/progress/services/dashboard";

/** Today's theory subtopics with their checklist. */
export function TheoryCard({ theory, target }: { theory: PlanSubtopic[]; target: number }) {
  return (
    <Card id="theory" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Today&apos;s theory</CardTitle>
        <CardDescription>{target > 0 ? `${target} subtopic${target === 1 ? "" : "s"} due. Notes live in Learn.` : "Nothing due today."}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/learn">
              Learn <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <SubtopicChecklist items={theory.map((t) => ({ id: t.id, title: t.title, done: t.done, meta: t.topicTitle }))} />
      </CardContent>
    </Card>
  );
}
