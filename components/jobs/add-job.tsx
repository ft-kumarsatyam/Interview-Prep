"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addJobAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Add a job by hand: its link, title, company and the pasted description. (The extension fills the same fields from a job page.) */
export function AddJob({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ title: "", company: "", url: "", location: "", jd: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addJobAction({ ...v, location: v.location || undefined });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success(res.duplicate ? "You already track this job" : "Job saved");
      router.push(`/jobs/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-4" aria-label="Add a job">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="j-title">Job title</Label>
          <Input id="j-title" value={v.title} onChange={set("title")} maxLength={200} required placeholder="Backend Engineer" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-company">Company</Label>
          <Input id="j-company" value={v.company} onChange={set("company")} maxLength={160} required placeholder="Razorpay" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-url">Link to the posting</Label>
          <Input id="j-url" type="url" value={v.url} onChange={set("url")} maxLength={2000} required placeholder="https://…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-loc">Location (optional)</Label>
          <Input id="j-loc" value={v.location} onChange={set("location")} maxLength={160} placeholder="Bengaluru, hybrid" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="j-jd">Job description</Label>
        <Textarea id="j-jd" value={v.jd} onChange={set("jd")} rows={6} maxLength={20_000} placeholder="Paste the description. You need it to tailor your resume." />
      </div>
      <Button type="submit" loading={pending} disabled={disabled}>
        {!pending && <Plus />} Save job
      </Button>
      {disabled && <p className="text-xs text-muted-foreground">You have reached the limit. Delete old jobs to add more.</p>}
    </form>
  );
}
