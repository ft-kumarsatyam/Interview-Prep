"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { draftFromStatementAction, saveCustomProblemAction } from "@/app/(app)/problems/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTIES, PARAM_TYPES, RETURN_TYPES, formatCaseLines, parseCaseLines, type CustomProblemDraft } from "@/modules/dsa/domain/custom-problem";
import { verifyDraft } from "@/modules/dsa/components/problems/verify-draft";

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";
const mono = "font-mono text-xs leading-relaxed";

interface Param {
  name: string;
  type: (typeof PARAM_TYPES)[number];
}

const CASES_PLACEHOLDER = `[[2,7,11,15], 9] => [0,1]
[[3,2,4], 6] => [1,2]
hidden [[3,3], 6] => [0,1]`;

/**
 * Bring any problem: paste its statement, let the AI fill in the signature and test cases (or write them
 * yourself), then save. With a reference solution, every case is checked against it first.
 */
export function PasteProblemForm({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [statement, setStatement] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("Medium");
  const [topic, setTopic] = useState("");
  const [functionName, setFunctionName] = useState("solve");
  const [params, setParams] = useState<Param[]>([{ name: "nums", type: "number[]" }]);
  const [returnType, setReturnType] = useState<(typeof RETURN_TYPES)[number]>("number");
  const [compare, setCompare] = useState<"exact" | "unordered">("exact");
  const [casesText, setCasesText] = useState("");
  const [hints, setHints] = useState("");
  const [solution, setSolution] = useState("");
  const [busy, setBusy] = useState<"ai" | "save" | null>(null);

  function fill(d: CustomProblemDraft) {
    setStatement(d.statementMd);
    setTitle(d.title);
    setDifficulty(d.difficulty);
    setTopic(d.topic);
    setFunctionName(d.functionName);
    setParams(d.params);
    setReturnType(d.returnType);
    setCompare(d.compare);
    setCasesText(formatCaseLines(d.cases));
    setHints(d.hints.join("\n"));
    setSolution(d.solution ?? "");
  }

  async function aiFill() {
    if (busy) return;
    setBusy("ai");
    try {
      const res = await draftFromStatementAction({ statement });
      if (!res.ok) return void toast.error(res.error);
      fill(res.draft);
      toast.success("Filled in. Review the signature and cases, then save.");
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = parseCaseLines(casesText);
    if (!parsed.ok) return void toast.error(parsed.error);
    setBusy("save");
    try {
      const draft = {
        title,
        difficulty,
        topic: topic || "General",
        statementMd: statement,
        functionName,
        params,
        returnType,
        compare,
        cases: parsed.cases,
        hints: hints
          .split("\n")
          .map((h) => h.trim())
          .filter(Boolean)
          .slice(0, 3),
        solution: solution.trim() || undefined,
      };
      const checked = await verifyDraft(draft);
      if (!checked.ok) return void toast.error(checked.error);
      const saved = await saveCustomProblemAction({ source: "pasted", problem: checked.problem });
      if (!saved.ok) return void toast.error(saved.error);
      toast.success(checked.dropped ? `Saved. ${checked.dropped} case(s) disagreed with your reference solution and were dropped.` : "Problem saved");
      router.push(`/problems/${saved.slug}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:row-span-2">
        <CardHeader>
          <CardTitle>1 · Statement</CardTitle>
          <CardDescription>Paste the problem from anywhere: LeetCode, a company list, a book, an interview you had. Markdown is fine.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={18}
            maxLength={8000}
            required
            placeholder="Given an array of integers nums and an integer target, return indices of the two numbers that add up to target…"
            aria-label="Problem statement"
          />
          <Button type="button" variant="secondary" onClick={aiFill} disabled={busy !== null || statement.trim().length < 20}>
            {busy === "ai" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Sparkles />}
            {busy === "ai" ? "Reading the statement…" : "Fill the rest with AI"}
          </Button>
          <p className="text-xs text-muted-foreground">The AI proposes a title, signature, test cases, hints and a reference solution. You can edit everything before saving.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Title</Label>
              <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-diff">Difficulty</Label>
              <select id="p-diff" className={selectClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value as (typeof DIFFICULTIES)[number])}>
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-topic">Topic</Label>
              <Input id="p-topic" list="p-topics" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60} placeholder="Sliding Window" />
              <datalist id="p-topics">
                {topics.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-fn">Function name</Label>
              <Input id="p-fn" className="font-mono" value={functionName} onChange={(e) => setFunctionName(e.target.value)} required pattern="[A-Za-z_]\w{0,39}" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Parameters</p>
            {params.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Parameter ${i + 1} name`}
                  className="font-mono"
                  value={p.name}
                  onChange={(e) => setParams((ps) => ps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  required
                />
                <select
                  aria-label={`Parameter ${i + 1} type`}
                  className={selectClass}
                  value={p.type}
                  onChange={(e) => setParams((ps) => ps.map((x, j) => (j === i ? { ...x, type: e.target.value as Param["type"] } : x)))}
                >
                  {PARAM_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" disabled={params.length === 1} onClick={() => setParams((ps) => ps.filter((_, j) => j !== i))} aria-label={`Remove parameter ${i + 1}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {params.length < 6 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setParams((ps) => [...ps, { name: `arg${ps.length + 1}`, type: "number" }])}>
                <Plus /> Add parameter
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-ret">Returns</Label>
              <select id="p-ret" className={selectClass} value={returnType} onChange={(e) => setReturnType(e.target.value as (typeof RETURN_TYPES)[number])}>
                {RETURN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "void" ? "void (edits the first argument)" : t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cmp">Compare answers</Label>
              <select id="p-cmp" className={selectClass} value={compare} onChange={(e) => setCompare(e.target.value as "exact" | "unordered")}>
                <option value="exact">Exactly</option>
                <option value="unordered">Ignoring array order</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · Test cases</CardTitle>
          <CardDescription>One per line as [args] =&gt; expected. Start a line with hidden to keep it for Submit only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className={mono} value={casesText} onChange={(e) => setCasesText(e.target.value)} rows={7} placeholder={CASES_PLACEHOLDER} aria-label="Test cases" spellCheck={false} />
          <div className="space-y-1.5">
            <Label htmlFor="p-hints">Hints (optional, one per line, up to 3)</Label>
            <Textarea id="p-hints" value={hints} onChange={(e) => setHints(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-sol">Reference solution in JavaScript (optional, recommended)</Label>
            <Textarea id="p-sol" className={mono} value={solution} onChange={(e) => setSolution(e.target.value)} rows={6} spellCheck={false} placeholder={`function ${functionName || "solve"}(${params.map((p) => p.name).join(", ")}) {\n  // ...\n}`} />
            <p className="text-xs text-muted-foreground">If given, it runs against every case before saving and any case it disagrees with is dropped. It stays hidden until you choose to see it.</p>
          </div>
          <Button type="submit" disabled={busy !== null} className="w-full sm:w-auto">
            {busy === "save" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Save />}
            {busy === "save" ? "Checking and saving…" : "Check and save"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
