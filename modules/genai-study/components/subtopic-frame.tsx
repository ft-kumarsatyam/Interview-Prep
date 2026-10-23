"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, Eye, EyeOff, FlaskConical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { setStudyStatusAction } from "@/app/(app)/roadmaps/[roadmapId]/[nodeId]/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { QUESTION_KIND_LABEL, type QuestionKind, type StudyStatus } from "@/modules/genai-study/domain/study";

const STATUS_LABEL: Record<StudyStatus, string> = { new: "New", review: "Review again", known: "Got it" };
const STATUS_TONE = { new: "neutral", review: "warning", known: "success" } as const;

/** Island: status and reveal toggles. Markdown arrives as server children. */
export function SubtopicFrame({
  roadmapId,
  nodeId,
  itemKey,
  title,
  detail,
  initialStatus,
  questions,
  keyPoints,
  lab,
  links,
  explain,
  answers,
}: {
  roadmapId: string;
  nodeId: string;
  itemKey: string;
  title: string;
  detail: string;
  initialStatus: StudyStatus;
  questions: Array<{ q: string; kind: QuestionKind }>;
  keyPoints: string[];
  lab?: string;
  links: Array<{ title: string; url: string }>;
  explain: ReactNode;
  answers: ReactNode[];
}) {
  const [status, setStatus] = useState<StudyStatus>(initialStatus);
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set());
  const [, start] = useTransition();

  const rate = (next: StudyStatus) => {
    const prev = status;
    setStatus(next);
    start(async () => {
      const res = await setStudyStatusAction({ roadmapId, nodeId, key: itemKey, status: next });
      if (!res.ok) {
        setStatus(prev);
        toast.error(`${res.error}.`);
      }
    });
  };
  const toggle = (i: number) =>
    setShown((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <li id={`sub-${itemKey}`} className="scroll-mt-20">
      <details name="study-notes" className="group rounded-xl border bg-card ring-1 ring-foreground/5 open:shadow-sm">
        <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${status === "known" ? "border-success bg-success text-white" : ""}`}>
            {status === "known" && <Check className="size-3" aria-label="Got it" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{title}</span>
              {status !== "new" && <ToneBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</ToneBadge>}
            </span>
            {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <div className="space-y-4 border-t p-3 sm:p-4">
          <div className="min-w-0 rounded-lg bg-muted/40 p-3 sm:p-4">{explain}</div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Remember</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {keyPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Check yourself</h3>
            <ol className="space-y-2">
              {questions.map((q, i) => (
                <li key={q.q} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <ToneBadge tone="info">{QUESTION_KIND_LABEL[q.kind]}</ToneBadge>
                    <p className="min-w-0 flex-1 text-sm font-medium">{q.q}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => toggle(i)} aria-expanded={shown.has(i)}>
                      {shown.has(i) ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                      {shown.has(i) ? "Hide" : "Answer"}
                    </Button>
                  </div>
                  {shown.has(i) && <div className="mt-2 min-w-0 rounded-md bg-muted/40 p-3 text-sm">{answers[i]}</div>}
                </li>
              ))}
            </ol>
          </div>
          {(lab || links.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {lab && (
                <Link href={`/genai-lab/${lab}`} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline">
                  <FlaskConical className="size-4" aria-hidden /> Practise in the lab
                </Link>
              )}
              {links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center text-primary underline-offset-2 hover:underline">
                  {l.title}
                </a>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={status === "known" ? "default" : "outline"} onClick={() => rate("known")}>
              <Check className="size-4" aria-hidden /> Got it
            </Button>
            <Button type="button" size="sm" variant={status === "review" ? "default" : "outline"} onClick={() => rate("review")}>
              <RotateCcw className="size-4" aria-hidden /> Review again
            </Button>
            {status !== "new" && (
              <Button type="button" size="sm" variant="ghost" onClick={() => rate("new")}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}
