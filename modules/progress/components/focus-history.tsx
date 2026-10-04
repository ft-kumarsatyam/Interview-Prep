"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, Clock3, Footprints } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

const HISTORY_KEY = "prepos:focus-history";
const EVENT = "prepos:focus-history";

interface HistoryEntry {
  day: string;
  seconds: number;
  loggedSeconds: number;
  pages: Record<string, number>;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60).toString().padStart(2, "0")}m`;

function readHistory(): HistoryEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item.day === "string" && typeof item.seconds === "number").toReversed() : [];
  } catch {
    return [];
  }
}

export function FocusHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const load = () => {
      const timer = window.setTimeout(() => setHistory(readHistory()), 0);
      return () => window.clearTimeout(timer);
    };
    const cleanup = load();
    window.addEventListener(EVENT, load);
    return () => {
      cleanup?.();
      window.removeEventListener(EVENT, load);
    };
  }, []);

  const totalSeconds = useMemo(() => history.reduce((sum, item) => sum + item.seconds, 0), [history]);
  const totalLogged = useMemo(() => history.reduce((sum, item) => sum + item.loggedSeconds, 0), [history]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><Clock3 className="size-5 text-primary" aria-hidden /><div><p className="text-xs text-muted-foreground">Tracked time</p><p className="font-mono text-lg">{formatTime(totalSeconds)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><BarChart3 className="size-5 text-success" aria-hidden /><div><p className="text-xs text-muted-foreground">Logged to plan</p><p className="font-mono text-lg">{formatTime(totalLogged)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><CalendarClock className="size-5 text-info" aria-hidden /><div><p className="text-xs text-muted-foreground">Days tracked</p><p className="font-mono text-lg">{history.length}</p></div></CardContent></Card>
      </div>
      {history.length === 0 ? (
        <EmptyState icon={Clock3} title="No focus history yet">Start the focus clock and your daily time will appear here.</EmptyState>
      ) : (
        <div className="divide-y rounded-xl border">
          {history.map((item) => {
            const areas = Object.entries(item.pages).toSorted((a, b) => b[1] - a[1]).slice(0, 5);
            return (
              <article key={item.day} className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium">{item.day}</h2>
                  <span className="font-mono text-sm tabular-nums">{formatTime(item.seconds)}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Footprints className="size-3.5" aria-hidden /> {Object.keys(item.pages).length} areas visited</span>
                  <span>·</span>
                  <span>{formatTime(item.loggedSeconds)} logged</span>
                </div>
                {areas.length > 0 && <p className="text-xs text-muted-foreground">Areas: {areas.map(([path, count]) => `${path} (${count})`).join(", ")}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
