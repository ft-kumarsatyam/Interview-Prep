"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Coffee, ExternalLink, Pause, Play, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { logStudyAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/core/utils";
import { STUDY_ACTION_EVENT, STUDY_ACTION_KEY, type RememberedStudyAction } from "@/components/shared/study-action-state";

const STORAGE_KEY = "prepos:focus";
const HISTORY_KEY = "prepos:focus-history";
const POSITION_KEY = "prepos:focus-position";
const POSITION_EVENT = "prepos:focus-position";
const BREAK_AFTER_SECONDS = 60 * 60;
const BREAK_SECONDS = 5 * 60;
type FocusPosition = "bottom-left" | "bottom-right" | "top-left" | "top-right";
const FOCUS_POSITIONS: Array<{ id: FocusPosition; label: string }> = [
  { id: "bottom-right", label: "Bottom right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "top-right", label: "Top right" },
  { id: "top-left", label: "Top left" },
];

function positionClass(position: FocusPosition): string {
  if (position === "bottom-left") return "bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] left-3 sm:left-5 lg:bottom-5";
  if (position === "top-left") return "top-[calc(var(--topbar-h)+0.75rem+env(safe-area-inset-top))] left-3 sm:left-5";
  if (position === "top-right") return "top-[calc(var(--topbar-h)+0.75rem+env(safe-area-inset-top))] right-3 sm:right-5";
  return "bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] right-3 sm:right-5 lg:bottom-5";
}

type FocusState = { day: string; seconds: number; loggedSeconds: number; running: boolean; breakUntil: number | null; pages: Record<string, number> };

function localDay(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function readState(day: string): FocusState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "") as Partial<FocusState>;
    if (parsed.day === day && typeof parsed.seconds === "number") {
      return { day, seconds: parsed.seconds, loggedSeconds: typeof parsed.loggedSeconds === "number" ? parsed.loggedSeconds : 0, running: parsed.running === true, breakUntil: typeof parsed.breakUntil === "number" ? parsed.breakUntil : null, pages: parsed.pages ?? {} };
    }
  } catch {
    // Corrupt device state should never block the app.
  }
  return { day, seconds: 0, loggedSeconds: 0, running: false, breakUntil: null, pages: {} };
}

const format = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60).toString().padStart(2, "0")}m`;

/** Small local-first focus clock. It never blocks study flows or sends activity off-device. */
export function FocusWidget({ timezone }: { timezone: string }) {
  const pathname = usePathname();
  const day = useMemo(() => localDay(timezone), [timezone]);
  const [state, setState] = useState<FocusState>(() => ({ day, seconds: 0, loggedSeconds: 0, running: false, breakUntil: null, pages: {} }));
  const [open, setOpen] = useState(false);
  const [nextAction, setNextAction] = useState<RememberedStudyAction | null>(null);
  const [pending, startTransition] = useTransition();
  const [position, setPosition] = useState<FocusPosition>("bottom-right");
  const desi = typeof window === "undefined" ? true : window.localStorage.getItem("prepos:desi-mode") !== "off";

  useEffect(() => {
    const timer = window.setTimeout(() => setState(readState(day)), 0);
    return () => window.clearTimeout(timer);
  }, [day]);

  useEffect(() => {
    const loadPosition = () => {
      const value = window.localStorage.getItem(POSITION_KEY) as FocusPosition | null;
      if (value && FOCUS_POSITIONS.some((item) => item.id === value)) setPosition(value);
    };
    loadPosition();
    window.addEventListener(POSITION_EVENT, loadPosition);
    return () => window.removeEventListener(POSITION_EVENT, loadPosition);
  }, []);

  useEffect(() => {
    const readAction = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(STUDY_ACTION_KEY) ?? "null") as Partial<RememberedStudyAction> | null;
        const href = parsed?.href;
        const title = parsed?.title;
        setNextAction(typeof href === "string" && typeof title === "string" ? { href, title } : null);
      } catch {
        setNextAction(null);
      }
    };
    readAction();
    window.addEventListener(STUDY_ACTION_EVENT, readAction);
    window.addEventListener("storage", readAction);
    return () => {
      window.removeEventListener(STUDY_ACTION_EVENT, readAction);
      window.removeEventListener("storage", readAction);
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const timer = window.setTimeout(() => {
      setState((current) => ({ ...current, pages: { ...current.pages, [pathname]: (current.pages[pathname] ?? 0) + 1 } }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!state.running) return;
    const timer = window.setInterval(() => {
      setState((current) => {
        const next = { ...current, seconds: current.seconds + 1 };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.running]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    try {
      const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as Array<{ day: string; seconds: number; loggedSeconds: number; pages: Record<string, number> }>;
      const next = [...history.filter((item) => item.day !== state.day), { day: state.day, seconds: state.seconds, loggedSeconds: state.loggedSeconds, pages: state.pages }].slice(-90);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("prepos:focus-history"));
    } catch {
      // Device history is best effort and must never interrupt the timer.
    }
  }, [state]);

  const breakDue = state.seconds >= BREAK_AFTER_SECONDS && !state.breakUntil;
  const onBreak = state.breakUntil !== null;
  const toggle = () => {
    if (state.running) {
      const minutes = Math.floor((state.seconds - state.loggedSeconds) / 60);
      if (minutes > 0) {
        startTransition(async () => {
          const result = await logStudyAction({ minutes, kind: "other", note: nextAction?.title, source: "timer" });
          if (!result.ok) toast.error(result.error);
          else {
            setState((current) => ({ ...current, loggedSeconds: current.seconds }));
            toast.success(`Saved ${result.minutes} minutes to your study log`);
          }
        });
      }
    }
    setState((current) => ({ ...current, running: !current.running }));
  };
  const takeBreak = () => {
    setState((current) => ({ ...current, running: false, breakUntil: Date.now() + BREAK_SECONDS }));
    window.setTimeout(() => setState((current) => ({ ...current, breakUntil: null, seconds: Math.max(0, current.seconds - BREAK_AFTER_SECONDS), loggedSeconds: Math.max(0, current.loggedSeconds - BREAK_AFTER_SECONDS) })), BREAK_SECONDS * 1000);
  };
  const skipBreak = () => setState((current) => ({ ...current, breakUntil: null, seconds: Math.max(0, current.seconds - BREAK_AFTER_SECONDS), loggedSeconds: Math.max(0, current.loggedSeconds - BREAK_AFTER_SECONDS) }));
  const changePosition = (next: FocusPosition) => {
    setPosition(next);
    window.localStorage.setItem(POSITION_KEY, next);
    window.dispatchEvent(new Event(POSITION_EVENT));
  };

  return (
    <div className={`fixed z-40 ${positionClass(position)}`}>
      {!open ? (
        <Button variant="outline" size="sm" className="gap-2 rounded-full bg-card/95 shadow-sm backdrop-blur" onClick={() => setOpen(true)} aria-label={`Focus time today ${format(state.seconds)}`}>
          <Timer className="size-4 text-primary" aria-hidden />
          <span className="font-mono text-xs tabular-nums">{format(state.seconds)}</span>
        </Button>
      ) : (
        <div className={cn("w-72 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur", breakDue && "border-warning/50")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium"><Timer className="size-4 text-primary" aria-hidden /> Focus clock</p>
              <p className="mt-1 font-mono text-2xl tabular-nums">{format(state.seconds)}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)} aria-label="Close focus clock"><X className="size-4" /></Button>
          </div>
          {onBreak || breakDue ? (
            <div className="mt-3 rounded-xl bg-warning/10 p-3 text-xs text-warning">
              <p className="font-medium">{desi ? "Bhai, 5 min break le. Screen ko bhi oxygen chahiye." : "You’ve earned a five-minute reset."}</p>
              <p className="mt-1 text-warning/80">Stretch, drink water, look away from the screen.</p>
              <div className="mt-3 flex gap-2">
                {!onBreak && <Button size="sm" className="h-8" onClick={takeBreak}><Coffee className="mr-1 size-3.5" /> Take break</Button>}
                <Button size="sm" variant="ghost" className="h-8" onClick={skipBreak}>Later</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Time on this device today. Start it when you begin a real focus block.</p>
              {Object.keys(state.pages).length > 0 && <p className="mt-1">Visited {Object.keys(state.pages).length} study areas today.</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {FOCUS_POSITIONS.map((item) => (
                  <Button key={item.id} type="button" variant={position === item.id ? "default" : "outline"} size="xs" onClick={() => changePosition(item.id)}>{item.label}</Button>
                ))}
              </div>
              {nextAction && (
                <a href={nextAction.href} className="mt-3 flex items-center gap-1.5 font-medium text-primary hover:underline">
                  <ExternalLink className="size-3.5" aria-hidden /> Resume: {nextAction.title}
                </a>
              )}
            </div>
          )}
          <Button className="mt-4 w-full" disabled={pending} variant={state.running ? "outline" : "default"} onClick={toggle}>
            {state.running ? <><Pause className="mr-2 size-4" /> Pause focus</> : <><Play className="mr-2 size-4" /> Start focus</>}
          </Button>
        </div>
      )}
    </div>
  );
}
