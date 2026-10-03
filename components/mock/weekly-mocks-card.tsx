import Link from "next/link";
import { CheckCircle2, Circle, Timer } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/plan-clock";
import type { WeeklyMockSlot } from "@/lib/services/mock";
import { cn } from "@/lib/utils";

/** This week's scheduled DSA and System Design mocks. Informational only: mocks never gate the streak. */
export function WeeklyMocksCard({ slots, today, compact }: { slots: WeeklyMockSlot[]; today: string; compact?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="size-4 text-muted-foreground" aria-hidden /> This week&apos;s mocks
        </CardTitle>
        {!compact && <CardDescription>Scheduled in Settings. A full mock counts for both. They don&apos;t affect your streak.</CardDescription>}
        {compact && (
          <CardAction>
            <Link href="/mock" className="text-sm text-primary hover:underline">
              All mocks
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {slots.map((s) => {
            const overdue = !s.done && s.date < today;
            const isToday = s.date === today;
            return (
              <li key={s.kind}>
                <Link
                  href={s.done && s.sessionId ? `/mock/${s.sessionId}/report` : "/mock"}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isToday && !s.done && "border-primary/50 bg-primary/5",
                  )}
                >
                  {s.done ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : <Circle className={cn("size-4 shrink-0", overdue ? "text-warning" : "text-muted-foreground/50")} aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.done ? (s.score != null ? `Done · ${s.score}/100` : "Done · awaiting grading") : isToday ? "Scheduled today" : `${overdue ? "Missed" : "Scheduled"} ${formatDate(s.date)}`}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
