import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { PRIORITY_LABEL, type Priority } from "@/modules/roadmap/domain/roadmap";

export interface NextStepNode {
  id: string;
  title: string;
  sectionTitle: string;
  priority: Priority;
}

export interface TrackView {
  id: string;
  title: string;
  blurb: string;
  pct: number;
  done: number;
  total: number;
  /** Section titles with the most open must-dos, worst first. */
  gaps: string[];
}

/** What to do next and how far you are towards each role focus. Data arrives as props. */
export function NextStepCard({ roadmapId, nodes, tracks, selectedTrackId }: { roadmapId: string; nodes: NextStepNode[]; tracks: TrackView[]; selectedTrackId: string | null }) {
  const selected = tracks.find((t) => t.id === selectedTrackId) ?? null;
  return (
    <section aria-label="Your next steps" className="space-y-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Your next steps</h2>
        {tracks.length > 0 && (
          <nav aria-label="Role focus" className="flex flex-wrap gap-1.5">
            <FocusLink href={`/roadmaps/${roadmapId}`} active={!selected}>
              Everything
            </FocusLink>
            {tracks.map((t) => (
              <FocusLink key={t.id} href={`/roadmaps/${roadmapId}?track=${t.id}`} active={selected?.id === t.id}>
                {t.title}
              </FocusLink>
            ))}
          </nav>
        )}
      </div>

      {selected && (
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">{selected.title}</p>
          <p className="text-xs text-muted-foreground">{selected.blurb}</p>
          <div className="flex items-center gap-3">
            <Progress value={selected.pct} aria-label={`${selected.title} must-do progress`} className="h-2 max-w-xs" />
            <span className="tabular font-mono text-xs text-muted-foreground">
              {selected.done}/{selected.total} must do · {selected.pct}%
            </span>
          </div>
          {selected.gaps.length > 0 && <p className="text-xs text-muted-foreground">Biggest gaps: {selected.gaps.slice(0, 3).join(", ")}.</p>}
        </div>
      )}

      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing left here. Pick another focus or open the nodes you skipped.</p>
      ) : (
        <ol className="space-y-1.5">
          {nodes.map((n, i) => (
            <li key={n.id}>
              <a href={`#node-${n.id}`} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-xs text-primary">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{n.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{n.sectionTitle}</span>
                </span>
                <ToneBadge tone={n.priority === "must" ? "primary" : "info"}>{PRIORITY_LABEL[n.priority]}</ToneBadge>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FocusLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11 ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
    >
      {children}
    </Link>
  );
}
