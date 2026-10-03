"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Pause, Play, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteStudyAction, logStudyAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STUDY_KINDS, type StudyKind } from "@/lib/domain/study";

const KEY = "prepos-study-timer";
const LABEL: Record<StudyKind, string> = { dsa: "DSA", theory: "Theory", revision: "Revision", mock: "Mock", aptitude: "Aptitude", other: "Other" };
const SELECT = "h-9 rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

export interface TodaySession {
  id: string;
  minutes: number;
  kind: StudyKind;
  note: string;
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const EVENT = "prepos-timer";
/** Used when localStorage is blocked, so the timer still works in this tab. */
let memoryStart: number | null = null;

function readStart(): number | null {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : memoryStart;
  } catch {
    return memoryStart;
  }
}
function writeStart(value: number | null) {
  memoryStart = value;
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(value));
  } catch {
    // Falls back to the in-memory value.
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** A focus timer that survives reloads (start time kept in localStorage), plus manual entry. Time is measured, never guessed from solves. */
export function StudyTimer({ sessions, todayMinutes }: { sessions: TodaySession[]; todayMinutes: number }) {
  const startedAt = useSyncExternalStore(subscribe, readStart, () => null);
  const [now, setNow] = useState(() => Date.now());
  const [kind, setKind] = useState<StudyKind>("dsa");
  const [note, setNote] = useState("");
  const [manual, setManual] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const begin = () => {
    setNow(Date.now());
    writeStart(Date.now());
  };
  const clear = () => writeStart(null);
  const log = (minutes: number, source: "timer" | "manual", after: () => void) =>
    start(async () => {
      const res = await logStudyAction({ minutes, kind, note, source });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Logged ${res.minutes} min of ${LABEL[kind].toLowerCase()}`);
      setNote("");
      after();
    });

  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-24 font-mono text-2xl tabular-nums" aria-live="off">
          {clock(elapsed)}
        </p>
        <select aria-label="What are you studying" value={kind} onChange={(e) => setKind(e.target.value as StudyKind)} className={SELECT}>
          {STUDY_KINDS.map((k) => (
            <option key={k} value={k}>
              {LABEL[k]}
            </option>
          ))}
        </select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on? (optional)" aria-label="Note" maxLength={200} className="h-9 min-w-40 flex-1" />
        {startedAt === null ? (
          <Button type="button" onClick={begin}>
            <Play /> Start
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={clear} aria-label="Discard this timer">
              <Pause /> Discard
            </Button>
            <Button type="button" disabled={pending} onClick={() => log(Math.max(1, Math.round(elapsed / 60_000)), "timer", clear)}>
              <Square /> Stop and log
            </Button>
          </>
        )}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(manual);
          if (Number.isFinite(n) && n >= 1) log(Math.round(n), "manual", () => setManual(""));
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="or add minutes" aria-label="Minutes to add" className="h-9 w-36" />
        <Button type="submit" variant="outline" size="sm" disabled={pending || !manual}>
          <Plus /> Add
        </Button>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">Today: {todayMinutes} min</span>
      </form>
      {sessions.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-16 shrink-0 tabular-nums">{s.minutes} min</span>
              <span className="shrink-0 text-muted-foreground">{LABEL[s.kind]}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.note}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete this session" disabled={pending} onClick={() => start(async () => void (await deleteStudyAction(s.id)))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
