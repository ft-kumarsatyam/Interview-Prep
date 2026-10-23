"use client";

import { ArrowDownUp, CircleAlert, GitMerge, Layers, Loader2, Lightbulb, ScanSearch, Search, Table2 } from "lucide-react";
import { cn } from "@/core/utils";
import type { PlanKind, PlanNode, QueryPlan } from "@/modules/dsa/domain/db-explain";

export type PlanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; plan: QueryPlan };

const KIND_STYLE: Record<PlanKind, string> = {
  scan: "border-warning/40 bg-warning/10 text-warning",
  search: "border-success/40 bg-success/10 text-success",
  sort: "border-info/40 bg-info/10 text-info",
  join: "border-primary/40 bg-primary/10 text-primary",
  agg: "border-border bg-muted text-muted-foreground",
  subquery: "border-border bg-muted text-muted-foreground",
  other: "border-border bg-muted text-muted-foreground",
};

const KIND_ICON = { scan: Table2, search: Search, sort: ArrowDownUp, join: GitMerge, agg: Layers, subquery: Layers, other: ScanSearch } as const;

function Node({ node }: { node: PlanNode }) {
  const Icon = KIND_ICON[node.kind];
  return (
    <li>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-card px-2.5 py-1.5 text-xs">
        <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-2xs font-semibold", KIND_STYLE[node.kind])}>
          <Icon className="size-3" aria-hidden /> {node.badge}
        </span>
        {node.join && <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-2xs font-semibold text-primary">JOIN</span>}
        <span className="min-w-0 font-mono">{node.label}</span>
        {(node.rows !== undefined || node.cost !== undefined) && (
          <span className="ml-auto font-mono text-2xs text-muted-foreground tabular">
            {node.rows !== undefined && `~${node.rows} rows`}
            {node.rows !== undefined && node.cost !== undefined && " · "}
            {node.cost !== undefined && `cost ${node.cost}`}
          </span>
        )}
        {node.detail && <p className="w-full font-mono text-2xs text-muted-foreground">{node.detail}</p>}
      </div>
      {node.children.length > 0 && (
        <ul className="mt-1 ml-3 space-y-1 border-l pl-3">
          {node.children.map((c) => (
            <Node key={c.id} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The query plan as a tree with badges (SCAN, SEARCH, SORT, JOIN) and plain-English hints. */
export function PlanView({ state, engineLabel }: { state: PlanState; engineLabel: string }) {
  if (state.status === "idle")
    return <p className="py-8 text-center text-sm text-muted-foreground">Open this tab on a SELECT to see how {engineLabel} would run it.</p>;
  if (state.status === "loading")
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Planning…
      </p>
    );
  if (state.status === "unavailable") return <p className="py-8 text-center text-sm text-muted-foreground">{state.message}</p>;
  if (state.status === "error")
    return (
      <div role="alert" className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <pre className="min-w-0 flex-1 font-mono text-xs whitespace-pre-wrap text-destructive">{state.message}</pre>
      </div>
    );
  const { plan } = state;
  const s = plan.summary;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {engineLabel} plan:{" "}
        <span className="text-foreground tabular">
          {s.fullScans} full scan{s.fullScans === 1 ? "" : "s"}, {s.indexLookups} index lookup{s.indexLookups === 1 ? "" : "s"}, {s.sorts} sort{s.sorts === 1 ? "" : "s"}, {s.joins} join{s.joins === 1 ? "" : "s"}
        </span>
      </p>
      <ul className="space-y-1" aria-label="Query plan">
        {plan.roots.map((n) => (
          <Node key={n.id} node={n} />
        ))}
      </ul>
      {plan.hints.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Plan hints">
          {plan.hints.map((h) => (
            <li key={h} className="flex gap-2 rounded-md bg-info/10 px-2.5 py-1.5 text-sm text-info">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{h}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing to flag: no full scans or extra sorts.</p>
      )}
    </div>
  );
}
