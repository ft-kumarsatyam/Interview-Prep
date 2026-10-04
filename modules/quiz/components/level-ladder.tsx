"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/core/utils";
import type { LevelRow } from "@/modules/quiz/domain/levels";
import type { Difficulty } from "@/modules/quiz/lib/question";

const LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/**
 * The easy / medium / hard ladder: pick a level to start at. Each rung shows how many questions it has, how many runs
 * you did, your best score, and a tick once you have cleared it. "Mixed" draws from every level.
 */
export function LevelLadder({ rows, recommended, value, onChange, passPct }: { rows: LevelRow[]; recommended: Difficulty | null; value: Difficulty | null; onChange: (d: Difficulty | null) => void; passPct: number }) {
  return (
    <div role="radiogroup" aria-label="Level" className="grid gap-2 sm:grid-cols-4">
      {rows.map((r) => {
        const active = value === r.level;
        const empty = r.available === 0;
        return (
          <button
            key={r.level}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={empty}
            onClick={() => onChange(r.level)}
            className={cn(
              "flex min-h-20 flex-col items-start gap-0.5 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-24",
              active ? "border-primary bg-primary/10" : "hover:bg-muted",
            )}
          >
            <span className="flex w-full items-center justify-between gap-1 font-medium">
              {LABEL[r.level]}
              {r.cleared && (
                <span className="inline-flex items-center gap-0.5 text-xs text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden /> Cleared
                </span>
              )}
              {!r.cleared && recommended === r.level && <span className="text-xs text-primary">Next</span>}
            </span>
            <span className="text-xs text-muted-foreground">{empty ? "No questions yet" : `${r.available} questions`}</span>
            <span className="tabular text-xs text-muted-foreground">
              {r.attempts === 0 ? `Clear it with ${passPct}%` : `${r.attempts} run${r.attempts === 1 ? "" : "s"} · best ${r.bestPct}%`}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChange(null)}
        className={cn(
          "flex min-h-20 flex-col items-start gap-0.5 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-24",
          value === null ? "border-primary bg-primary/10" : "hover:bg-muted",
        )}
      >
        <span className="font-medium">Mixed</span>
        <span className="text-xs text-muted-foreground">Every level together</span>
      </button>
    </div>
  );
}
