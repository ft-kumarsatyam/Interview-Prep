"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Flame, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { roastResumeAction, saveResumeAction } from "@/app/(app)/resume/actions";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { scoreResume, type AtsResult } from "@/lib/domain/ats";
import { parseResumeText } from "@/lib/domain/resume";
import type { ResumeRoast } from "@/lib/domain/resume-ai";
import { ROAST_LEVEL_LABEL, type RoastLevel } from "@/lib/domain/roast";

const VERDICT_TONE = { strong: "success", good: "info", "needs work": "warning", weak: "danger" } as const;
const scoreTone = (s: number) => (s >= 80 ? "text-success" : s >= 65 ? "text-info" : s >= 50 ? "text-warning" : "text-destructive");

/** Resume text, JD and live ATS score in the browser (the scorer is pure), plus save and roast through Server Actions. */
export function ResumeWorkbench({ initialText, saved, roastLevel, profileId }: { initialText: string; saved: boolean; roastLevel: RoastLevel; profileId?: string }) {
  const [text, setText] = useState(initialText);
  const [jd, setJd] = useState("");
  const [isSaved, setSaved] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, startSave] = useTransition();
  const [roasting, startRoast] = useTransition();
  const [roast, setRoast] = useState<{ roast: ResumeRoast; source: "ai" | "rules" } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const doc = useMemo(() => parseResumeText(text), [text]);
  const ats: AtsResult | null = useMemo(() => (text.trim().length >= 50 ? scoreResume(text, { jd, doc }) : null), [text, jd, doc]);

  async function upload(f: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", f);
      const res = await fetch("/api/resume/parse", { method: "POST", body });
      const data = (await res.json()) as { ok: boolean; text?: string; error?: string; truncated?: boolean };
      if (!data.ok || !data.text) return void toast.error(data.error ?? "Couldn't read that file");
      setText(data.text);
      setDirty(true);
      setRoast(null);
      toast.success(data.truncated ? "Read it, but it was cut to the size limit. Check the end." : "Read it. Check the text, then save.");
    } catch {
      toast.error("The upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  }

  const save = () =>
    startSave(async () => {
      const res = await saveResumeAction({ text });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setSaved(true);
      setDirty(false);
      toast.success("Resume saved");
    });

  const runRoast = () =>
    startRoast(async () => {
      if (!profileId && (dirty || !isSaved)) {
        const s = await saveResumeAction({ text });
        if (!s.ok) return void toast.error(`${s.error}.`);
        setSaved(true);
        setDirty(false);
      }
      const res = await roastResumeAction({ jd: jd.trim() || undefined, id: profileId });
      if (!res.ok) return void toast.error(`${res.error}.`);
      setRoast({ roast: res.roast, source: res.source });
    });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{profileId ? "Your profile" : "Your resume"}</CardTitle>
            <CardDescription>Upload a PDF, DOCX or TXT, or paste the text. File text can come out scrambled, so check it below: that is what an ATS sees too.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileId ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">This is a snapshot of your profile page, read-only. It is scored and roasted like a resume so you can fix the real profile on the site.</p>
            ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input ref={file} type="file" accept=".pdf,.docx,.txt,.md,application/pdf" className="sr-only" id="resume-file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button type="button" variant="outline" loading={uploading} onClick={() => file.current?.click()}>
                {!uploading && <Upload />} Upload file
              </Button>
              <Button type="button" onClick={save} loading={saving} disabled={!dirty || text.trim().length < 50}>
                {!saving && <Save />} {isSaved && !dirty ? "Saved" : "Save"}
              </Button>
              {isSaved && !dirty && <Check className="size-4 text-success" aria-hidden />}
            </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="resume-text">Resume text</Label>
              <Textarea
                id="resume-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setDirty(true);
                }}
                rows={18}
                readOnly={Boolean(profileId)}
                className="font-mono text-xs"
                placeholder="Paste your resume here…"
                maxLength={60_000}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job description (optional)</CardTitle>
            <CardDescription>Paste a JD to score keyword match and get missing skills. The score updates as you type.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="jd-text" className="sr-only">
              Job description
            </Label>
            <Textarea id="jd-text" value={jd} onChange={(e) => setJd(e.target.value)} rows={8} placeholder="Paste the job description here…" maxLength={20_000} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {!ats ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Add your resume to see its ATS score.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  ATS score <ToneBadge tone={VERDICT_TONE[ats.verdict]}>{ats.verdict}</ToneBadge>
                </CardTitle>
                <CardDescription>{jd.trim().length > 40 ? "Includes a match against your job description." : "General ATS readiness. Add a job description to score a specific role."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className={`tabular font-mono text-4xl font-semibold ${scoreTone(ats.score)}`} aria-label={`ATS score ${ats.score} out of 100`}>
                    {ats.score}
                  </span>
                  <Progress value={ats.score} aria-label="ATS score" className="h-2.5" />
                </div>
                {ats.keywords && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Keyword match: <span className="tabular font-mono">{ats.keywords.matchPct}%</span>
                    </p>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Keywords from the job description">
                      {ats.keywords.hits.map((h) => (
                        <li key={h.term}>
                          <ToneBadge tone={h.found ? "success" : h.nice ? "neutral" : "danger"} icon={h.found ? Check : AlertTriangle}>
                            {h.term}
                            {h.nice ? " (nice)" : ""}
                            {h.found ? "" : " missing"}
                          </ToneBadge>
                        </li>
                      ))}
                    </ul>
                    {ats.missing.length > 0 && <p className="text-xs text-muted-foreground">Only add a keyword if you really have the skill. Missing ones you do have belong in Skills and in a bullet that proves it.</p>}
                  </div>
                )}
                {ats.topFixes.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium">Biggest wins</p>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      {ats.topFixes.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {ats.checks.map((c) => (
                    <li key={c.id}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{c.label}</span>
                        <span className="tabular font-mono text-xs text-muted-foreground">{Math.round(c.score * 100)}%</span>
                      </div>
                      <Progress value={c.score * 100} aria-label={c.label} className="my-1 h-1.5" />
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                      {c.fix && c.score < 0.95 && <p className="mt-0.5 text-xs">{c.fix}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="size-4 text-streak" aria-hidden /> Roast my resume
                </CardTitle>
                <CardDescription>
                  Tone: {ROAST_LEVEL_LABEL[roastLevel]} (change it in Settings). Uses the free AI when one is configured, otherwise a rules-based roast. Your resume text goes only to that provider, never to the paid one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runRoast} loading={roasting}>
                  {!roasting && <Flame />} {roast ? "Roast again" : "Roast it"}
                </Button>
                {roast && (
                  <div className="space-y-4 text-sm">
                    <p className="text-base font-medium text-pretty">{roast.roast.headline}</p>
                    <Block title="What works" items={roast.roast.strengths} />
                    <Block title="What's wrong" items={roast.roast.roasts} />
                    <div>
                      <p className="mb-1.5 font-medium">Fixes</p>
                      <ul className="space-y-3">
                        {roast.roast.fixes.map((f, i) => (
                          <li key={i} className="rounded-lg border p-3">
                            {f.before && <p className="text-muted-foreground line-through decoration-destructive/50">{f.before}</p>}
                            <p className="font-medium">{f.after}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{f.why}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">{roast.source === "ai" ? "Written by AI from your resume. Check every number before using a rewrite: placeholders like [X%] are yours to fill." : "Rules-based roast (no AI provider answered). It only uses the automated checks above."}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 font-medium">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
