"use client";

import { useSyncExternalStore } from "react";
import { Play, Volume2 } from "lucide-react";
import { feedback, feedbackOn, setFeedbackOn, subscribeFeedback } from "@/components/shared/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

/** Stored per device in localStorage, so a muted laptop does not mute the phone. */
export function FeedbackCard() {
  const on = useSyncExternalStore(subscribeFeedback, feedbackOn, () => true);

  return (
    <Card id="sound" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="size-4 text-muted-foreground" aria-hidden /> Sound and haptics
        </CardTitle>
        <CardDescription>
          A short sound and vibration when you tick a task, pass or miss a quiz, and a fanfare when the day completes and the streak grows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox checked={on} onCheckedChange={(v) => setFeedbackOn(v === true)} className="mt-0.5" />
          <span className="text-sm">
            On for this device
            <span className="block text-xs text-muted-foreground">
              On iPhone, sounds follow the silent switch, and vibration needs iOS 18 or later and only fires right after a tap.
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => feedback("tick")} disabled={!on}>
            <Play aria-hidden /> Task ticked
          </Button>
          <Button variant="outline" size="sm" onClick={() => feedback("pass")} disabled={!on}>
            <Play aria-hidden /> Quiz passed
          </Button>
          <Button variant="outline" size="sm" onClick={() => feedback("fail")} disabled={!on}>
            <Play aria-hidden /> Quiz missed
          </Button>
          <Button variant="outline" size="sm" onClick={() => feedback("complete")} disabled={!on}>
            <Play aria-hidden /> Day complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
