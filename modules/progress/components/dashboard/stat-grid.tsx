import { BookOpen, CalendarClock, Code2, Flame, Snowflake, TrendingDown, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/shared/stat-tile";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/core/plan-clock";
import { cn } from "@/core/utils";
import type { FreezeProgress, StreakRisk, WeekCell } from "@/modules/progress/domain/streak-insights";

type Props = {
  streak: number;
  best: number;
  freezeTokens: number;
  risk: StreakRisk;
  freeze: FreezeProgress;
  streakWeek: { cells: WeekCell[]; kept: number; elapsed: number };
  solvedMain: number;
  mainTotal: number;
  pace: { delta: number; ideal: number };
  daysLeft: number;
  endDate: string;
  phaseName?: string;
  week: number;
  totalWeeks: number;
};

/** Streak, solved, countdown and phase tiles. */
export function StatGrid(p: Props) {
  const weekFrac = p.totalWeeks ? Math.min(Math.max(p.week, 0) / p.totalWeeks, 1) : 0;
  return (
    <div className="grid grid-cols-2 content-start gap-3 sm:gap-4">
      <StatTile
        icon={Flame}
        tone="streak"
        label="Streak"
        className={cn(p.risk.level === "warn" && "border-warning", p.risk.level === "critical" && "animate-pulse border-destructive")}
        value={
          <>
            {p.streak} <span className="text-sm text-muted-foreground sm:text-base">day{p.streak === 1 ? "" : "s"}</span>
          </>
        }
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          best {p.best}
          <span className="flex items-center gap-0.5" aria-label={`${p.freezeTokens} freeze tokens`}>
            {Array.from({ length: Math.max(p.freezeTokens, 0) }, (_, i) => (
              <Snowflake key={i} className="size-3.5 text-chart-5" />
            ))}
            {p.freezeTokens === 0 && "· no freezes"}
          </span>
        </p>
        <ol className="flex items-center gap-1" aria-label={`Days kept this week: ${p.streakWeek.kept} of ${p.streakWeek.elapsed} so far`}>
          {p.streakWeek.cells.map((c) => (
            <li
              key={c.date}
              title={`${c.date}: ${c.state}`}
              className={cn(
                "size-2.5 rounded-full border",
                c.state === "kept" && "border-day-done-dot bg-day-done-dot",
                c.state === "today" && "border-primary bg-primary/20",
                c.state === "missed" && "border-day-missed-dot bg-day-missed",
                c.state === "future" && "border-border bg-transparent",
              )}
            />
          ))}
          <span className="ml-1 text-2xs text-muted-foreground">{p.streakWeek.kept}/7 this week</span>
        </ol>
        {p.risk.level !== "none" && p.risk.level !== "safe" && (
          <p className={cn("text-xs", p.risk.level === "critical" ? "font-medium text-destructive" : "text-warning")} role="status">
            {p.risk.message}
            {p.risk.left.length > 0 && ` Still needed: ${p.risk.left.join(", ")}.`}
          </p>
        )}
        <p className="text-2xs text-muted-foreground">{p.freeze.label}</p>
      </StatTile>

      <StatTile
        icon={Code2}
        label="Solved"
        value={
          <>
            {p.solvedMain} <span className="text-sm text-muted-foreground sm:text-base">/ {p.mainTotal}</span>
          </>
        }
      >
        <p className={cn("flex items-center gap-1 text-xs", p.pace.delta >= 0 ? "text-success" : "text-destructive")}>
          {p.pace.delta >= 0 ? <TrendingUp className="size-3.5 shrink-0" /> : <TrendingDown className="size-3.5 shrink-0" />}
          {p.pace.delta === 0 ? "exactly on pace" : p.pace.delta > 0 ? `${p.pace.delta} ahead of plan` : `${-p.pace.delta} behind (ideal ${p.pace.ideal})`}
        </p>
      </StatTile>

      <StatTile icon={CalendarClock} label="Countdown" value={`${p.daysLeft}d`} hint={`to ${formatDate(p.endDate, { day: "numeric", month: "short", year: "numeric" })}`} />

      <StatTile icon={BookOpen} label="Phase" className="gap-2">
        <p className="line-clamp-2 text-sm font-medium">{p.phaseName ?? "Pre-start"}</p>
        <Progress value={weekFrac * 100} className="h-1.5" aria-label="Plan progress" />
        <p className="tabular text-xs text-muted-foreground">
          Week {Math.max(p.week, 1)} of {p.totalWeeks}
        </p>
      </StatTile>
    </div>
  );
}
