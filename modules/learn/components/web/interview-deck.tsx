"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronRight, Eye, EyeOff, Layers, ListChecks, RotateCcw, Search, Shuffle, Timer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { setInterviewStatusAction } from "@/app/(app)/web/actions";
import { ArticleMarkdown } from "@/modules/news/components/article-markdown";
import { Chip } from "@/components/shared/chip";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineCode } from "@/components/shared/inline-code";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { INTERVIEW_LEVELS, filterQuestions, interviewStats, practiceOrder, type InterviewLevel, type InterviewStatus } from "@/modules/learn/domain/web-interview";

export interface DeckQuestion {
  id: string;
  level: InterviewLevel;
  q: string;
  answer: string;
  followUps: string[];
  mistakes: string[];
  trackName: string;
  /** Written by the model on request rather than by hand. */
  generated?: boolean;
  lesson?: { id: string; title: string };
}

const LEVEL_TONE = { junior: "success", mid: "info", senior: "warning" } as const;
const STATUS_LABEL: Record<InterviewStatus, string> = { new: "New", review: "Review", known: "Got it" };

function useStatus(initial: Record<string, InterviewStatus>) {
  const [status, setStatus] = useState(() => new Map(Object.entries(initial)));
  const [, start] = useTransition();
  const rate = (qid: string, next: InterviewStatus) => {
    const prev = status.get(qid) ?? "new";
    setStatus((m) => new Map(m).set(qid, next));
    start(async () => {
      const res = await setInterviewStatusAction({ qid, status: next });
      if (!res.ok) {
        setStatus((m) => new Map(m).set(qid, prev));
        toast.error(`${res.error}.`);
      }
    });
  };
  return { status, rate };
}

function AnswerBody({ q }: { q: DeckQuestion }) {
  return (
    <div className="space-y-3">
      <div className="min-w-0 rounded-lg bg-muted/40 p-3 sm:p-4">
        <ArticleMarkdown markdown={q.answer} />
      </div>
      {q.mistakes.length > 0 && (
        <div className="rounded-lg bg-warning/5 p-3 ring-1 ring-warning/20">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warning">
            <TriangleAlert className="size-3.5" aria-hidden /> Weak answers miss
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {q.mistakes.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {q.followUps.length > 0 && (
        <div className="rounded-lg p-3 ring-1 ring-foreground/10">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Likely follow-ups</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {q.followUps.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {q.lesson && (
        <Link href={`/web/${q.lesson.id}`} className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline">
          <BookOpen className="size-3.5" aria-hidden /> Lesson: {q.lesson.title}
        </Link>
      )}
    </div>
  );
}

function RateButtons({ current, onRate, size = "sm" }: { current: InterviewStatus; onRate: (s: InterviewStatus) => void; size?: "sm" | "default" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size={size} variant={current === "review" ? "default" : "outline"} onClick={() => onRate("review")}>
        <RotateCcw className="size-4" aria-hidden /> Review again
      </Button>
      <Button size={size} variant={current === "known" ? "default" : "outline"} onClick={() => onRate("known")}>
        <Check className="size-4" aria-hidden /> Got it
      </Button>
      {current !== "new" && (
        <Button size={size} variant="ghost" onClick={() => onRate("new")}>
          Reset
        </Button>
      )}
    </div>
  );
}

/** Browse a track's questions with answers, or practise them one at a time like flashcards. */
export function InterviewDeck({ questions, initialStatus, showTrack = false }: { questions: DeckQuestion[]; initialStatus: Record<string, InterviewStatus>; showTrack?: boolean }) {
  const { status, rate } = useStatus(initialStatus);
  const [mode, setMode] = useState<"browse" | "practice">("browse");
  const [level, setLevel] = useState<InterviewLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const filtered = useMemo(() => filterQuestions(questions, status, { level, status: statusFilter, search }), [questions, status, level, statusFilter, search]);
  const stats = interviewStats(questions, status);
  const allOpen = filtered.length > 0 && filtered.every((q) => open.has(q.id));
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const [round, setRound] = useState<string[]>([]);
  const [roundSize, setRoundSize] = useState<number | "all">(10);
  const roundCount = roundSize === "all" ? filtered.length : Math.min(roundSize, filtered.length);
  const startPractice = () => {
    setRound(practiceOrder(filtered.map((q) => q.id), status, Math.floor(Math.random() * 2 ** 31)).slice(0, roundCount));
    setMode("practice");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Progress value={stats.pct} aria-label="Questions you know" className="h-2 max-w-xs" />
        <span className="text-xs text-muted-foreground">
          <span className="tabular font-mono">{stats.known}</span> got it · <span className="tabular font-mono">{stats.review}</span> to review · <span className="tabular font-mono">{stats.fresh}</span> new
        </span>
      </div>

      {mode === "practice" ? (
        <Practice key={round.join(",")} ids={round} byId={new Map(questions.map((q) => [q.id, q]))} status={status} rate={rate} showTrack={showTrack} onExit={() => setMode("browse")} onRestart={startPractice} />
      ) : (
        <>
          <div className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions and answers" aria-label="Search questions and answers" className="pl-8" />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
              <Chip pressed={level === "all"} onClick={() => setLevel("all")}>All levels</Chip>
              {INTERVIEW_LEVELS.map((l) => (
                <Chip key={l} pressed={level === l} onClick={() => setLevel(l)} count={questions.filter((q) => q.level === l).length} className="capitalize">
                  {l}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
              <Chip pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Any status</Chip>
              <Chip pressed={statusFilter === "new"} onClick={() => setStatusFilter("new")} count={stats.fresh}>New</Chip>
              <Chip pressed={statusFilter === "review"} onClick={() => setStatusFilter("review")} count={stats.review}>Review</Chip>
              <Chip pressed={statusFilter === "known"} onClick={() => setStatusFilter("known")} count={stats.known}>Got it</Chip>
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Round size">
              <span className="text-xs text-muted-foreground">Round</span>
              {([10, 20, "all"] as const).map((n) => (
                <Chip key={n} pressed={roundSize === n} onClick={() => setRoundSize(n)}>
                  {n === "all" ? "All" : n}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button onClick={startPractice} disabled={!filtered.length}>
                <Shuffle className="size-4" aria-hidden /> Practise {roundCount} {roundCount === 1 ? "question" : "questions"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(allOpen ? new Set() : new Set(filtered.map((q) => q.id)))} disabled={!filtered.length}>
                {allOpen ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />} {allOpen ? "Hide all answers" : "Show all answers"}
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={ListChecks} title="No questions match" compact>
              Clear the search or pick another level or status.
            </EmptyState>
          ) : (
            <ol className="space-y-3">
              {filtered.map((q, i) => {
                const s = status.get(q.id) ?? "new";
                const isOpen = open.has(q.id);
                return (
                  <li key={q.id} className="rounded-xl border bg-card p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="tabular font-mono text-xs text-muted-foreground">{i + 1}.</span>
                      <ToneBadge tone={LEVEL_TONE[q.level]} className="capitalize">{q.level}</ToneBadge>
          {q.generated && <ToneBadge tone="neutral">AI-written</ToneBadge>}
                      {q.generated && <ToneBadge tone="neutral">AI-written</ToneBadge>}
                      {showTrack && <ToneBadge>{q.trackName}</ToneBadge>}
                      {s !== "new" && (
                        <ToneBadge tone={s === "known" ? "success" : "primary"} icon={s === "known" ? Check : RotateCcw}>
                          {STATUS_LABEL[s]}
                        </ToneBadge>
                      )}
                    </div>
                    <button type="button" onClick={() => toggle(q.id)} aria-expanded={isOpen} className="flex w-full items-start justify-between gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                      <span className="text-sm font-semibold sm:text-base">
                        <InlineCode text={q.q} />
                      </span>
                      <ChevronRight className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden />
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-3">
                        <AnswerBody q={q} />
                        <RateButtons current={s} onRate={(next) => rate(q.id, next)} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

/** Seconds a spoken answer should take before it starts to drag. */
const ANSWER_SECONDS = 120;

function useElapsed(running: boolean, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, secs: 0 });
  const secs = state.key === resetKey ? state.secs : 0;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setState((s) => ({ key: resetKey, secs: (s.key === resetKey ? s.secs : 0) + 1 })), 1000);
    return () => clearInterval(t);
  }, [running, resetKey]);
  return secs;
}

const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

function Practice({
  ids,
  byId,
  status,
  rate,
  showTrack,
  onExit,
  onRestart,
}: {
  ids: string[];
  byId: ReadonlyMap<string, DeckQuestion>;
  status: ReadonlyMap<string, InterviewStatus>;
  rate: (qid: string, s: InterviewStatus) => void;
  showTrack: boolean;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [missed, setMissed] = useState<string[]>([]);
  const [known, setKnown] = useState(0);
  const [draft, setDraft] = useState("");
  const [timed, setTimed] = useState(false);
  const q = ids[i] ? byId.get(ids[i]) : undefined;
  const elapsed = useElapsed(timed && !revealed && !!q, q?.id ?? "");

  const answer = (s: "known" | "review") => {
    if (!q) return;
    rate(q.id, s);
    if (s === "known") setKnown((n) => n + 1);
    else setMissed((m) => [...m, q.id]);
    setRevealed(false);
    setDraft("");
    setI((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!q || e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, button, a, [contenteditable]")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && e.key.toLowerCase() === "k") answer("known");
      else if (revealed && e.key.toLowerCase() === "r") answer("review");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) {
    return (
      <section aria-label="Round finished" className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2 text-center">
          <Layers className="mx-auto size-8 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Round finished</h2>
          <p className="text-sm text-muted-foreground">
            {known} got it · {missed.length} to review. Questions marked for review come first next time.
          </p>
        </div>
        {missed.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Go over these again</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {missed.map((id) => {
                const m = byId.get(id);
                return m ? (
                  <li key={id}>
                    <InlineCode text={m.q} />
                    {m.lesson && (
                      <Link href={`/web/${m.lesson.id}`} className="ml-1.5 text-xs text-primary underline-offset-2 hover:underline">
                        Lesson
                      </Link>
                    )}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRestart}>
            <Shuffle className="size-4" aria-hidden /> Another round
          </Button>
          <Button variant="outline" onClick={onExit}>
            Back to the list
          </Button>
        </div>
      </section>
    );
  }

  const s = status.get(q.id) ?? "new";
  const over = timed && elapsed >= ANSWER_SECONDS;
  return (
    <section aria-label="Practice" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          Question <span className="tabular font-mono">{i + 1}</span> of <span className="tabular font-mono">{ids.length}</span>
        </span>
        <span className="flex items-center gap-1">
          <Button variant={timed ? "secondary" : "ghost"} size="sm" onClick={() => setTimed((t) => !t)} aria-pressed={timed}>
            <Timer className="size-4" aria-hidden /> {timed ? <span className={`tabular font-mono ${over ? "text-warning" : ""}`}>{clock(elapsed)}</span> : "Timer"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            End round
          </Button>
        </span>
      </div>
      <Progress value={(100 * i) / ids.length} aria-label="Round progress" className="h-1.5" />
      <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToneBadge tone={LEVEL_TONE[q.level]} className="capitalize">{q.level}</ToneBadge>
          {showTrack && <ToneBadge>{q.trackName}</ToneBadge>}
          {s !== "new" && <ToneBadge tone={s === "known" ? "success" : "primary"}>Last time: {STATUS_LABEL[s]}</ToneBadge>}
        </div>
        <h2 className="text-lg font-semibold text-pretty sm:text-xl">
          <InlineCode text={q.q} />
        </h2>
        {!revealed ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Answer out loud or type it: the one-line answer, then why, then a trade-off or example. Then compare.</p>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your answer (optional, not saved)" aria-label="Your answer" rows={4} className="text-sm" />
            {over && <p className="text-xs text-warning">Past two minutes: in a real interview, land the one-line answer first and offer to go deeper.</p>}
            <Button onClick={() => setRevealed(true)}>
              <Eye className="size-4" aria-hidden /> Show model answer
            </Button>
            <p className="hidden text-xs text-muted-foreground sm:block">Shortcut: Space to reveal, then K for got it or R for review.</p>
          </div>
        ) : (
          <>
            {draft.trim() && (
              <div className="rounded-lg p-3 ring-1 ring-foreground/10">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Your answer</p>
                <p className="text-sm whitespace-pre-wrap">{draft}</p>
              </div>
            )}
            <AnswerBody q={q} />
            <p className="text-xs text-muted-foreground">Rate it honestly: Got it only if you said the bolded answer and at least one trade-off without peeking.</p>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => answer("review")}>
                <RotateCcw className="size-4" aria-hidden /> Review again
              </Button>
              <Button onClick={() => answer("known")}>
                <Check className="size-4" aria-hidden /> Got it
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
