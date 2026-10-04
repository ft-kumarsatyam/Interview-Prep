"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { setFollowUpAction } from "@/app/(app)/jobs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The follow-up for one job: when you are next nudged, a draft message to copy, and ways to snooze, reschedule or mark it done. */
export function FollowUpPanel({ id, followUpOn, today, draft }: { id: string; followUpOn: string | null; today: string; draft: string }) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState(followUpOn ?? "");
  const due = followUpOn !== null && followUpOn <= today;

  const run = (input: Record<string, unknown>, ok: string) =>
    start(async () => {
      const res = await setFollowUpAction({ id, ...input });
      if (!res.ok) toast.error(`${res.error}.`);
      else toast.success(ok);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };

  return (
    <section aria-label="Follow-up" className="space-y-3 border-t pt-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="size-4 text-muted-foreground" aria-hidden /> Follow-up
      </h3>
      <p className={`text-sm ${due ? "font-medium text-day-left-dot" : "text-muted-foreground"}`}>
        {followUpOn === null ? "No follow-up is set." : due ? `A follow-up was due ${followUpOn === today ? "today" : `on ${followUpOn}`}.` : `Next nudge on ${followUpOn}.`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" disabled={pending} onClick={() => run({ mode: "done" }, "Marked as followed up. Next nudge in a week.")}>
          <Check /> I followed up
        </Button>
        {([1, 3, 7] as const).map((n) => (
          <Button key={n} size="sm" variant="outline" disabled={pending} onClick={() => run({ mode: "snooze", days: n }, `Snoozed for ${n === 7 ? "a week" : `${n} day${n === 1 ? "" : "s"}`}`)}>
            Snooze {n === 7 ? "1 week" : `${n} day${n === 1 ? "" : "s"}`}
          </Button>
        ))}
        {followUpOn !== null && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run({ mode: "stop" }, "Follow-up cleared")}>
            Stop reminders
          </Button>
        )}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) run({ mode: "date", date }, `Next nudge on ${date}`);
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="follow-up-date" className="text-xs">
            Or pick a day
          </Label>
          <Input id="follow-up-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending || !date}>
          Set
        </Button>
      </form>
      <div className="space-y-1.5">
        <Label htmlFor="follow-up-draft" className="text-xs">
          A message you can send (edit it first)
        </Label>
        <Textarea id="follow-up-draft" defaultValue={draft} rows={6} />
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy /> Copy message
        </Button>
      </div>
    </section>
  );
}
