import { StatTile } from "@/components/shared/stat-tile";
import { CalendarCheck, Target, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ContentProblem, Difficulty } from "@/lib/content";
import { addDays, type DateStr } from "@/lib/domain/dates";
import type { ProgressSummary } from "@/lib/services/problems";
import { cn } from "@/lib/utils";

const DIFFICULTY_BAR: Record<Difficulty, string> = { Easy: "bg-success", Medium: "bg-warning", Hard: "bg-destructive" };

/** Header stats for /dsa: overall, core milestone, last 7 days and the difficulty split. */
export function DsaOverview({ problems, progress, today }: { problems: ContentProblem[]; progress: Record<string, ProgressSummary>; today: DateStr }) {
  const solvedSet = (list: ContentProblem[]) => list.filter((p) => progress[p.slug]?.status === "solved");
  const main = problems.filter((p) => p.track === "main");
  const core = main.filter((p) => p.tier === "core");
  const mainSolved = solvedSet(main).length;
  const coreSolved = solvedSet(core).length;
  const coreDone = core.length > 0 && coreSolved === core.length;
  const weekStart = addDays(today, -6);
  const lastWeek = Object.values(progress).filter((p) => p.status === "solved" && p.lastSolvedOn && p.lastSolvedOn >= weekStart && p.lastSolvedOn <= today).length;
  const pct = (n: number, d: number) => Math.round((n / Math.max(d, 1)) * 100);

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4 lg:gap-4">
      <StatTile icon={Target} label="DSA solved">
        <p className="tabular font-mono text-2xl font-semibold">
          {mainSolved} <span className="text-sm font-normal text-muted-foreground">/ {main.length}</span>
        </p>
        <Progress value={pct(mainSolved, main.length)} className="mt-2" aria-label="DSA progress" />
        <p className="mt-1.5 text-xs text-muted-foreground">{pct(mainSolved, main.length)}% of the full list</p>
      </StatTile>

      <StatTile icon={Trophy} label="Core pass" tone={coreDone ? "success" : "neutral"}>
        <p className="tabular font-mono text-2xl font-semibold">
          {coreSolved} <span className="text-sm font-normal text-muted-foreground">/ {core.length}</span>
        </p>
        <Progress value={pct(coreSolved, core.length)} className="mt-2" aria-label="Core pass progress" />
        <p className={cn("mt-1.5 text-xs", coreDone ? "text-success" : "text-muted-foreground")}>
          {coreDone ? "Core ✅ all done" : `${core.length - coreSolved} to go`}
        </p>
      </StatTile>

      <StatTile icon={CalendarCheck} label="Last 7 days">
        <p className="tabular font-mono text-2xl font-semibold">{lastWeek}</p>
        <p className="mt-1 text-xs text-muted-foreground">{lastWeek === 0 ? "Start with one today 💪" : lastWeek === 1 ? "problem solved" : "problems solved"}</p>
      </StatTile>

      <StatTile label="Difficulty split">
        <ul className="space-y-1.5 pt-0.5">
          {(["Easy", "Medium", "Hard"] as const).map((d) => {
            const list = main.filter((p) => p.difficulty === d);
            const solved = solvedSet(list).length;
            return (
              <li key={d} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2 text-xs">
                <span className="text-muted-foreground">{d}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className={cn("block h-full rounded-full", DIFFICULTY_BAR[d])} style={{ width: `${pct(solved, list.length)}%` }} />
                </span>
                <span className="tabular font-mono text-muted-foreground">
                  {solved}/{list.length}
                </span>
              </li>
            );
          })}
        </ul>
      </StatTile>
    </div>
  );
}
