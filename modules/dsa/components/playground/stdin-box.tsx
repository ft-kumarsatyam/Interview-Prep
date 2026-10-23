"use client";

import { useId } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/modules/dsa/domain/starters";

/** A collapsible "Input (stdin)" box: one line per `input()` (Python) or `readline()` (JavaScript, TypeScript). */
export function StdinBox({
  value,
  onChange,
  open,
  onToggle,
  language,
}: {
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
  language: Language;
}) {
  const id = useId();
  const lines = value ? value.split("\n").length : 0;
  return (
    <div className="shrink-0 border-t bg-muted/20">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-9 w-full items-center gap-1.5 px-3 text-left text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        {open ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
        Input (stdin)
        {lines > 0 && <span className="font-mono text-2xs tabular">{lines} {lines === 1 ? "line" : "lines"}</span>}
      </button>
      {open && (
        <div id={id} className="space-y-1.5 px-3 pb-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            maxLength={20_000}
            spellCheck={false}
            aria-label="Standard input"
            placeholder={language === "python" ? "One line per input() call" : "One line per readline() call"}
            className="max-h-40 min-h-16 resize-y font-mono text-xs"
          />
          <p className="text-2xs text-muted-foreground">
            {language === "python"
              ? "input() and sys.stdin read these lines in order, then hit end of input."
              : "readline() (or input()) returns the next line, then null."}
          </p>
        </div>
      )}
    </div>
  );
}
