"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";

export interface ResourceView {
  url: string;
  title: string;
  kind: string;
  dead: boolean;
  nodes: Array<{ id: string; title: string; sectionTitle: string }>;
}

const KIND_LABEL: Record<string, string> = { docs: "Docs", video: "Videos", course: "Courses", article: "Articles", book: "Books", tool: "Tools" };

/** Every learning link of a roadmap in one searchable list, filtered by type. */
export function ResourceLibrary({ resources, roadmapId }: { resources: ResourceView[]; roadmapId: string }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const kinds = useMemo(() => [...new Set(resources.map((r) => r.kind))].sort(), [resources]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => (!kind || r.kind === kind) && (!q || `${r.title} ${r.url} ${r.nodes.map((n) => `${n.title} ${n.sectionTitle}`).join(" ")}`.toLowerCase().includes(q)));
  }, [resources, query, kind]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="res-q" className="sr-only">
          Search resources
        </label>
        <Input id="res-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs, videos, topics (RAG, LangGraph, Docker)" maxLength={80} />
        <div role="group" aria-label="Resource type" className="flex flex-wrap gap-1.5">
          <Chip pressed={kind === null} onClick={() => setKind(null)}>
            All ({resources.length})
          </Chip>
          {kinds.map((k) => (
            <Chip key={k} pressed={kind === k} onClick={() => setKind(kind === k ? null : k)}>
              {KIND_LABEL[k] ?? k} ({resources.filter((r) => r.kind === k).length})
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {shown.length} of {resources.length} resources
        </p>
      </div>

      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.url} className="rounded-xl border bg-card p-3">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <span>{r.title}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{r.kind}</span>
              {r.dead && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-normal text-destructive">link may be dead</span>}
              <ExternalLink className="size-3" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="truncate text-xs text-muted-foreground">{new URL(r.url).hostname}</p>
            <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              Used in:
              {r.nodes.slice(0, 4).map((n) => (
                <a key={n.id} href={`/roadmaps/${roadmapId}#node-${n.id}`} className="text-primary underline-offset-2 hover:underline">
                  {n.title}
                </a>
              ))}
              {r.nodes.length > 4 && <span>and {r.nodes.length - 4} more</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
