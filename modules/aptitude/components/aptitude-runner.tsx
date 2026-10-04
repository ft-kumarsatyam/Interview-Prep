"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Gauge, Play, RotateCcw, SkipForward, Target, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { saveAptitudeSession } from "@/app/(app)/aptitude/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AptitudeQuestion } from "@/modules/aptitude/domain/aptitude";
import { summarizeRun, type RunAnswer } from "@/modules/aptitude/domain/aptitude/progress";
import { cn } from "@/core/utils";

export interface TopicMeta {
  title: string;
  targetSec: number;
}

interface RunnerProps {
  questions: AptitudeQuestion[];
  mode: "topic" | "mock";
  topics: Record<string, TopicMeta>;
  /** Mock only: overall time limit in seconds. */
  timeLimitSec?: number;
  /** Where "Try a new set" goes. */
  nextHref: string;
  backHref: string;
  heading: string;
}

const LETTERS = ["A", "B", "C", "D"];
/** A question left open longer than this is capped so a forgotten tab doesn't skew the average. */
const MAX_MS = 5 * 60_000;

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/**
 * Speed-first practice: one question per screen with a live timer against the
 * topic's target. Drills reveal the explanation after each answer; mocks stay
 * silent until the end, like the real test.
 */
export function AptitudeRunner({ questions: initialQuestions, mode, topics, timeLimitSec, nextHref, backHref, heading }: RunnerProps) {
  const router = useRouter();
  // Saving refreshes the page, and drills rotate by history, so the server would hand back a new set: keep this one.
  const [questions] = useState(initialQuestions);
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [pos, setPos] = useState(0);
  const [answers, setAnswers] = useState<RunAnswer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [shownAt, setShownAt] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const answersRef = useRef<RunAnswer[]>([]);
  const finishing = useRef(false);

  const q = questions[pos];
  const meta = q ? topics[q.topic] : undefined;
  const target = meta?.targetSec ?? 40;
  const elapsedSec = phase === "running" ? Math.max(0, (now - shownAt) / 1000) : 0;
  const remainingSec = timeLimitSec ? Math.max(0, timeLimitSec - (now - startedAt) / 1000) : null;

  const finish = useCallback(
    async (final: RunAnswer[]) => {
      if (finishing.current) return;
      finishing.current = true;
      const filled: RunAnswer[] = [
        ...final,
        ...questions.slice(final.length).map((x) => ({ topic: x.topic, key: x.key, choice: null, answerIndex: x.answerIndex, ms: 0 })),
      ];
      setAnswers(filled);
      setPhase("done");
      setSaveState("saving");
      const given = filled.filter((a) => a.choice !== null);
      if (given.length === 0) {
        setSaveState("idle");
        return;
      }
      const res = await saveAptitudeSession({
        mode,
        results: given.map((a) => ({ topic: a.topic, correct: a.choice === a.answerIndex, ms: Math.round(a.ms), ...(a.key ? { key: a.key } : {}) })),
      });
      if (res.ok) setSaveState("saved");
      else {
        setSaveState("failed");
        toast.error(res.error);
      }
    },
    [mode, questions],
  );

  // One ticker drives both the question timer and the mock's overall clock; when it runs out, whatever was answered is submitted.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (timeLimitSec && t - startedAt >= timeLimitSec * 1000) void finish(answersRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [phase, startedAt, timeLimitSec, finish]);

  const start = () => {
    const t = Date.now();
    setStartedAt(t);
    setShownAt(t);
    setNow(t);
    setPhase("running");
  };

  const advance = useCallback(
    (next: RunAnswer[]) => {
      answersRef.current = next;
      setAnswers(next);
      setPicked(null);
      if (pos + 1 >= questions.length) {
        void finish(next);
        return;
      }
      const t = Date.now();
      setPos(pos + 1);
      setShownAt(t);
      setNow(t);
    },
    [finish, pos, questions.length],
  );

  const choose = useCallback(
    (index: number | null) => {
      if (phase !== "running" || picked !== null || !q) return;
      const ms = Math.min(MAX_MS, Date.now() - shownAt);
      const entry: RunAnswer = { topic: q.topic, key: q.key, choice: index, answerIndex: q.answerIndex, ms };
      if (mode === "mock" || index === null) {
        advance([...answers, entry]);
        return;
      }
      answersRef.current = [...answers, entry];
      setAnswers(answersRef.current);
      setPicked(index);
    },
    [advance, answers, mode, phase, picked, q, shownAt],
  );

  const next = useCallback(() => {
    if (picked === null) return;
    advance(answers);
  }, [advance, answers, picked]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (e.key === "Enter" && picked !== null) next();
      else if (e.key === "s" && picked === null && mode === "mock") choose(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, mode, next, phase, picked]);

  const summary = useMemo(() => (phase === "done" ? summarizeRun(answers) : null), [answers, phase]);

  if (phase === "intro") {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {questions.length} questions
              {timeLimitSec ? `, ${Math.round(timeLimitSec / 60)} minutes in total, no feedback until the end` : `, with the explanation after every answer`}. Beat the per-question
              target: speed counts as much as accuracy.
            </p>
          </div>
          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Gauge className="size-4 text-primary" aria-hidden /> A timer runs on every question; it turns amber past the target.</li>
            <li className="flex items-center gap-2"><Target className="size-4 text-primary" aria-hidden /> Keys 1–4 pick an option{mode === "mock" ? ", S skips" : ", Enter moves on"}.</li>
          </ul>
          <Button size="lg" onClick={start} autoFocus>
            <Play /> Start
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "done" && summary) {
    const passed = summary.accuracy >= 0.8;
    return (
      <div className="flex flex-col gap-4">
        <Card className={cn(passed && "bg-success/5 ring-success/30")}>
          <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={cn("flex items-center gap-2 text-2xl font-semibold", passed && "text-success")}>
                  {passed && <Trophy className="size-6" aria-hidden />}
                  {summary.correct} / {summary.total} correct
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Math.round(summary.accuracy * 100)}% accuracy · {summary.avgSec.toFixed(0)} s per question · {summary.withinTarget} correct within target
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push(nextHref)}>
                  <RotateCcw /> Try a new set
                </Button>
                <Button variant="outline" asChild>
                  <Link href={backHref}>Back</Link>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {saveState === "saving" && "Saving your result…"}
              {saveState === "saved" && "Saved to your progress."}
              {saveState === "failed" && "Could not save this result."}
            </p>
            {mode === "mock" && summary.perTopic.length > 1 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Weakest topics first</h3>
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {summary.perTopic.slice(0, 6).map((t) => (
                    <li key={t.topic} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5">
                      <span className="min-w-0 truncate">{topics[t.topic]?.title ?? t.topic}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{t.correct}/{t.total} · {t.avgSec.toFixed(0)}s</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <h3 className="text-sm font-semibold">Review</h3>
        <ol className="flex flex-col gap-3">
          {questions.map((question, i) => {
            const a = answers[i];
            const ok = a?.choice !== null && a?.choice === question.answerIndex;
            const t = topics[question.topic]?.targetSec ?? 40;
            return (
              <li key={question.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-medium whitespace-pre-line">
                        <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                        {question.prompt}
                      </p>
                      <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", ok ? "text-success" : "text-destructive")}>
                        {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                        {a?.choice === null ? "Skipped" : ok ? "Correct" : "Wrong"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {mode === "mock" && <>{topics[question.topic]?.title} · </>}
                      <span className={cn(a && a.ms > t * 1000 && "text-warning")}>{a ? (a.ms / 1000).toFixed(0) : 0}s</span> (target {t}s)
                      {a?.choice !== null && !ok && a && <> · You chose {LETTERS[a.choice ?? 0]}: {question.options[a.choice ?? 0]}</>}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-success">Answer {LETTERS[question.answerIndex]}: {question.options[question.answerIndex]}</span>{" "}
                      <span className="text-muted-foreground">{question.explanation}</span>
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (!q) return null;
  const over = elapsedSec > target;
  const near = elapsedSec > target * 0.7;
  const barPct = Math.min(100, (elapsedSec / target) * 100);
  const revealed = picked !== null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium tabular-nums">
          {pos + 1} / {questions.length}
        </span>
        {mode === "mock" && meta && <span className="min-w-0 truncate text-xs text-muted-foreground">{meta.title}</span>}
        {remainingSec !== null && (
          <span className={cn("flex items-center gap-1 tabular-nums", remainingSec < 60 ? "text-destructive" : "text-muted-foreground")}>
            <Clock className="size-3.5" aria-hidden /> {clock(remainingSec)}
          </span>
        )}
      </div>
      <Progress value={((pos + (revealed ? 1 : 0)) / questions.length) * 100} aria-label="Progress" />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="presentation">
              <div
                className={cn("h-full rounded-full transition-[width] duration-200", over ? "bg-destructive" : near ? "bg-warning" : "bg-success")}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <span className={cn("w-16 shrink-0 text-right text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
              {elapsedSec.toFixed(0)}s / {target}s
            </span>
          </div>

          <p className="text-base leading-relaxed font-medium whitespace-pre-line sm:text-lg">{q.prompt}</p>

          <div className="grid gap-2" role="group" aria-label="Options">
            {q.options.map((option, i) => {
              const isAnswer = i === q.answerIndex;
              const isPicked = i === picked;
              return (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  disabled={revealed}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-base",
                    !revealed && "hover:border-primary/50 hover:bg-primary/5",
                    revealed && isAnswer && "border-success/60 bg-success/10",
                    revealed && isPicked && !isAnswer && "border-destructive/60 bg-destructive/10",
                    revealed && !isAnswer && !isPicked && "opacity-60",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">{LETTERS[i]}</span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {revealed && isAnswer && <Check className="size-4 shrink-0 text-success" aria-hidden />}
                  {revealed && isPicked && !isAnswer && <X className="size-4 shrink-0 text-destructive" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div aria-live="polite">
            {revealed && (
              <div className="rounded-xl bg-muted/60 p-3 text-sm">
                <p className="mb-1 flex flex-wrap items-center gap-x-2 font-medium">
                  {picked === q.answerIndex ? <span className="text-success">Correct</span> : <span className="text-destructive">Not quite</span>}
                  <span className="text-xs font-normal text-muted-foreground">
                    {(answers[answers.length - 1]?.ms / 1000).toFixed(0)}s · target {target}s
                  </span>
                </p>
                <p className="text-muted-foreground">{q.explanation}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {mode === "mock" ? (
              <Button variant="ghost" size="sm" onClick={() => choose(null)}>
                <SkipForward /> Skip
              </Button>
            ) : (
              <span />
            )}
            {revealed && (
              <Button onClick={next} autoFocus>
                {pos + 1 >= questions.length ? "Finish" : "Next"} <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
