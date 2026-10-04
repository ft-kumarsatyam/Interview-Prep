"use client";

import { useEffect, useState } from "react";
import { CircleCheck, PlugZap } from "lucide-react";
import { extensionInstalled } from "@/modules/ai/components/ask-gemini";

/** Whether the PrepOS Chrome extension is connected, with install steps when it isn't. */
export function ExtensionStatus() {
  const [state, setState] = useState<"checking" | "yes" | "no">("checking");

  useEffect(() => {
    // The extension sets its marker shortly after load, so give it a moment before saying "not installed".
    const t = window.setTimeout(() => setState(extensionInstalled() ? "yes" : "no"), extensionInstalled() ? 0 : 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (state === "checking") return <p className="text-sm text-muted-foreground sm:col-span-2">Checking for the Chrome extension…</p>;
  if (state === "yes")
    return (
      <p className="inline-flex items-center gap-2 text-sm text-success sm:col-span-2" role="status">
        <CircleCheck className="size-4" aria-hidden /> Extension connected. &quot;Ask Gemini&quot; fills and sends the prompt in your open Gemini tab, and its toolbar button sends a job page or your profile to PrepOS.
      </p>
    );
  return (
    <div className="space-y-1 rounded-lg border border-dashed p-3 text-sm sm:col-span-2" role="status">
      <p className="flex items-center gap-2 font-medium">
        <PlugZap className="size-4 text-muted-foreground" aria-hidden /> Extension not detected
      </p>
      <p className="text-muted-foreground">
        To have &quot;Ask Gemini&quot; type the question into your already-open Gemini tab, load the <code className="font-mono text-xs">extension/</code> folder: open <code className="font-mono text-xs">chrome://extensions</code>, turn on Developer mode, choose Load unpacked, then reload this page. Without it, the prompt is copied and Gemini opens so you can paste.
      </p>
    </div>
  );
}
