"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FilePlus2, Save } from "lucide-react";
import { toast } from "sonner";
import { addProjectToResumeAction, saveProjectMetaAction, setMilestoneAction } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Milestone {
  id: string;
  title: string;
  details: string[];
}

/** Milestone checklist, repo link and notes, and the button that puts the project on your resume. */
export function ProjectTracker({ slug, milestones, ticked, repoUrl, notes, hasResume }: { slug: string; milestones: Milestone[]; ticked: string[]; repoUrl: string; notes: string; hasResume: boolean }) {
  const [done, setDone] = useState(new Set(ticked));
  const [repo, setRepo] = useState(repoUrl);
  const [text, setText] = useState(notes);
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    start(async () => {
      const on = !done.has(id);
      setDone((s) => {
        const n = new Set(s);
        if (on) n.add(id);
        else n.delete(id);
        return n;
      });
      const res = await setMilestoneAction({ slug, milestoneId: id, ticked: on });
      if (!res.ok) {
        setDone(new Set(ticked));
        toast.error(`${res.error}.`);
      }
    });

  const saveMeta = () =>
    start(async () => {
      const res = await saveProjectMetaAction({ slug, repoUrl: repo, notes: text });
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success("Saved");
    });

  const toResume = () =>
    start(async () => {
      const res = await addProjectToResumeAction({ slug });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(res.added ? "Added to your resume. Replace every [X] with your real numbers." : "Already on your resume");
    });

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {milestones.map((m, i) => (
          <li key={m.id} className="rounded-xl border bg-card p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-primary)]" checked={done.has(m.id)} onChange={() => toggle(m.id)} disabled={pending} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${done.has(m.id) ? "text-muted-foreground line-through" : ""}`}>
                  {i + 1}. {m.title}
                </span>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {m.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </span>
            </label>
          </li>
        ))}
      </ol>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="repo">Repository link</Label>
          <Input id="repo" type="url" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/you/project" maxLength={300} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proj-notes">Notes</Label>
          <Textarea id="proj-notes" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={3000} placeholder="Decisions, problems, numbers you measured…" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveMeta} disabled={pending || (repo === repoUrl && text === notes)}>
            <Save /> Save
          </Button>
          {hasResume ? (
            <Button onClick={toResume} disabled={pending}>
              <FilePlus2 /> Add to my resume
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/resume">Save your resume to add this project</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
