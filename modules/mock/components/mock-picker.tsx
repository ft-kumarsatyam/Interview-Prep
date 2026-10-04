"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Braces, Code2, Database, Layers, Loader2, MessageSquare, Network, Play, Rocket, Server, Timer } from "lucide-react";
import { toast } from "sonner";
import { previewProjectAction, startMockAction, type ProjectPreview } from "@/app/(app)/mock/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_CONFIG, MOCK_TYPES, ROUND_TITLE, type MockType } from "@/modules/mock/domain/mock";

const ICON: Record<MockType, typeof Code2> = {
  dsa: Code2,
  javascript: Braces,
  node: Server,
  hld: Network,
  lld: Layers,
  sql: Database,
  project: Rocket,
  behavioral: MessageSquare,
  full: Timer,
};

const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";
const AI_TOPICS = new Set<MockType>(["node", "lld", "project", "behavioral"]);

export function MockPicker({ customCount, aiConfigured }: { customCount: number; aiConfigured: boolean }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<MockType | null>(null);
  const [source, setSource] = useState<"mixed" | "sheet" | "custom">("mixed");
  const [aiQuestions, setAiQuestions] = useState(aiConfigured);
  const [project, setProject] = useState("");
  const [repo, setRepo] = useState("");
  const [site, setSite] = useState("");
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const config = chosen ? MOCK_CONFIG[chosen] : null;
  const hasCoding = !!config?.rounds.some((r) => r.coding);
  const hasAi = !!chosen && config!.rounds.some((r) => AI_TOPICS.has(r.topic));

  async function start() {
    if (!chosen || busy) return;
    setBusy(true);
    try {
      const res = await startMockAction({ type: chosen, source: customCount ? source : "sheet", aiQuestions: aiQuestions && aiConfigured, project: chosen === "project" ? project : undefined, projectRepo: chosen === "project" && repo.trim() ? repo : undefined, projectSite: chosen === "project" && repo.trim() && site.trim() ? site : undefined });
      if (res.ok) return router.push(`/mock/${res.id}`);
      if ("resumeId" in res && res.resumeId) {
        toast.error(res.error, { action: { label: "Resume", onClick: () => router.push(`/mock/${res.resumeId}`) } });
      } else toast.error(res.error);
      setBusy(false);
    } catch {
      setBusy(false);
      toast.error("Couldn't start the mock");
    }
  }

  async function checkProject() {
    if (checking || !repo.trim()) return;
    setChecking(true);
    setPreview(null);
    try {
      const res = await previewProjectAction({ repoUrl: repo, ...(site.trim() ? { siteUrl: site } : {}) });
      if (res.ok) setPreview(res.preview);
      else toast.error(`${res.error}.`);
    } catch {
      toast.error("Couldn't read the project");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_TYPES.map((t) => {
          const c = MOCK_CONFIG[t];
          const Icon = ICON[t];
          return (
            <li key={t}>
              <button
                type="button"
                onClick={() => setChosen(t)}
                className="flex h-full w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular">{c.minutes} min</span>
                </span>
                <span className="text-sm text-muted-foreground">{c.blurb}</span>
                <span className="mt-auto text-xs text-muted-foreground">Real interviews: {c.range}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={chosen !== null} onOpenChange={(o) => !o && !busy && setChosen(null)}>
        <DialogContent className="sm:max-w-lg">
          {config && (
            <>
              <DialogHeader>
                <DialogTitle>{config.label} · {config.minutes} minutes</DialogTitle>
                <DialogDescription>
                  The timer starts now and keeps running if you refresh or close the tab. At zero, whatever you&apos;ve written is submitted. Mocks never affect your streak.
                </DialogDescription>
              </DialogHeader>
              <ol className="space-y-1 text-sm">
                {config.rounds.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 rounded-md bg-muted/40 px-3 py-1.5">
                    <span>
                      {ROUND_TITLE[r.topic]}
                      <span className="text-muted-foreground"> · {[r.coding && `${r.coding} problem${r.coding > 1 ? "s" : ""}`, r.mcq && `${r.mcq} output questions`, r.written && `${r.written} written`].filter(Boolean).join(", ")}</span>
                    </span>
                    <span className="tabular text-muted-foreground">{r.minutes}m</span>
                  </li>
                ))}
              </ol>
              {hasCoding && customCount > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="mock-source">Coding problems from</Label>
                  <select id="mock-source" className={selectClass} value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                    <option value="mixed">My sheet and my own problems</option>
                    <option value="sheet">The DSA sheet only</option>
                    <option value="custom">My own problems only ({customCount})</option>
                  </select>
                </div>
              )}
              {hasAi && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={aiQuestions && aiConfigured} disabled={!aiConfigured} onChange={(e) => setAiQuestions(e.target.checked)} />
                  <span>
                    Fresh questions from the AI
                    <span className="block text-xs text-muted-foreground">{aiConfigured ? "Falls back to the built-in question bank if the AI is busy." : "No AI key is set, so the built-in question bank is used."}</span>
                  </span>
                </label>
              )}
              {chosen === "project" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="mock-repo">GitHub repository (public)</Label>
                    <input id="mock-repo" type="url" inputMode="url" autoComplete="off" value={repo} onChange={(e) => { setRepo(e.target.value); setPreview(null); }} placeholder="https://github.com/you/your-project" className={selectClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mock-site">Live website (optional)</Label>
                    <input id="mock-site" type="url" inputMode="url" autoComplete="off" value={site} onChange={(e) => { setSite(e.target.value); setPreview(null); }} placeholder="https://your-project.vercel.app" className={selectClass} />
                  </div>
                  {repo.trim() && (
                    <Button type="button" variant="outline" size="sm" onClick={checkProject} disabled={checking}>
                      {checking ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}
                      {checking ? "Reading your project…" : "Check what PrepOS can read"}
                    </Button>
                  )}
                  {preview && (
                    <div className="rounded-lg border bg-muted/40 p-3 text-xs" aria-live="polite">
                      <p className="font-medium text-foreground">{preview.name}</p>
                      <p className="mt-1 text-muted-foreground">Stack: {preview.stack.join(", ") || "not detected"}</p>
                      <p className="mt-1 text-muted-foreground">Read {preview.filesRead.length} files: {preview.filesRead.slice(0, 6).join(", ")}{preview.filesRead.length > 6 ? ", …" : ""}</p>
                      {preview.note && <p className="mt-1 text-warning">{preview.note}</p>}
                      <p className="mt-1 text-muted-foreground">Secrets are stripped. The questions will be technical (about this code) and behavioral (about building it).</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="mock-project">Or describe it in words (optional)</Label>
                    <Textarea id="mock-project" rows={3} maxLength={2000} value={project} onChange={(e) => setProject(e.target.value)} placeholder="Used when there is no repository link: what it does, the stack, your role, scale." />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setChosen(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={start} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Play />}
                  {busy ? "Preparing questions…" : "Start the timer"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
