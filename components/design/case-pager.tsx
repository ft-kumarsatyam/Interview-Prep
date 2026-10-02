import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PagerLink {
  href: string;
  title: string;
}

/** Previous / next case links, in the same order as the index page. */
export function CasePager({ prev, next }: { prev?: PagerLink; next?: PagerLink }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="More cases" className="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-2">
      {prev ? <PagerCard link={prev} dir="prev" /> : <span className="hidden sm:block" />}
      {next && <PagerCard link={next} dir="next" />}
    </nav>
  );
}

function PagerCard({ link, dir }: { link: PagerLink; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={link.href}
      rel={dir}
      className={cn(
        "group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        dir === "next" && "flex-row-reverse text-right",
      )}
    >
      <Icon className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{dir === "prev" ? "Previous case" : "Next case"}</span>
        <span className="block truncate font-medium group-hover:text-primary">{link.title}</span>
      </span>
    </Link>
  );
}
