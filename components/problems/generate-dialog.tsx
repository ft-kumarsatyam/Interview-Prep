"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateProblemAction, saveCustomProblemAction } from "@/app/(app)/problems/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIFFICULTIES } from "@/lib/domain/custom-problem";
import { verifyDraft } from "./verify-draft";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Generate a brand-new problem with the free AI chain. The reference solution is run against the
 * cases in your browser and any case it disagrees with is dropped before the problem is saved.
 */
export function GenerateProblemButton({ topics, defaultTopic, label = "Generate with AI" }: { topics: string[]; defaultTopic?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(defaultTopic ?? topics[0] ?? "Arrays & Hashing");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("Medium");
  const [company, setCompany] = useState("");
  const [step, setStep] = useState<"idle" | "asking" | "checking" | "saving">("idle");

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (step !== "idle") return;
    setStep("asking");
    try {
      const res = await generateProblemAction({ topic, difficulty, company: company.trim() || undefined });
      if (!res.ok) return void toast.error(res.error);
      if (res.result.kind === "sheet") {
        toast.message(`No AI key is set up, so here's an unsolved sheet problem instead: ${res.result.title}`);
        setOpen(false);
        return router.push(`/dsa/${res.result.slug}`);
      }
      setStep("checking");
      const checked = await verifyDraft(res.result.draft);
      if (!checked.ok) return void toast.error(checked.error);
      setStep("saving");
      const saved = await saveCustomProblemAction({ source: "ai", problem: checked.problem });
      if (!saved.ok) return void toast.error(saved.error);
      toast.success(checked.dropped ? `Problem ready. ${checked.dropped} case(s) disagreed with the reference solution and were dropped.` : "Problem ready");
      setOpen(false);
      router.push(`/problems/${saved.slug}`);
    } finally {
      setStep("idle");
    }
  }

  const busyLabel = step === "asking" ? "Writing the problem…" : step === "checking" ? "Checking test cases…" : "Saving…";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Sparkles /> {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => step === "idle" && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={generate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generate a new problem</DialogTitle>
              <DialogDescription>An original LeetCode-style problem with hidden test cases, hints and a reference solution. Uses the free AI chain.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="gen-topic">Topic</Label>
              <Input id="gen-topic" list="gen-topics" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60} required />
              <datalist id="gen-topics">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gen-difficulty">Difficulty</Label>
                <select id="gen-difficulty" className={selectClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-company">Company style (optional)</Label>
                <Input id="gen-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Amazon" maxLength={40} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={step !== "idle"}>
                Cancel
              </Button>
              <Button type="submit" disabled={step !== "idle" || topic.trim().length < 2}>
                {step === "idle" ? <Sparkles /> : <Loader2 className="animate-spin motion-reduce:animate-none" />}
                {step === "idle" ? "Generate" : busyLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
