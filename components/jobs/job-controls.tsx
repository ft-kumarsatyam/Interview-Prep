"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteJobAction, saveJobNotesAction, setJobStatusAction } from "@/app/(app)/jobs/actions";
import { Chip } from "@/components/shared/chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JOB_STATUSES, STATUS_LABEL, type JobStatus } from "@/lib/domain/jobs";

/** Move the job along the pipeline, keep notes, delete it. */
export function JobControls({ id, status, notes }: { id: string; status: JobStatus; notes: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(notes);
  const [current, setCurrent] = useState(status);

  const move = (s: JobStatus) =>
    start(async () => {
      const prev = current;
      setCurrent(s);
      const res = await setJobStatusAction({ id, status: s });
      if (!res.ok) {
        setCurrent(prev);
        toast.error(`${res.error}.`);
      } else toast.success(`Marked ${STATUS_LABEL[s].toLowerCase()}`);
    });
  const saveNotes = () =>
    start(async () => {
      const res = await saveJobNotesAction({ id, notes: text });
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success("Notes saved");
    });
  const remove = () => {
    if (!window.confirm("Delete this job from your tracker?")) return;
    start(async () => {
      const res = await deleteJobAction({ id });
      if (!res.ok) return void toast.error(`${res.error}.`);
      router.push("/jobs/tracker");
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Stage</Label>
        <div role="group" aria-label="Pipeline stage" className="flex flex-wrap gap-1.5">
          {JOB_STATUSES.map((s) => (
            <Chip key={s} pressed={current === s} onClick={() => move(s)} disabled={pending}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="job-notes">Notes</Label>
        <Textarea id="job-notes" value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} placeholder="Recruiter, referral, salary range, what to ask…" />
        <Button variant="outline" size="sm" onClick={saveNotes} disabled={pending || text === notes}>
          <Check /> Save notes
        </Button>
      </div>
      <Button variant="ghost" className="text-destructive" onClick={remove} disabled={pending}>
        <Trash2 /> Delete job
      </Button>
    </div>
  );
}
