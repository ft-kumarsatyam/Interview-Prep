"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { savePostingAction } from "@/app/(app)/jobs/discover-actions";
import { TailorWorkbench } from "@/modules/resume/components/tailor-workbench";
import { Button } from "@/components/ui/button";

/**
 * The resume upgrade, on the same page as the job. Starting it saves the job to your tracker first (the
 * tailored version is linked to it), then opens the same fact-checked tailoring tool used on /resume/tailor.
 */
export function TailorSection({ postingId, savedJobId, baseText, jd, company, title }: { postingId: string; savedJobId: string | null; baseText: string; jd: string; company: string; title: string }) {
  const [jobId, setJobId] = useState(savedJobId);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const begin = () =>
    start(async () => {
      if (!jobId) {
        const res = await savePostingAction({ id: postingId });
        if (!res.ok) return void toast.error(`${res.error}.`);
        setJobId(res.jobId);
      }
      setOpen(true);
    });

  if (open && jobId) return <TailorWorkbench baseText={baseText} initialJd={jd} initialCompany={company} initialRole={title} jobId={jobId} />;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
      <Button onClick={begin} loading={pending} disabled={jd.trim().length < 80}>
        {!pending && <Sparkles />} Upgrade my resume for this job
      </Button>
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">{jd.trim().length < 80 ? "This posting has no description to tailor against. Open the company's page and paste it on the tailor screen." : "Suggests changes that stay within what your resume already says. You review each one, then download the version."}</p>
    </div>
  );
}
