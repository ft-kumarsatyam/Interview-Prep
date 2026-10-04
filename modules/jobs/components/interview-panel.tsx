"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { setInterviewAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Your next interview for this job: the day, the round and who you talk to. It shows on the calendar next to your study plan. */
export function InterviewPanel({ id, interviewOn, round, contact, today }: { id: string; interviewOn: string | null; round: string; contact: string; today: string }) {
  const [pending, start] = useTransition();
  const [v, setV] = useState({ date: interviewOn ?? "", round, contact });
  const save = (clear: boolean) =>
    start(async () => {
      const res = await setInterviewAction({ id, date: clear ? null : v.date || null, round: clear ? "" : v.round, contact: clear ? "" : v.contact });
      if (!res.ok) return void toast.error(`${res.error}.`);
      if (clear) setV({ date: "", round: "", contact: "" });
      toast.success(clear ? "Interview removed" : "Interview saved. It is on your calendar.");
    });

  return (
    <section aria-label="Interview" className="space-y-3 border-t pt-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4 text-muted-foreground" aria-hidden /> Interview
      </h3>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="interview-date" className="text-xs">
            Day
          </Label>
          <Input id="interview-date" type="date" min={today} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="interview-round" className="text-xs">
            Round
          </Label>
          <Input id="interview-round" value={v.round} maxLength={60} placeholder="Technical, system design…" onChange={(e) => setV({ ...v, round: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="interview-contact" className="text-xs">
            Contact
          </Label>
          <Input id="interview-contact" value={v.contact} maxLength={200} placeholder="Name or email" onChange={(e) => setV({ ...v, contact: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
          <Button type="submit" size="sm" disabled={pending || !v.date}>
            Save interview
          </Button>
          {interviewOn && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => save(true)}>
              Remove
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href="/mock">Practise with a mock</Link>
          </Button>
          {interviewOn && (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/calendar/${interviewOn}`}>See that day</Link>
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
