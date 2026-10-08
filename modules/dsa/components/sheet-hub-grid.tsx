import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { SheetCard } from "@/modules/dsa/domain/sheet-hub";

export interface HubLink {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  stat: string;
}

const pct = (n: number, d: number) => Math.round((n / Math.max(d, 1)) * 100);

function Card({ card }: { card: SheetCard }) {
  return (
    <Link
      href={card.href}
      className="group flex flex-col rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold group-hover:text-primary">{card.title}</h3>
          <p className="truncate text-xs text-muted-foreground">{card.source}</p>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular">{card.total} problems</span>
          <span className="tabular">{card.topics} topics</span>
          <span className="tabular flex gap-2">
            <span className="text-success">{card.byDifficulty.Easy} E</span>
            <span className="text-warning">{card.byDifficulty.Medium} M</span>
            <span className="text-destructive">{card.byDifficulty.Hard} H</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${card.title} progress`} aria-valuenow={pct(card.completed, card.total)} aria-valuemin={0} aria-valuemax={100}>
            <span className="block h-full rounded-full bg-primary" style={{ width: `${pct(card.completed, card.total)}%` }} />
          </div>
          <span className="tabular font-mono text-xs text-muted-foreground">
            {card.completed}/{card.total}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** The hynts-style hub: grouped sheet cards with counts and progress, then links to the other sheets. */
export function SheetHubGrid({ groups, links = [] }: { groups: { title: string; cards: SheetCard[] }[]; links?: HubLink[] }) {
  return (
    <div className="space-y-8">
      {links.length > 0 && (
        <section aria-labelledby="hub-more" className="space-y-3">
          <h2 id="hub-more" className="text-lg font-semibold">More preparation sheets</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {links.map(({ href, title, description, icon: Icon, stat }) => (
              <Link key={href} href={href} className="group flex items-start gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-primary">{title}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                  <span className="tabular mt-1 block font-mono text-xs text-muted-foreground">{stat}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {groups.map((group, i) => (
        <section key={group.title} aria-labelledby={`hub-group-${i}`} className="space-y-3">
          <h2 id={`hub-group-${i}`} className="text-lg font-semibold">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.cards.map((card) => <Card key={card.href} card={card} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
