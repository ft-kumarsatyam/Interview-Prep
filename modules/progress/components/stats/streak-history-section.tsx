import { Flame, Snowflake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/core/plan-clock";
import { MILESTONES } from "@/modules/progress/domain/streak-insights";
import { getStreakInsights } from "@/modules/progress/services/streak-insights";

const ACTIVITY_LABEL = { dsa: "DSA solves", theory: "Theory", quiz: "Quiz passes", reading: "Reading" } as const;
const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });

/** Async section: how the streak has gone, what is next, and how the freeze tokens work. A failure hides it. */
export async function StreakHistorySection({ today, freezeTokens }: { today: string; freezeTokens: number }) {
  const i = await getStreakInsights(today, freezeTokens).catch(() => null);
  if (!i) return null;
  const prev = [...MILESTONES].reverse().find((m) => m <= i.current) ?? 0;
  const pct = i.next ? Math.round(((i.current - prev) / (i.next.target - prev)) * 100) : 100;

  return (
    <section aria-label="Streak history" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-4 text-streak" aria-hidden /> Streak
          </CardTitle>
          <CardDescription>
            {i.current} day{i.current === 1 ? "" : "s"} now · best {i.best}. A day counts when its DSA, theory and daily quiz are done. Rest days keep the streak.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{i.next ? `${i.next.daysAway} day${i.next.daysAway === 1 ? "" : "s"} to the ${i.next.target}-day milestone` : "Every milestone reached"}</p>
              <Progress value={pct} aria-label="Progress to the next milestone" className="h-2" />
              <p className="text-xs text-muted-foreground">Milestones: {MILESTONES.join(", ")} days.</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Snowflake className="size-4 text-chart-5" aria-hidden /> Freeze tokens: {i.freeze.tokens} of {i.freeze.max}
              </p>
              <p className="text-xs text-muted-foreground">{i.freeze.label} A freeze is used automatically on a missed day when your streak is alive.</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">This week: {i.week.kept} of 7 days kept</p>
              <ol className="flex gap-1" aria-hidden>
                {i.week.cells.map((c) => (
                  <li key={c.date} title={`${c.date}: ${c.state}`} className={`h-2 flex-1 rounded-full ${c.state === "kept" ? "bg-day-done-dot" : c.state === "missed" ? "bg-day-missed-dot" : c.state === "today" ? "bg-primary/40" : "bg-muted"}`} />
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="mb-1.5 text-sm font-semibold">Past streaks</h3>
              {i.runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No streak yet. Finish a full day to start one.</p>
              ) : (
                <ul className="divide-y rounded-lg border text-sm">
                  {i.runs.map((r) => (
                    <li key={r.start} className="flex items-center justify-between gap-2 px-3 py-1.5">
                      <span>
                        {short(r.start)} to {short(r.end)}
                      </span>
                      <span className="tabular font-mono text-xs">
                        {r.length} day{r.length === 1 ? "" : "s"}
                        {r.freezes > 0 ? ` · ${r.freezes} freeze${r.freezes === 1 ? "" : "s"}` : ""}
                        {r.length === i.best ? " · best" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">By activity</h3>
              <p className="mb-1.5 text-xs text-muted-foreground">Days in a row for each kind of work. These are shown for interest and do not change your streak.</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {(Object.keys(ACTIVITY_LABEL) as Array<keyof typeof ACTIVITY_LABEL>).map((k) => (
                  <div key={k} className="rounded-lg border bg-muted/30 px-3 py-1.5">
                    <dt className="text-xs text-muted-foreground">{ACTIVITY_LABEL[k]}</dt>
                    <dd className="tabular font-mono">
                      {i.activities[k].current} now · best {i.activities[k].best}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
