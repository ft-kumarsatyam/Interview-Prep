"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Loader2, Send, Timer } from "lucide-react";
import { toast } from "sonner";
import { saveMockAnswerAction, submitMockAction } from "@/app/(app)/mock/actions";
import { HintReveal } from "@/components/dsa/hint-reveal";
import { CodeWorkspace, type RunnableEntry, type SubmitOutcome } from "@/components/ide/code-workspace";
import { IdeShell } from "@/components/ide/ide-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HintLevel, TestCase } from "@/lib/domain/dsa-runner";
import { MOCK_CONFIG, isBlank, type McqQuestion, type MockQuestion, type MockRound, type MockType, type QuestionAnswer, type WrittenQuestion } from "@/lib/domain/mock";
import { cn } from "@/lib/utils";

export interface CodingBundle {
  entry: RunnableEntry;
  cases: TestCase[];
  hints: HintLevel[];
  statement: React.ReactNode;
}

interface Props {
  id: string;
  type: MockType;
  deadlineAt: string;
  serverNow: number;
  rounds: MockRound[];
  answers: Record<string, QuestionAnswer>;
  coding: Record<string, CodingBundle>;
}

const TEXT_SAVE_MS = 1200;
const nowMs = () => Date.now();

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

function answered(q: MockQuestion, a: QuestionAnswer | undefined): boolean {
  if (q.kind === "coding") return !!a?.total;
  if (q.kind === "mcq") return a?.choice !== undefined;
  return !isBlank(a);
}

export function MockRunner({ id, type, deadlineAt, serverNow, rounds, answers: initialAnswers, coding }: Props) {
  const router = useRouter();
  const flat = rounds.flatMap((r, ri) => r.questions.map((q) => ({ round: r, ri, q })));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useRef(new Map<string, QuestionAnswer>());
  const inflight = useRef(new Set<Promise<unknown>>());
  const spent = useRef(new Map<string, number>(Object.entries(initialAnswers).map(([k, v]) => [k, v.msSpent ?? 0])));
  const shownAt = useRef(0);
  const submitted = useRef(false);

  const current = flat[index]!;

  const send = useCallback(
    (qid: string) => {
      const patch = queued.current.get(qid);
      if (!patch) return;
      queued.current.delete(qid);
      const p = saveMockAnswerAction({ id, qid, patch }).then((res) => {
        if (!res.ok && !submitted.current) toast.error(`Not saved: ${res.error}`);
      });
      inflight.current.add(p);
      void p.finally(() => inflight.current.delete(p));
    },
    [id],
  );

  const save = useCallback(
    (qid: string, patch: QuestionAnswer, delay = 0) => {
      setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...patch, ...(patch.sections ? { sections: { ...a[qid]?.sections, ...patch.sections } } : {}) } }));
      const prev = queued.current.get(qid);
      queued.current.set(qid, { ...prev, ...patch, ...(patch.sections ? { sections: { ...prev?.sections, ...patch.sections } } : {}) });
      clearTimeout(timers.current.get(qid));
      if (delay) timers.current.set(qid, setTimeout(() => send(qid), delay));
      else send(qid);
    },
    [send],
  );

  const flush = useCallback(async () => {
    for (const t of timers.current.values()) clearTimeout(t);
    for (const qid of [...queued.current.keys()]) send(qid);
    await Promise.allSettled([...inflight.current]);
  }, [send]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      await flush();
      const res = await submitMockAction(id);
      if (!res.ok) {
        submitted.current = false;
        setSubmitting(false);
        return void toast.error(res.error);
      }
      if (auto) toast.info("Time's up. Your answers were submitted.");
      router.push(`/mock/${id}/report`);
    },
    [flush, id, router],
  );

  useEffect(() => {
    const offset = serverNow - Date.now();
    const deadline = new Date(deadlineAt).getTime();
    const tick = () => {
      const left = deadline - (Date.now() + offset);
      setRemaining(left);
      if (left <= 0) void doSubmit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadlineAt, serverNow, doSubmit]);

  useEffect(() => {
    shownAt.current = nowMs();
    const qid = current.q.id;
    const totals = spent.current;
    return () => {
      totals.set(qid, (totals.get(qid) ?? 0) + (nowMs() - shownAt.current));
    };
  }, [current.q.id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (queued.current.size || inflight.current.size) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const msOn = (qid: string) => (spent.current.get(qid) ?? 0) + (qid === current.q.id && shownAt.current ? nowMs() - shownAt.current : 0);
  const low = remaining !== null && remaining < 5 * 60_000;
  const unanswered = flat.filter((f) => !answered(f.q, answers[f.q.id])).length;

  return (
    <div className="space-y-3">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{MOCK_CONFIG[type].label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {current.round.title} · suggested {current.round.minutes} min
          </p>
        </div>
        <ol className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:justify-center" aria-label="Questions">
          {flat.map((f, i) => (
            <li key={f.q.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}, ${f.round.title}${answered(f.q, answers[f.q.id]) ? ", answered" : ""}`}
                className={cn(
                  "grid size-8 place-items-center rounded-md border text-xs font-medium tabular transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  i === index ? "border-primary bg-primary text-primary-foreground" : answered(f.q, answers[f.q.id]) ? "border-success/50 bg-success/10 text-foreground" : "hover:bg-muted",
                  i > 0 && f.ri !== flat[i - 1]!.ri && "ml-2",
                )}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn("inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 font-mono text-sm tabular", low ? "border-destructive/50 bg-destructive/10 text-destructive" : "bg-card")}
            role="timer"
            aria-live={low ? "polite" : "off"}
            aria-label={remaining === null ? "Time left" : `Time left ${clock(remaining)}`}
          >
            <Timer className="size-4" aria-hidden />
            {remaining === null ? "--:--" : clock(remaining)}
          </span>
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Send />}
            <span className="hidden sm:inline">Submit interview</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        </div>
      </div>

      <div key={current.q.id}>
        {current.q.kind === "coding" ? (
          <CodingStep
            mockId={id}
            q={current.q}
            bundle={coding[current.q.id]}
            answer={answers[current.q.id]}
            onCode={(code, language) => save(current.q.id, { code, language, msSpent: msOn(current.q.id) }, 2500)}
            onHints={(n) => save(current.q.id, { hintsUsed: n })}
            onSubmit={(out) => {
              const accepted = out.summary.allPassed && !out.timedOut && !out.crashed;
              save(current.q.id, { code: out.code, language: out.language, passed: out.crashed ? 0 : out.summary.passed, total: out.summary.total, accepted, msSpent: msOn(current.q.id) });
              if (accepted) toast.success(`All ${out.summary.total} tests passed`);
              else toast.error(out.crashed ? out.crashed.split("\n")[0] : `${out.summary.passed}/${out.summary.total} tests passed`);
            }}
          />
        ) : current.q.kind === "mcq" ? (
          <McqStep q={current.q} choice={answers[current.q.id]?.choice} onChoose={(choice) => save(current.q.id, { choice })} />
        ) : (
          <WrittenStep q={current.q} sections={answers[current.q.id]?.sections ?? {}} onChange={(sid, text) => save(current.q.id, { sections: { [sid]: text } }, TEXT_SAVE_MS)} />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pb-4">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft /> Previous
        </Button>
        <span className="text-xs text-muted-foreground tabular">
          {index + 1} / {flat.length}
        </span>
        <Button variant="outline" onClick={() => setIndex((i) => Math.min(flat.length - 1, i + 1))} disabled={index === flat.length - 1}>
          Next <ChevronRight />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit the interview?</DialogTitle>
            <DialogDescription>
              {unanswered ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} still unanswered and will score 0. ` : ""}
              You can&apos;t change answers after submitting. Written answers are graded on the next page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                void doSubmit(false);
              }}
            >
              <Send /> Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CodingStep({
  mockId,
  q,
  bundle,
  answer,
  onCode,
  onHints,
  onSubmit,
}: {
  mockId: string;
  q: Extract<MockQuestion, { kind: "coding" }>;
  bundle: CodingBundle | undefined;
  answer: QuestionAnswer | undefined;
  onCode: (code: string, language: NonNullable<QuestionAnswer["language"]>) => void;
  onHints: (n: number) => void;
  onSubmit: (out: SubmitOutcome) => void;
}) {
  const seen = useRef(answer?.code);
  if (!bundle) return <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">This problem is no longer available. Move on to the next question.</p>;
  const statement = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{q.title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{q.difficulty}</span>
      </div>
      {bundle.statement}
      {bundle.hints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Each hint costs 5 points on this question.</p>
          <HintReveal hints={bundle.hints} initialRevealed={answer?.hintsUsed ?? 0} onReveal={onHints} />
        </div>
      )}
      {answer?.total ? (
        <p className={cn("text-sm", answer.accepted ? "text-success" : "text-muted-foreground")}>
          Last submit: {answer.passed}/{answer.total} tests passed
        </p>
      ) : null}
    </div>
  );
  return (
    <IdeShell
      storageId="mock"
      className="md:h-[calc(100dvh-18rem-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-12.5rem)]"
      panes={[{ id: "problem", label: "Problem", icon: FileText, content: statement }]}
      workspace={
        <CodeWorkspace
          draftKey={`mock:${mockId}:${q.id}`}
          title={q.title}
          entry={bundle.entry}
          cases={bundle.cases}
          submitLabel="Submit answer"
          initial={answer?.code && answer.language ? { language: answer.language, code: answer.code } : undefined}
          onCodeChange={(code, language) => {
            if (code === seen.current) return;
            seen.current = code;
            onCode(code, language);
          }}
          onSubmit={onSubmit}
        />
      }
    />
  );
}

function McqStep({ q, choice, onChoose }: { q: McqQuestion; choice: number | undefined; onChoose: (i: number) => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4 rounded-xl border bg-card p-4 sm:p-6">
      <p className="font-medium">{q.prompt}</p>
      {q.code && <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-sm leading-relaxed">{q.code}</pre>}
      <div role="radiogroup" aria-label="Answer" className="grid gap-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={choice === i}
            onClick={() => onChoose(i)}
            className={cn(
              "flex min-h-11 items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              choice === i ? "border-primary bg-primary/10" : "hover:bg-muted/50",
            )}
          >
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-2xs font-semibold", choice === i && "border-primary bg-primary text-primary-foreground")}>{String.fromCharCode(65 + i)}</span>
            <span className="font-mono text-sm whitespace-pre-wrap">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WrittenStep({ q, sections, onChange }: { q: WrittenQuestion; sections: Record<string, string>; onChange: (sectionId: string, text: string) => void }) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-6">
        <p className="text-base font-medium text-pretty">{q.prompt}</p>
        {q.context && <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 font-sans text-sm whitespace-pre-wrap text-muted-foreground">{q.context}</pre>}
      </div>
      {q.sections.map((s) => (
        <div key={s.id} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`${q.id}-${s.id}`} className="text-sm font-medium">
              {s.label}
            </label>
            {s.minutes ? <span className="text-xs text-muted-foreground tabular">~{s.minutes} min</span> : null}
          </div>
          {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
          <textarea
            id={`${q.id}-${s.id}`}
            defaultValue={sections[s.id] ?? ""}
            onChange={(e) => onChange(s.id, e.target.value)}
            rows={q.sections.length === 1 ? 14 : s.code ? 10 : 6}
            maxLength={20_000}
            spellCheck={!s.code}
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              s.code && "font-mono text-xs",
            )}
          />
        </div>
      ))}
    </div>
  );
}
