"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_CUSTOM_CASES, type CaseDraft } from "@/modules/dsa/domain/ide";
import { cn } from "@/core/utils";

/** LeetCode-style editable inputs: one chip per case, one JSON field per parameter. */
export function TestcaseTab({
  params,
  drafts,
  selected,
  onSelect,
  onChange,
  onAdd,
  onRemove,
  onReset,
  dirty,
}: {
  params: string[];
  drafts: CaseDraft[];
  selected: number;
  onSelect: (i: number) => void;
  onChange: (caseIndex: number, argIndex: number, text: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onReset: () => void;
  dirty: boolean;
}) {
  const current = drafts[selected];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {drafts.map((_, i) => (
          <span key={i} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={selected === i}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              Case {i + 1}
            </button>
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove case ${i + 1}`}
                className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-muted-foreground/80 text-background group-hover:grid focus-visible:grid"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {drafts.length < MAX_CUSTOM_CASES && (
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onAdd} aria-label="Add a test case (copies the selected one)">
            <Plus />
          </Button>
        )}
        {dirty && (
          <Button type="button" variant="ghost" size="sm" className="ml-auto h-8 text-xs text-muted-foreground" onClick={onReset}>
            <RotateCcw /> Reset cases
          </Button>
        )}
      </div>
      {current && (
        <div className="space-y-2">
          {params.map((name, ai) => (
            <label key={name} className="block space-y-1">
              <span className="font-mono text-xs text-muted-foreground">{name} =</span>
              <textarea
                value={current[ai] ?? ""}
                onChange={(e) => onChange(selected, ai, e.target.value)}
                spellCheck={false}
                rows={Math.min(4, Math.max(1, Math.ceil((current[ai]?.length ?? 0) / 70)))}
                className="w-full resize-y rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            </label>
          ))}
          <p className="text-2xs text-muted-foreground">Values are JSON. Edit them or add a case to try your own input; changed cases show your output without a verdict.</p>
        </div>
      )}
    </div>
  );
}
