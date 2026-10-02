"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Code2, Maximize2, MoveHorizontal } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Renders a mermaid flowchart from data/system-design.json. The library is
 * imported only when a diagram mounts. `securityLevel: "strict"` makes
 * mermaid sanitise labels and disable click handlers; the source is repo
 * content, never user or LLM text.
 */
export function MermaidDiagram({ code, label }: { code: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "neutral",
          fontFamily: "inherit",
          flowchart: { htmlLabels: false, curve: "basis" },
        });
        const out = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(out.svg);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id, resolvedTheme]);

  useEffect(() => {
    if (ref.current && svg) ref.current.innerHTML = svg;
  }, [svg]);

  const source = (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs" aria-label={`${label} (diagram source)`}>
      {code}
    </pre>
  );

  if (failed) return source;

  return (
    <figure className="min-w-0 space-y-2">
      <div className="relative">
        <div
          ref={ref}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="flex min-h-48 items-center overflow-x-auto rounded-xl border bg-card p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:justify-center [&_svg]:h-auto [&_svg]:max-w-none! [&_svg]:min-w-[640px] [&_svg]:shrink-0 sm:[&_svg]:max-w-full! sm:[&_svg]:min-w-0"
        >
          {!svg && (
            <div className="w-full space-y-3" aria-busy="true">
              <span className="sr-only">Drawing diagram…</span>
              <Skeleton className="mx-auto h-8 w-40" />
              <Skeleton className="mx-auto h-8 w-64 max-w-full" />
              <Skeleton className="mx-auto h-8 w-52" />
            </div>
          )}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 sm:hidden">
          <MoveHorizontal className="size-3.5" aria-hidden /> Swipe to pan
        </span>
        <span className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowSource((v) => !v)} aria-expanded={showSource}>
            <Code2 /> {showSource ? "Hide source" : "Source"}
          </Button>
          <Button size="sm" variant="ghost" className="h-9" onClick={() => setExpanded(true)} disabled={!svg}>
            <Maximize2 /> Expand
          </Button>
        </span>
      </figcaption>
      {showSource && source}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-[90dvh] max-w-[calc(100vw-1rem)] flex-col gap-3 p-3 sm:max-w-[min(96vw,1400px)] sm:p-4">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="sr-only">Full-size diagram. Scroll to pan.</DialogDescription>
          </DialogHeader>
          <div
            role="img"
            aria-label={label}
            className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-none! [&_svg]:min-w-[900px]"
            ref={(el) => {
              if (el && svg) el.innerHTML = svg;
            }}
          />
        </DialogContent>
      </Dialog>
    </figure>
  );
}
