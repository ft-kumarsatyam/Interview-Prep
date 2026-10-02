"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
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

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs" aria-label={`${label} (diagram source)`}>
        {code}
      </pre>
    );
  }
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="flex min-h-48 items-center overflow-x-auto rounded-xl border bg-card p-4 sm:justify-center [&_svg]:h-auto [&_svg]:max-w-none! [&_svg]:min-w-[640px] [&_svg]:shrink-0 sm:[&_svg]:max-w-full! sm:[&_svg]:min-w-0"
    >
      <span className="mx-auto text-sm text-muted-foreground">Drawing diagram…</span>
    </div>
  );
}
