import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CONFIG } from "@/modules/mock/domain/mock";
import { formatDate } from "@/core/plan-clock";
import type { MockSummary } from "@/modules/mock/services/mock";
import { cn } from "@/core/utils";

export function scoreTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

/** Oldest to newest, one bar per graded mock. */
function Trend({ mocks }: { mocks: MockSummary[] }) {
  const graded = mocks.filter((m) => m.totalScore != null).toReversed().slice(-20);
  if (graded.length < 2) return null;
  const avg = Math.round(graded.reduce((s, m) => s + (m.totalScore ?? 0), 0) / graded.length);
  return (
    <div className="space-y-2">
      <div className="flex h-20 items-end gap-1" role="img" aria-label={`Score trend over the last ${graded.length} mocks, average ${avg} out of 100`}>
        {graded.map((m) => (
          <div
            key={m.id}
            title={`${MOCK_CONFIG[m.type].label} · ${formatDate(m.date)} · ${m.totalScore}/100`}
            className={cn("min-w-2 flex-1 rounded-t-sm", (m.totalScore ?? 0) >= 75 ? "bg-success/70" : (m.totalScore ?? 0) >= 50 ? "bg-warning/70" : "bg-destructive/60")}
            style={{ height: `${Math.max(4, m.totalScore ?? 0)}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Average {avg}/100 over the last {graded.length} graded mocks.</p>
    </div>
  );
}

export function MockHistory({ mocks }: { mocks: MockSummary[] }) {
  if (mocks.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Every mock you&apos;ve finished, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Trend mocks={mocks} />
        <ul className="divide-y">
          {mocks.map((m) => (
            <li key={m.id}>
              <Link href={`/mock/${m.id}/report`} className="flex min-h-11 items-center gap-3 py-2 hover:text-primary focus-visible:text-primary focus-visible:outline-none">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{MOCK_CONFIG[m.type].label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(m.date)} · {m.durationMin} min
                  </span>
                </span>
                <span className={cn("text-sm font-semibold tabular", scoreTone(m.totalScore))}>{m.totalScore != null ? `${m.totalScore}/100` : "To grade"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
