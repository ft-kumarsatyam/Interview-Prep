"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BRIDGE_ATTR, buildAskRequest, parseBridgeReply, resultMessage } from "@/modules/ai/domain/ask-bridge";
import { resolveGeminiLink, type AskSubject } from "@/modules/ai/domain/ask-subjects";
import { cn } from "@/core/utils";
import { useAi } from "@/modules/ai/components/ai-context";

/** True when the PrepOS Chrome extension (extension/) has announced itself on this page. */
export function extensionInstalled(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(BRIDGE_ATTR);
}

/** Hands the prompt to the extension, which fills your open Gemini tab. Resolves false if it never answers. */
function sendViaExtension(prompt: string, url: string): Promise<boolean> {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    let received = false;
    const timers: number[] = [];
    const finish = (ok: boolean) => {
      window.removeEventListener("message", onMessage);
      timers.forEach(window.clearTimeout);
      resolve(ok);
    };
    function onMessage(e: MessageEvent) {
      if (e.source !== window || e.origin !== window.location.origin) return;
      const reply = parseBridgeReply(e.data);
      if (!reply || reply.id !== id) return;
      if (reply.type === "received") {
        received = true;
        return;
      }
      if (reply.ok) toast.success(resultMessage(reply));
      else toast.message(resultMessage(reply));
      finish(true);
    }
    window.addEventListener("message", onMessage);
    // No reply at all means the extension is gone (disabled mid-session): let the caller open the tab.
    timers.push(window.setTimeout(() => !received && finish(false), 800));
    // Opening a missing Gemini tab and waiting for the box can take a while.
    timers.push(window.setTimeout(() => finish(true), 45_000));
    window.postMessage(buildAskRequest(id, prompt, url), window.location.origin);
  });
}

/**
 * Asks Gemini. With the PrepOS extension installed it fills and sends the prompt in your
 * already-open Gemini tab. Without it, it copies the prompt and opens your Gemini project,
 * because Gemini can't be pre-filled from a link. `prompt` can be a function so it reads your latest code.
 */
export function AskGemini({
  subject,
  prompt,
  label = "Ask Gemini",
  variant = "outline",
  size = "sm",
  className,
}: {
  subject: AskSubject;
  prompt: string | (() => string);
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "xs";
  className?: string;
}) {
  const { links } = useAi();

  function ask() {
    const text = typeof prompt === "function" ? prompt() : prompt;
    const url = resolveGeminiLink(links, subject);
    // The clipboard copy is the safety net on every path. Start it in the click, before any await.
    const copying = navigator.clipboard?.writeText(text);
    const openTab = () => window.open(url, "_blank", "noopener,noreferrer");

    if (extensionInstalled()) {
      void sendViaExtension(text, url).then((handled) => {
        if (!handled) {
          openTab();
          toast.message("Gemini opened. Paste the prompt: it is on your clipboard.");
        }
      });
      return;
    }

    // Safari blocks a window opened after an await, so open the tab in the same click.
    openTab();
    if (!copying) return toast.message("Gemini opened. Copy the question yourself: the browser blocked automatic copying.");
    copying.then(
      () => toast.success("Prompt copied. Paste it into your Gemini project."),
      () => toast.message("Gemini opened, but the browser blocked copying. Select the question text and copy it."),
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={ask}
      className={cn(className)}
      title="Copies a ready-made prompt and opens your Gemini project (with the PrepOS extension it fills your open Gemini tab instead)"
    >
      <Sparkles /> {label}
    </Button>
  );
}
