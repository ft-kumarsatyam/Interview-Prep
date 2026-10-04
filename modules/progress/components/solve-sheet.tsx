"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markSolved } from "@/app/(app)/dashboard/actions";
import { celebrateDayComplete } from "@/components/shared/celebrate";
import { feedback } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/core/utils";

const CONFIDENCE = [
  { id: "easy", label: "Easy", hint: "never again" },
  { id: "ok", label: "OK", hint: "once in 14d" },
  { id: "struggled", label: "Struggled", hint: "3 → 7 → 21d" },
] as const;

export interface SolveTarget {
  slug: string;
  title: string;
  /** Set when filling in details for an earlier solve (e.g. a LeetCode import). */
  date?: string;
}

export function SolveSheet({
  target,
  onOpenChange,
  onSolved,
}: {
  target: SolveTarget | null;
  onOpenChange: (open: boolean) => void;
  onSolved?: (slug: string) => void;
}) {
  const [confidence, setConfidence] = useState<(typeof CONFIDENCE)[number]["id"]>("ok");
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    if (!target) return;
    const str = (k: string) => {
      const v = String(form.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    onSolved?.(target.slug);
    onOpenChange(false);
    startTransition(async () => {
      const res = await markSolved({
        slug: target.slug,
        date: target.date,
        confidence,
        timeTakenMin: str("timeTakenMin"),
        approach: str("approach"),
        timeComplexity: str("timeComplexity"),
        spaceComplexity: str("spaceComplexity"),
      });
      if (!res.ok) {
        toast.error(`${res.error}. Your entry wasn't saved, try again.`);
        return;
      }
      toast.success(`${target.title} logged`);
      if (res.justCompleted) await celebrateDayComplete();
      else feedback("tick");
    });
  }

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <form action={submit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{target?.title}</SheetTitle>
            <SheetDescription>How did it go? This schedules your next review.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Confidence</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {CONFIDENCE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={confidence === c.id}
                    onClick={() => setConfidence(c.id)}
                    className={cn(
                      "rounded-lg border p-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      confidence === c.id ? "border-primary bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                    <span className="block font-medium">{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="timeTakenMin">Minutes taken</Label>
              <Input id="timeTakenMin" name="timeTakenMin" type="number" min={0} max={600} inputMode="numeric" placeholder="25" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approach">One-line approach</Label>
              <Input id="approach" name="approach" maxLength={300} placeholder="Two pointers from both ends" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="timeComplexity">Time</Label>
                <Input id="timeComplexity" name="timeComplexity" maxLength={40} placeholder="O(n)" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spaceComplexity">Space</Label>
                <Input id="spaceComplexity" name="spaceComplexity" maxLength={40} placeholder="O(1)" className="font-mono" />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" disabled={pending} className="w-full">
              Save solve
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
