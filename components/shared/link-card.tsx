import Link from "next/link";
import { cn } from "@/lib/utils";

/** A whole card that is a link: one hover, one focus ring, one touch height everywhere. */
export function LinkCard({ href, className, children, external, rel }: { href: string; className?: string; children: React.ReactNode; external?: boolean; rel?: string }) {
  const cls = cn(
    "group flex min-h-14 items-center gap-3 rounded-xl border bg-card p-3 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
    className,
  );
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  return (
    <Link href={href} rel={rel} className={cls}>
      {children}
    </Link>
  );
}
