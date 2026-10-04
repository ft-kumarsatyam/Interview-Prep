"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, Check, Download, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { saveVersionAction, tailorResumeAction } from "@/app/(app)/resume/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { scoreResume } from "@/modules/jobs/domain/ats";
import { parseResumeText } from "@/modules/resume/domain/resume";
import { applyChanges, renderResumeText, type Change, type Rejected } from "@/modules/resume/domain/resume-tailor";

const pretty = (t: string) => (t.length <= 4 || /[./]/.test(t) ? (t.length <= 4 ? t.toUpperCase() : t) : t.replace(/\b\w/g, (c) => c.toUpperCase()));
const KIND_LABEL = { summary: "Summary", bullet: "Bullet", skills: "Skills order" } as const;

/** Paste a JD, tick the skills you really have, review each proposed change, watch the score move, save a version. */
export function TailorWorkbench({ baseText, initialJd = "", initialCompany = "", initialRole = "", jobId }: { baseText: string; initialJd?: string; initialCompany?: string; initialRole?: string; jobId?: string }) {
  const [jd, setJd] = useState(initialJd);
  const [company, setCompany] = useState(initialCompany);
  const [role, setRole] = useState(initialRole);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const [result, setResult] = useState<{ changes: Change[]; rejected: Rejected[]; source: "ai" | "rules" } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [savedId, setSavedId] = useState<string | null>(null);

  const doc = useMemo(() => parseResumeText(baseText), [baseText]);
  const before = useMemo(() => (jd.trim().length > 40 ? scoreResume(baseText, { jd, doc }) : null), [baseText, jd, doc]);
  const gaps = before?.keywords?.hits.filter((h) => !h.found) ?? [];

  const chosen = useMemo(() => (result ? result.changes.filter((c) => picked.has(c.id)) : []), [result, picked]);
  const addSkills = useMemo(() => [...approved].map(pretty), [approved]);
  const finalText = useMemo(() => renderResumeText(applyChanges(doc, chosen, addSkills)), [doc, chosen, addSkills]);
  const after = useMemo(() => (result && jd.trim().length > 40 ? scoreResume(finalText, { jd }) : null), [result, finalText, jd]);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (!next.delete(key)) next.add(key);
    return next;
  };

  const run = () =>
    start(async () => {
      setSavedId(null);
      const res = await tailorResumeAction({ jd, approved: [...approved] });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setResult({ changes: res.changes, rejected: res.rejected, source: res.source });
      setPicked(new Set(res.changes.map((c) => c.id)));
    });

  const save = () =>
    startSave(async () => {
      const res = await saveVersionAction({ label: [company, role].filter(Boolean).join(" - ") || "Tailored resume", company, role, jd, text: finalText, jobId });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setSavedId(res.id);
      toast.success("Version saved");
    });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>The job</CardTitle>
            <CardDescription>Paste the job description. Nothing is added to your resume that it doesn&apos;t already say, except skills you tick below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="t-company">Company</Label>
                <Input id="t-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="e.g. Razorpay" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-role">Role</Label>
                <Input id="t-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={160} placeholder="e.g. Backend Engineer" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-jd">Job description</Label>
              <Textarea id="t-jd" value={jd} onChange={(e) => setJd(e.target.value)} rows={12} maxLength={20_000} placeholder="Paste the job description here…" />
            </div>
          </CardContent>
        </Card>

        {gaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills this job wants that your resume doesn&apos;t mention</CardTitle>
              <CardDescription>Tick only the ones you genuinely have. They are added to Skills and may then be used in rewrites. Leave the rest: an interviewer will ask.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {gaps.map((g) => (
                  <li key={g.term}>
                    <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm pointer-coarse:min-h-11 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10">
                      <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={approved.has(g.term)} onChange={() => setApproved((s) => toggle(s, g.term))} />
                      {pretty(g.term)}
                      {g.nice && <span className="text-xs text-muted-foreground">nice to have</span>}
                    </label>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button onClick={run} loading={pending} disabled={jd.trim().length < 80}>
          {!pending && <Sparkles />} Tailor my resume
        </Button>
      </div>

      <div className="space-y-4">
        {!result ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Paste a job description and tailor to see proposed changes, each one yours to accept or reject.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>ATS score for this job</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <span className="tabular font-mono text-3xl font-semibold">{before?.score ?? "–"}</span>
                <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
                <span className="tabular font-mono text-3xl font-semibold text-success">{after?.score ?? "–"}</span>
                {before && after && <ToneBadge tone={after.score >= before.score ? "success" : "warning"}>{after.score >= before.score ? "+" : ""}{after.score - before.score} points</ToneBadge>}
                {after?.keywords && <span className="ml-auto text-xs text-muted-foreground">keyword match {after.keywords.matchPct}%</span>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proposed changes</CardTitle>
                <CardDescription>
                  {result.source === "ai" ? "Written by AI and checked against your resume's facts." : "No AI answered, so the only change offered is putting the skills this job names first."} Untick any you don&apos;t want.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.changes.length === 0 && <p className="text-sm text-muted-foreground">Nothing to change that stays within what your resume already says.</p>}
                {result.changes.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary/30">
                    <input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={picked.has(c.id)} onChange={() => setPicked((s) => toggle(s, c.id))} />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <ToneBadge>{KIND_LABEL[c.kind]}</ToneBadge>
                        {c.kind === "bullet" && c.where}
                      </span>
                      {c.before && <span className="block text-muted-foreground line-through decoration-destructive/50">{c.before}</span>}
                      <span className="block font-medium">{c.after}</span>
                      {c.reason && <span className="block text-xs text-muted-foreground">{c.reason}</span>}
                    </span>
                  </label>
                ))}
                {result.rejected.length > 0 && (
                  <details className="rounded-lg border p-3 text-sm">
                    <summary className="cursor-pointer font-medium">{result.rejected.length} suggestion{result.rejected.length === 1 ? "" : "s"} blocked to keep your resume honest</summary>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {result.rejected.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <X className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden /> {r.why}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Save this version</CardTitle>
                <CardDescription>Saved separately: your base resume stays as it is.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} loading={saving} disabled={Boolean(savedId)}>
                    {!saving && (savedId ? <Check /> : <Save />)} {savedId ? "Saved" : "Save version"}
                  </Button>
                  {savedId &&
                    (["pdf", "docx", "txt"] as const).map((f) => (
                      <Button key={f} variant="outline" asChild>
                        <a href={`/api/resume/${savedId}/download?format=${f}`}>
                          <Download /> {f.toUpperCase()}
                        </a>
                      </Button>
                    ))}
                </div>
                {savedId && (
                  <p className="text-xs text-muted-foreground">
                    {jobId && (
                      <>
                        Linked to the tracked job: <Link href={`/jobs/${jobId}`} className="underline">open it</Link> to apply.{" "}
                      </>
                    )}
                    Find it later under <Link href="/resume" className="underline">Resume</Link>. Open the PDF and read it through before you send it.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
