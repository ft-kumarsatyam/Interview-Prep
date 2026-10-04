"use client";

import { useTransition } from "react";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { resolveProposalAction } from "@/app/(app)/plan/setup/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** The weekly suggestion: what would change and why, applied only when you say so. */
export function ProposalCard({ lines }: { lines: string[] }) {
  const [pending, start] = useTransition();
  const decide = (d: "apply" | "dismiss") =>
    start(async () => {
      const res = await resolveProposalAction(d);
      if (!res.ok) toast.error(res.error);
      else toast.success(d === "apply" ? "Applied. It's in the change log below." : "Dismissed for this week.");
    });
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" aria-hidden /> Suggested changes for this week
        </CardTitle>
        <CardDescription>Based on your quiz results and the time you have left. Nothing changes until you apply it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button type="button" onClick={() => decide("apply")} loading={pending}>Apply</Button>
          <Button type="button" variant="ghost" onClick={() => decide("dismiss")} disabled={pending}>Dismiss</Button>
        </div>
      </CardContent>
    </Card>
  );
}
