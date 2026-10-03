"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { addDesignMinutesAction, saveDesignRubricAction, saveDesignSectionAction } from "@/app/(app)/design/actions";
import { addPracticeMinutesAction, savePracticeRubricAction, savePracticeSectionAction } from "@/app/(app)/design/practice-actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { MarkdownNotes } from "@/components/shared/markdown-notes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DESIGN_SECTIONS, SECTION_MIN_WORDS, formatClock, rubricScore, type DesignSectionId } from "@/lib/domain/design";
import { EXPLAIN_SECTIONS, type ExplainSectionId, type PracticeKind } from "@/lib/domain/practice-cases";
import { cn } from "@/lib/utils";

interface SectionDef {
  id: string;
  label: string;
  minutes: number;
  hint: string;
}

interface Props {
  slug: string;
  /** Set for OS/DBMS cases (20-minute explain template); omitted for System Design (45-minute HLD round). */
  kind?: PracticeKind;
  sections: Partial<Record<DesignSectionId | ExplainSectionId, string>>;
  rubric: Array<{ id: string; label: string }>;
  checked: string[];
  minutesSpent: number;
  /** Rendered as the final "get a critique" step, e.g. an AskGemini button. */
  feedback?: React.ReactNode;
}

/** Which section the clock says you should be on, from the per-section budgets. */
function sectionAt(defs: readonly SectionDef[], elapsedSeconds: number): string | null {
  let t = 0;
  for (const s of defs) {
    t += s.minutes * 60;
    if (elapsedSeconds < t) return s.id;
  }
  return null;
}

function isWritten(text: string | undefined): boolean {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length >= SECTION_MIN_WORDS;
}

function Step({ n, title, detail, done, active }: { n: number; title: string; detail: string; done: boolean; active?: boolean }) {
  return (
    <li className={cn("flex min-w-0 items-start gap-2.5 rounded-lg border bg-card p-3", active && "border-primary/50", done && "border-success/30")}>
      {done ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" />
      ) : (
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-2xs font-semibold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {n}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm leading-tight font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

export function DesignPractice({ slug, kind, sections, rubric, checked: initialChecked, minutesSpent: initialMinutes, feedback }: Props) {
  const defs: readonly SectionDef[] = kind ? EXPLAIN_SECTIONS : DESIGN_SECTIONS;
  const totalMinutes = defs.reduce((n, d) => n + d.minutes, 0);
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minutesSpent, setMinutesSpent] = useState(initialMinutes);
  const [checked, setChecked] = useState(initialChecked);
  const [written, setWritten] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(defs.map((d) => [d.id, isWritten(sections[d.id as keyof typeof sections])])),
  );
  const [, start] = useTransition();
  const segmentStart = useRef<number | null>(null);
  const banked = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (segmentStart.current !== null) setElapsed(banked.current + Math.floor((Date.now() - segmentStart.current) / 1000));
    }, 1000);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", warn);
    };
  }, [running]);

  function startTimer() {
    segmentStart.current = Date.now();
    setRunning(true);
  }

  function pauseTimer() {
    if (segmentStart.current === null) return;
    const seconds = Math.floor((Date.now() - segmentStart.current) / 1000);
    banked.current += seconds;
    segmentStart.current = null;
    setElapsed(banked.current);
    setRunning(false);
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return;
    start(async () => {
      const res = kind ? await addPracticeMinutesAction({ target: { kind, slug }, minutes }) : await addDesignMinutesAction({ slug, minutes });
      if (res.ok) {
        setMinutesSpent(res.minutesSpent);
        toast.success(`${minutes} min logged`);
      } else toast.error(`${res.error}. Your time wasn't logged; try pausing again.`);
    });
  }

  function resetTimer() {
    if (running) pauseTimer();
    banked.current = 0;
    setElapsed(0);
  }

  function toggle(id: string, on: boolean) {
    const prev = checked;
    const next = on ? [...checked, id] : checked.filter((x) => x !== id);
    setChecked(next);
    start(async () => {
      const res = kind ? await savePracticeRubricAction({ target: { kind, slug }, checked: next }) : await saveDesignRubricAction({ slug, checked: next });
      if (!res.ok) {
        setChecked(prev);
        toast.error(`${res.error}. Tick it again in a moment.`);
      }
    });
  }

  async function saveSection(id: string, text: string) {
    const res = kind
      ? await savePracticeSectionAction({ target: { kind, slug }, section: id as ExplainSectionId, text })
      : await saveDesignSectionAction({ slug, section: id as DesignSectionId, text });
    if (res.ok) {
      setWritten((w) => ({ ...w, [id]: isWritten(text) }));
      // Re-renders the server page so the critique prompt includes this answer.
      router.refresh();
    }
    return res;
  }

  const remaining = totalMinutes * 60 - elapsed;
  const current = elapsed > 0 ? sectionAt(defs, elapsed) : null;
  const currentLabel = defs.find((s) => s.id === current)?.label;
  const score = rubricScore(checked, rubric.map((r) => r.id));
  const writtenCount = defs.filter((d) => written[d.id]).length;
  const clockStarted = elapsed > 0 || running || minutesSpent > 0;

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Mock steps">
        <Step n={1} title="Start the clock" detail={`${totalMinutes} min · ${minutesSpent} min logged`} done={clockStarted} active={!clockStarted} />
        <Step n={2} title="Write each section" detail={`${writtenCount}/${defs.length} written`} done={writtenCount === defs.length} active={clockStarted && writtenCount < defs.length} />
        <Step n={3} title="Score yourself" detail={`${score.done}/${score.total} rubric items`} done={score.total > 0 && score.done === score.total} active={writtenCount === defs.length && score.done < score.total} />
        <Step n={4} title="Get a critique" detail="Paste into Gemini" done={false} active={score.total > 0 && score.done === score.total} />
      </ol>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 border-y bg-background/95 px-4 py-3 backdrop-blur lg:mx-0 lg:rounded-xl lg:border">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className={cn("font-mono text-2xl font-semibold tabular", remaining < 0 && "text-destructive")} aria-live="off">
            {remaining < 0 && <span className="sr-only">Over time by </span>}
            {formatClock(remaining)}
          </div>
          <div className="order-last min-w-0 basis-full text-sm text-muted-foreground sm:order-none sm:basis-auto sm:flex-1">
            {current ? (
              <>
                {running ? "Now:" : "Paused on:"}{" "}
                <a href={`#practice-${current}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {currentLabel}
                </a>
              </>
            ) : remaining < 0 ? (
              <span className="text-destructive">Over time. Wrap up with trade-offs.</span>
            ) : (
              `${totalMinutes}-minute mock round. Budgets per section are shown below.`
            )}
          </div>
          <div className="ml-auto flex gap-2">
            {running ? (
              <Button variant="outline" onClick={pauseTimer} className="h-9">
                <Pause /> Pause
              </Button>
            ) : (
              <Button onClick={startTimer} className="h-9">
                <Play /> {elapsed ? "Resume" : "Start timer"}
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={resetTimer} disabled={!elapsed} aria-label="Reset timer" title="Reset timer" className="size-9">
              <RotateCcw />
            </Button>
          </div>
        </div>
        {elapsed > 0 && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", remaining < 0 ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.min(100, (elapsed / (totalMinutes * 60)) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <ol className="space-y-4">
        {defs.map((s, i) => (
          <li
            key={s.id}
            id={`practice-${s.id}`}
            className={cn("scroll-mt-40 rounded-xl border bg-card p-4 transition-colors", current === s.id && "border-primary/60 bg-primary/5")}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-medium">
                {i + 1}. {s.label}
              </h3>
              {current === s.id && <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">Now</span>}
              {written[s.id] && (
                <ToneBadge tone="success" icon={CheckCircle2}>Written</ToneBadge>
              )}
              <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular">{s.minutes} min</span>
            </div>
            <MarkdownNotes compact initial={sections[s.id as keyof typeof sections] ?? ""} placeholder={s.hint} onSave={(text) => saveSection(s.id, text)} />
          </li>
        ))}
      </ol>
      <p className="-mt-2 text-xs text-muted-foreground">A section counts as written at {SECTION_MIN_WORDS}+ words. Save each one as you go.</p>

      <section aria-labelledby="rubric" className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 id="rubric" className="font-medium">
            Self-review rubric
          </h3>
          <span className="font-mono text-sm text-muted-foreground tabular" aria-live="polite">
            {score.done}/{score.total}
          </span>
        </div>
        <Progress value={score.pct} aria-label="Rubric score" className="mb-4" />
        <ul className="space-y-1">
          {rubric.map((r) => (
            <li key={r.id}>
              <label htmlFor={`rubric-${r.id}`} className="flex min-h-9 cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 text-sm leading-snug hover:bg-muted/50">
                <Checkbox id={`rubric-${r.id}`} checked={checked.includes(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} className="mt-0.5" />
                <span className={cn(checked.includes(r.id) && "text-muted-foreground")}>{r.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {feedback && (
        <section aria-labelledby="critique" className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="critique" className="font-medium">
              Get an interviewer-style critique
            </h3>
            <p className="text-sm text-muted-foreground">
              {writtenCount > 0
                ? "Copies your written answer into a prompt and opens Gemini. Paste it there."
                : `Write at least one section (${SECTION_MIN_WORDS}+ words) so the critique has something to review.`}
            </p>
          </div>
          <div className="shrink-0">{feedback}</div>
        </section>
      )}
    </div>
  );
}
