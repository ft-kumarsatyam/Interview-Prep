"use client";

import { useState } from "react";
import { Laugh, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KEY = "prepos:desi-mode";

/** Local-only tone switch: safe to turn off before screen sharing or an interview. */
export function DesiModeCard() {
  const [enabled, setEnabled] = useState(() => typeof window === "undefined" || window.localStorage.getItem(KEY) !== "off");

  const change = (next: boolean) => {
    setEnabled(next);
    window.localStorage.setItem(KEY, next ? "on" : "off");
    window.dispatchEvent(new Event("prepos:desi-mode"));
  };

  return (
    <Card id="comfort" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Laugh className="size-4 text-muted-foreground" aria-hidden /> Comfort mode
        </CardTitle>
        <CardDescription>
          Playful Hinglish loaders and break reminders make long sessions feel less robotic. This setting stays on this device and is easy to mute before screen sharing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Volume2 className="mt-0.5 size-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Desi mode</p>
            <p className="text-xs text-muted-foreground">{enabled ? "Playful lines are on" : "Clean, calm lines are on"}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle desi mode"
          onClick={() => change(!enabled)}
          className={`relative h-6 w-11 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${enabled ? "border-primary bg-primary" : "border-input bg-muted"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </CardContent>
    </Card>
  );
}
