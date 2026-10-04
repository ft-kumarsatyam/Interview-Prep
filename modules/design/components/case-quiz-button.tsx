import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseKind } from "@/modules/design/domain/case-quiz";
import { caseRef } from "@/modules/design/domain/case-quiz";
import { caseQuestionCount } from "@/modules/quiz/lib/case-bank";

/** Opens the quiz for this case. Renders nothing until the case has questions. */
export function CaseQuizButton({ kind, slug, mastery }: { kind: CaseKind; slug: string; mastery?: { bestPct: number; attempts: number } }) {
  const ref = caseRef(kind, slug);
  const count = caseQuestionCount(ref);
  if (count === 0) return null;
  return (
    <Button asChild size="sm">
      <Link href={`/learn/practice?ref=${encodeURIComponent(ref)}`}>
        <ListChecks /> Case quiz
        <span className="text-xs font-normal opacity-80">{mastery?.attempts ? `best ${mastery.bestPct}%` : `${count} questions`}</span>
      </Link>
    </Button>
  );
}
