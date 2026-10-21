"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { saveInterviewDebriefAction, setInterviewAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Your next interview for this job: the day, the round and who you talk to. It shows on the calendar next to your study plan. Once the day has passed, a debrief box opens so what happened gets written down while it is fresh. */
export function InterviewPanel({
  id,
  interviewOn,
  round,
  contact,
  interviewDebrief,
  interviewDebriefOn,
  today,
}: {
  id: string;
  interviewOn: string | null;
  round: string;
  contact: string;
  interviewDebrief: string;
  interviewDebriefOn: string | null;
  today: string;
}) {
  const [pending, start] = useTransition();
  const [v, setV] = useState({ date: interviewOn ?? "", round, contact });
  const save = (clear: boolean) =>
    start(async () => {
      const res = await setInterviewAction({ id, date: clear ? null : v.date || null, round: clear ? "" : v.round, contact: clear ? "" : v.contact });
      if (!res.ok) return void toast.error(`${res.error}.`);
      if (clear) setV({ date: "", round: "", contact: "" });
      toast.success(clear ? "Interview removed" : "Interview saved. It is on your calendar.");
    });

  const debriefDue = interviewOn !== null && interviewOn < today && interviewDebriefOn !== interviewOn;
  const [debrief, setDebrief] = useState(debriefDue ? "" : interviewDebrief);
  const saveDebrief = () =>
    start(async () => {
      const res = await saveInterviewDebriefAction({ id, text: debrief });
      if (!res.ok) return void toast.error(`${res.error}.`);
      toast.success("Debrief saved.");
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
      {interviewOn !== null && interviewOn < today && (
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="interview-debrief" className="text-xs">
            {debriefDue ? "How did it go?" : "Debrief"}
          </Label>
          <Textarea id="interview-debrief" value={debrief} maxLength={1000} placeholder="What went well, what didn't, what's next…" onChange={(e) => setDebrief(e.target.value)} rows={3} />
          <Button type="button" size="sm" disabled={pending || !debrief.trim()} onClick={saveDebrief}>
            Save debrief
          </Button>
        </div>
      )}
    </section>
  );
}
