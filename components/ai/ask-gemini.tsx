"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveGeminiLink, type AskSubject } from "@/lib/domain/ask-subjects";
import { cn } from "@/lib/utils";
import { useAi } from "./ai-context";

/**
 * Copies a ready-made prompt and opens your Gemini project for the subject. Gemini can't be
 * pre-filled from a link, so you paste it. `prompt` can be a function so it reads your latest code.
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
    // Start the copy and open the tab in the same click, before any await: Safari blocks a window opened later.
    const copying = navigator.clipboard?.writeText(text);
    window.open(resolveGeminiLink(links, subject), "_blank", "noopener,noreferrer");
    if (!copying) return toast.message("Gemini opened. Copy the question yourself: the browser blocked automatic copying.");
    copying.then(
      () => toast.success("Prompt copied. Paste it into your Gemini project."),
      () => toast.message("Gemini opened, but the browser blocked copying. Select the question text and copy it."),
    );
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={ask} className={cn(className)} title="Copies a ready-made prompt and opens your Gemini project">
      <Sparkles /> {label}
    </Button>
  );
}
