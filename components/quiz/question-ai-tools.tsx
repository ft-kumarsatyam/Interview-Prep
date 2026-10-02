"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { allowPaidTodayAction, explainAnswerAction } from "@/app/(app)/ai/actions";
import { AskGemini } from "@/components/ai/ask-gemini";
import { useAi } from "@/components/ai/ai-context";
import { PaidFallbackNotice } from "@/components/ai/paid-fallback-notice";
import { Button } from "@/components/ui/button";
import { quizPrompt } from "@/lib/domain/ask-prompt";
import type { ExplainResult } from "@/lib/services/ai-explain";
import { isAskSubject, type AskSubject } from "@/lib/domain/ask-subjects";

export interface QuestionForAi {
  prompt: string;
  code?: string;
  options: readonly string[];
  /** Option indices you picked (empty when skipped). */
  chosen: readonly number[];
  correct: readonly number[];
  explanation?: string;
}

/** "Ask Gemini" always; "Explain my mistake" when an AI provider is configured. The explanation is plain text, never HTML. */
export function QuestionAiTools({ question, subject }: { question: QuestionForAi; subject?: string }) {
  const { aiAvailable } = useAi();
  const askSubject: AskSubject = subject && isAskSubject(subject) ? subject : "general";
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [pending, start] = useTransition();

  const send = (paidOnce = false) =>
    start(async () => {
      setResult(
        await explainAnswerAction(
          { prompt: question.prompt, code: question.code, options: [...question.options], chosen: [...question.chosen], correct: [...question.correct], explanation: question.explanation },
          paidOnce ? { paidOnce: true } : undefined,
        ),
      );
    });

  const allowToday = () =>
    start(async () => {
      await allowPaidTodayAction();
      setResult(
        await explainAnswerAction({ prompt: question.prompt, code: question.code, options: [...question.options], chosen: [...question.chosen], correct: [...question.correct], explanation: question.explanation }),
      );
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {aiAvailable && (
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => send()}>
            <Sparkles /> {pending ? "Thinking…" : result?.ok ? "Explain again" : "Explain my mistake"}
          </Button>
        )}
        <AskGemini subject={askSubject} prompt={() => quizPrompt(question)} variant="outline" />
      </div>

      {result && !result.ok && result.needsPaid && (
        <PaidFallbackNotice used={result.needsPaid.used} cap={result.needsPaid.cap} busy={pending} onUseOnce={() => send(true)} onAllowToday={allowToday} onCancel={() => setResult(null)} />
      )}
      {result && !result.ok && !result.needsPaid && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs" role="status">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm" role="status">
          <p className="whitespace-pre-line">{result.explanation.explanation}</p>
          {result.explanation.whyYourAnswerWasWrong && (
            <p className="whitespace-pre-line text-muted-foreground">
              <span className="font-medium text-foreground">Why it was tempting: </span>
              {result.explanation.whyYourAnswerWasWrong}
            </p>
          )}
          {result.explanation.remember && (
            <p className="font-medium">
              <span className="text-muted-foreground">Remember: </span>
              {result.explanation.remember}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{result.cached ? "Saved explanation" : `Written by ${result.provider ?? "AI"}`}. AI can be wrong: check anything that surprises you.</p>
        </div>
      )}
    </div>
  );
}
