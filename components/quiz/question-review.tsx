import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, Check, CircleSlash, Code2, ExternalLink, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { playgroundHref } from "@/lib/playground/share";
import { cn } from "@/lib/utils";
import { QuestionAiTools } from "./question-ai-tools";

export interface QuestionReviewProps {
  number: number;
  prompt: string;
  code?: string;
  options: readonly string[];
  multi: boolean;
  /** Original option indices you picked; empty when skipped. */
  chosen: readonly number[];
  correct: readonly number[];
  right: boolean;
  explanation?: string;
  subject?: string;
  learnMore?: { href: string; label: string; reading?: { url: string; title: string } };
}

/** One graded question: your answer vs the correct one, the explanation and help for misses. */
export function QuestionReview({ number, prompt, code, options, multi, chosen, correct, right, explanation, subject, learnMore }: QuestionReviewProps) {
  const skipped = chosen.length === 0;
  const status = right ? "Correct" : skipped ? "Skipped" : "Wrong";
  const StatusIcon = right ? Check : skipped ? CircleSlash : X;
  return (
    <Card className={cn("border-l-4", right ? "border-l-success" : skipped ? "border-l-warning" : "border-l-destructive")}>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full",
              right ? "bg-success/15 text-success" : skipped ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive",
            )}
          >
            <StatusIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Question {number} · <span className={cn(right ? "text-success" : skipped ? "text-warning" : "text-destructive")}>{status}</span>
            </p>
            <p className="mt-0.5 font-medium break-words">{prompt}</p>
          </div>
        </div>
        {code && <QuizCode code={code} />}
        <div className="grid gap-2">
          {!right && (
            <AnswerBox tone={skipped ? "warning" : "destructive"} label={multi ? "Your answers" : "Your answer"}>
              <AnswerText options={options} indices={chosen} code={!!code} />
            </AnswerBox>
          )}
          <AnswerBox tone="success" label={multi ? "Correct answers" : "Correct answer"}>
            <AnswerText options={options} indices={correct} code={!!code} />
          </AnswerBox>
        </div>
        {explanation && <p className="leading-relaxed text-muted-foreground">{explanation}</p>}
        {(learnMore || (!right && code)) && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {learnMore && (
              <Link href={learnMore.href} className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline">
                <BookOpen className="size-3.5" /> Learn more: {learnMore.label}
              </Link>
            )}
            {learnMore?.reading && (
              <a href={learnMore.reading.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline">
                <ExternalLink className="size-3.5" /> {learnMore.reading.title}
              </a>
            )}
            {!right && code && (
              <Link href={playgroundHref(code)} className="inline-flex min-h-6 items-center gap-1 text-primary hover:underline">
                <Code2 className="size-3.5" /> Run it in the Playground
              </Link>
            )}
          </p>
        )}
        {!right && (
          <QuestionAiTools subject={subject} question={{ prompt, code, options, chosen, correct, explanation }} />
        )}
      </CardContent>
    </Card>
  );
}

const TONES = {
  success: "border-success/30 bg-success/5",
  destructive: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/30 bg-warning/5",
} as const;

function AnswerBox({ tone, label, children }: { tone: keyof typeof TONES; label: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", TONES[tone])}>
      <p className="mb-0.5 text-2xs font-medium tracking-wide text-muted-foreground uppercase">{label}:</p>
      {children}
    </div>
  );
}

function AnswerText({ options, indices, code }: { options: readonly string[]; indices: readonly number[]; code: boolean }) {
  if (indices.length === 0) return <OptionText code={false}>(skipped) counted as wrong</OptionText>;
  if (indices.length === 1) return <OptionText code={code}>{options[indices[0]]}</OptionText>;
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {indices.map((i) => (
        <li key={i}>
          <OptionText code={code}>{options[i]}</OptionText>
        </li>
      ))}
    </ul>
  );
}

export function QuizCode({ code }: { code: string }) {
  return <pre className="max-w-full overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">{code}</pre>;
}

export function OptionText({ code, children }: { code: boolean; children: ReactNode }) {
  return <span className={cn("min-w-0 break-words", code && "font-mono text-xs whitespace-pre-wrap")}>{children}</span>;
}
