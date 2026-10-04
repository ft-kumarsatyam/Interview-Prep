"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/core/utils";

/**
 * Markdown notes with an edit/preview toggle. react-markdown renders to React
 * elements and ignores raw HTML, so notes can never inject markup.
 */
export function MarkdownNotes({
  initial,
  onSave,
  placeholder,
  template,
  compact,
}: {
  initial: string;
  onSave: (notes: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  placeholder?: string;
  template?: { label: string; text: string };
  compact?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [mode, setMode] = useState<"edit" | "preview">(initial ? "preview" : "edit");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await onSave(value);
      if (res.ok) {
        setSaved(value);
        toast.success("Notes saved");
      } else toast.error(`${res.error}. Copy your notes before leaving the page.`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5" role="tablist" aria-label="Notes mode">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-md px-2 py-0.5 text-xs capitalize", mode === m ? "bg-muted font-medium" : "text-muted-foreground")}
            >
              {m}
            </button>
          ))}
        </div>
        {template && (
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              setValue((v) => (v.trim() ? `${v}\n\n${template.text}` : template.text));
              setMode("edit");
            }}
          >
            {template.label}
          </Button>
        )}
        <Button type="button" size="xs" onClick={save} disabled={pending || value === saved} className="ml-auto">
          {value === saved ? "Saved" : "Save notes"}
        </Button>
      </div>
      {mode === "edit" ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? "Markdown supported"}
          className={cn("font-mono text-sm", compact ? "min-h-28" : "min-h-64")}
          maxLength={20_000}
          aria-label="Notes"
        />
      ) : (
        <div className={cn("prose-notes rounded-lg border bg-muted/30 p-3 text-sm", compact ? "min-h-16" : "min-h-32")}>
          {value.trim() ? <ReactMarkdown>{value}</ReactMarkdown> : <p className="text-muted-foreground">No notes yet.</p>}
        </div>
      )}
    </div>
  );
}
