"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { useAutosave } from "@/components/shared/use-autosave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, CATEGORY_LABEL, LEVELS, type BankLevel, type Category } from "@/modules/interview-bank/domain/bank";

export interface QuestionDraft {
  category: Category;
  question: string;
  answer: string;
  level: BankLevel | null;
  company: string;
  role: string;
  round: string;
  tags: string[];
}

export const BLANK_QUESTION: QuestionDraft = { category: "dsa", question: "", answer: "", level: null, company: "", role: "", round: "", tags: [] };

/** One question's fields. The parent decides what saving does (add or update). */
export function QuestionForm({ initial = BLANK_QUESTION, submitLabel, companies = [], onSubmit, onCancel }: { initial?: QuestionDraft; submitLabel: string; companies?: string[]; onSubmit: (q: QuestionDraft) => Promise<void>; onCancel?: () => void }) {
  const [d, setD] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [pending, start] = useTransition();
  const set = <K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const listId = `bank-companies-${initial.question.length}`;
  const draft = useMemo(() => ({ question: d.question, answer: d.answer, category: d.category, level: d.level, company: d.company, role: d.role, round: d.round, tags }), [d, tags]);
  const draftStatus = useAutosave(
    draft,
    (value) => {
      if (initial.question) return;
      window.localStorage.setItem("prepos:interview-bank:draft", JSON.stringify(value));
    },
    { delayMs: 500, enabled: !initial.question },
  );

  return (
    <form
      className="space-y-3 rounded-lg border bg-background p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await onSubmit({ ...d, tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 6) });
          if (!onCancel) {
            setD(BLANK_QUESTION);
            setTags("");
            window.localStorage.removeItem("prepos:interview-bank:draft");
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="bq-question">Question</Label>
        <Input id="bq-question" value={d.question} onChange={(e) => set("question", e.target.value)} maxLength={300} required placeholder="What happens when you type a URL into the browser?" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bq-answer">Your answer or notes (optional, Markdown)</Label>
        <textarea id="bq-answer" value={d.answer} onChange={(e) => set("answer", e.target.value)} maxLength={6000} rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" />
      </div>
      <div className="space-y-1.5">
        <Label>Topic</Label>
        <div role="group" aria-label="Topic" className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Chip key={c} pressed={d.category === c} onClick={() => set("category", c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="bq-company">Company (optional)</Label>
          <Input id="bq-company" value={d.company} onChange={(e) => set("company", e.target.value)} maxLength={60} list={listId} placeholder="Razorpay" />
          <datalist id={listId}>
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bq-round">Round (optional)</Label>
          <Input id="bq-round" value={d.round} onChange={(e) => set("round", e.target.value)} maxLength={40} placeholder="system design" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bq-tags">Tags (comma separated)</Label>
          <Input id="bq-tags" value={tags} onChange={(e) => setTags(e.target.value)} maxLength={200} placeholder="caching, redis" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Level</Label>
        <div role="group" aria-label="Level" className="flex flex-wrap gap-1.5">
          <Chip pressed={d.level === null} onClick={() => set("level", null)}>
            Any
          </Chip>
          {LEVELS.map((l) => (
            <Chip key={l} pressed={d.level === l} onClick={() => set("level", l)}>
              {l[0]!.toUpperCase() + l.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" aria-hidden /> {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {!initial.question && <span className="self-center text-xs text-muted-foreground" aria-live="polite">{draftStatus === "saving" ? "Draft saving…" : draftStatus === "error" ? "Draft unavailable" : "Draft autosaved"}</span>}
      </div>
    </form>
  );
}
