"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextHint, type HintKind, type HintLevel } from "@/modules/dsa/domain/dsa-runner";

const LABEL: Record<HintKind, string> = { nudge: "Nudge", approach: "Approach", pseudocode: "Pseudocode" };
const BUTTON: Record<HintKind, string> = { nudge: "Show a nudge", approach: "Show the approach", pseudocode: "Show pseudocode" };

/** Hints are a ladder: each step gives away more, so you only reveal as much as you need. */
export function HintReveal({ hints, initialRevealed = 0, onReveal }: { hints: HintLevel[]; initialRevealed?: number; onReveal?: (revealed: number) => void }) {
  const [revealed, setRevealed] = useState(initialRevealed);
  const next = nextHint(hints, revealed);
  if (hints.length === 0) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      {hints.slice(0, revealed).map((h) => (
        <div key={h.level} className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3.5 text-warning" aria-hidden />
            Hint {h.level} of {hints.length} · {LABEL[h.kind]}
          </p>
          {h.kind === "pseudocode" ? <pre className="overflow-auto font-mono text-xs whitespace-pre-wrap">{h.text}</pre> : <p>{h.text}</p>}
        </div>
      ))}
      {next && (
        <Button type="button" variant="outline" className="h-9" onClick={() => {
            setRevealed(revealed + 1);
            onReveal?.(revealed + 1);
          }}
        >
          <Lightbulb /> {BUTTON[next.kind]}
          <span className="tabular font-mono text-xs text-muted-foreground">
            {revealed + 1}/{hints.length}
          </span>
        </Button>
      )}
    </div>
  );
}
