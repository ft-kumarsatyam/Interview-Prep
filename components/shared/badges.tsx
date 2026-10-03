import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/content";

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  Easy: "bg-success/10 text-success",
  Medium: "bg-warning/10 text-warning",
  Hard: "bg-destructive/10 text-destructive",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", DIFFICULTY_CLASS[difficulty])}>
      {difficulty}
    </span>
  );
}

/** Static class map so Tailwind can see every class at build time. */
const TRACK_CLASS: Record<string, string> = {
  yellow: "bg-yellow-500/12 text-yellow-600 dark:text-yellow-400",
  lime: "bg-lime-500/12 text-lime-600 dark:text-lime-400",
  orange: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  indigo: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
  blue: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  pink: "bg-pink-500/12 text-pink-600 dark:text-pink-400",
  slate: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
};

export function TrackChip({ color, children, className }: { color: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", TRACK_CLASS[color] ?? TRACK_CLASS.slate, className)}>
      {children}
    </span>
  );
}
