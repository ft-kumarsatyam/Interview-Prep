"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
import { startCustomPracticeAction } from "@/app/(app)/practice/actions";
import { submitPracticeAction } from "@/app/(app)/learn/practice/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DifficultyPicker } from "@/modules/quiz/components/difficulty-picker";
import { QuizPlayer, type SubmitFn } from "@/modules/quiz/components/quiz-player";
import type { Difficulty } from "@/modules/quiz/lib/question";
import type { PracticeStart } from "@/modules/quiz/services/practice";

export interface BuilderSubject {
  id: string;
  name: string;
  topics: Array<{ id: string; title: string; subtopics: Array<{ id: string; title: string; studied: boolean }> }>;
}

type Mode = "studied" | "picked" | "track";
const SIZES = [5, 10, 15, 20] as const;

/** Choose what to be quizzed on: what you have studied, topics you pick, or a whole subject. */
export function CustomQuizBuilder({ subjects, studiedCount, passPct }: { subjects: BuilderSubject[]; studiedCount: number; passPct: number }) {
  const [mode, setMode] = useState<Mode>(studiedCount > 0 ? "studied" : "picked");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [track, setTrack] = useState(subjects[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>(10);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [run, setRun] = useState<PracticeStart | null>(null);
  const [pending, start] = useTransition();

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      subjects
        .map((s) => ({ ...s, topics: s.topics.filter((t) => !q || t.title.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || t.subtopics.some((x) => x.title.toLowerCase().includes(q))) }))
        .filter((s) => s.topics.length > 0),
    [subjects, q],
  );

  const toggle = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const ready = mode === "studied" ? studiedCount > 0 : mode === "track" ? !!track : picked.size > 0;

  const begin = () =>
    start(async () => {
      const res = await startCustomPracticeAction({ mode, ...(mode === "picked" ? { refs: [...picked] } : {}), ...(mode === "track" ? { track } : {}), size, difficulty });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setRun(res.run);
    });

  if (run) {
    const submit: SubmitFn = async (answers) => {
      const res = await submitPracticeAction({ attemptId: run.attemptId, answers });
      if (!res.ok) return res;
      return { ok: true, outcome: res.result.outcome };
    };
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <QuizPlayer
          key={run.attemptId}
          questions={run.questions}
          seed={parseInt(run.attemptId.slice(-6), 16)}
          passPct={passPct}
          submit={submit}
          onRetake={begin}
          retakeLabel="New quiz, same topics"
          resultExtra={
            <Button size="sm" variant="ghost" onClick={() => setRun(null)} className="h-9">
              <ArrowLeft /> Change topics
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div role="group" aria-label="What to be quizzed on" className="flex flex-wrap gap-1.5">
        <Chip pressed={mode === "studied"} onClick={() => setMode("studied")} count={studiedCount}>
          What I have studied
        </Chip>
        <Chip pressed={mode === "picked"} onClick={() => setMode("picked")} count={picked.size || undefined}>
          Topics I pick
        </Chip>
        <Chip pressed={mode === "track"} onClick={() => setMode("track")}>
          A whole subject
        </Chip>
      </div>

      {mode === "studied" && (
        <Card>
          <CardContent className="space-y-1 text-sm">
            {studiedCount > 0 ? (
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>
                  Questions from the <strong>{studiedCount}</strong> subtopic{studiedCount === 1 ? "" : "s"} you have ticked or finished a course lesson on, weighted toward the ones you know least.
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground">You have not studied anything yet. Tick a subtopic on the Learn page or finish a course lesson, or pick topics yourself.</p>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "track" && (
        <div role="group" aria-label="Subject" className="flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <Chip key={s.id} pressed={track === s.id} onClick={() => setTrack(s.id)}>
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      {mode === "picked" && (
        <div className="space-y-3">
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics" aria-label="Search topics" className="w-full sm:w-80" />
          <div className="space-y-4">
            {shown.map((s) => (
              <section key={s.id} aria-label={s.name} className="space-y-1.5">
                <h2 className="text-sm font-semibold">{s.name}</h2>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {s.topics.map((t) => {
                    const ids = t.subtopics.map((x) => x.id);
                    const on = ids.filter((id) => picked.has(id)).length;
                    const studied = t.subtopics.filter((x) => x.studied).length;
                    return (
                      <li key={t.id} className="rounded-lg border bg-card">
                        <details>
                          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
                            <input
                              type="checkbox"
                              className="size-4"
                              aria-label={`Select all of ${t.title}`}
                              checked={on === ids.length}
                              ref={(el) => {
                                if (el) el.indeterminate = on > 0 && on < ids.length;
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => toggle(ids, e.target.checked)}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {studied > 0 ? `${studied}/${ids.length} studied` : `${ids.length} subtopics`}
                            </span>
                          </summary>
                          <ul className="space-y-0.5 border-t px-3 py-2">
                            {t.subtopics.map((x) => (
                              <li key={x.id}>
                                <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm pointer-coarse:min-h-11">
                                  <input type="checkbox" className="size-4" checked={picked.has(x.id)} onChange={(e) => toggle([x.id], e.target.checked)} />
                                  <span className="min-w-0 flex-1 truncate">{x.title}</span>
                                  {x.studied && <span className="text-2xs text-success">studied</span>}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {shown.length === 0 && <p className="text-sm text-muted-foreground">No topic matches that search.</p>}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">How many questions</p>
          <div role="group" aria-label="Number of questions" className="flex gap-1.5">
            {SIZES.map((n) => (
              <Chip key={n} pressed={size === n} onClick={() => setSize(n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Difficulty</p>
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </div>
        <Button size="lg" onClick={begin} disabled={!ready || pending} loading={pending} className="w-full sm:w-auto">
          <Play /> Start quiz
        </Button>
        <p className="text-xs text-muted-foreground">A custom quiz updates your mastery per subtopic. It never changes your daily plan or your streak.</p>
      </div>
    </div>
  );
}
