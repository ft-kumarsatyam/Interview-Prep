"use client";

import type { ComponentType } from "react";
import { CircleAlert, Loader2 } from "lucide-react";

export type ErState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; code: string };

/** The entity-relationship diagram of the current database. `Diagram` renders Mermaid text (supplied by the page). */
export function ErView({ state, Diagram }: { state: ErState; Diagram: ComponentType<{ code: string; label: string }> }) {
  if (state.status === "loading")
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Reading the schema…
      </p>
    );
  if (state.status === "error")
    return (
      <p role="alert" className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return <Diagram code={state.code} label="Entity-relationship diagram of the tables" />;
}
