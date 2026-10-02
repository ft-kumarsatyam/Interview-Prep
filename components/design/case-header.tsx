import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function CaseHeader({
  backHref,
  backLabel,
  level,
  context,
  position,
  title,
  summary,
  children,
}: {
  backHref: string;
  backLabel: string;
  level: string;
  context?: string;
  position?: { index: number; total: number };
  title: string;
  summary: string;
  /** Action buttons; the first one should be the primary next step. */
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 space-y-3">
      <Link
        href={backHref}
        className="-ml-2 inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize">{level}</span>
        {context && <span>{context}</span>}
        {position && (
          <span className="ml-auto font-mono tabular">
            {position.index + 1} / {position.total}
          </span>
        )}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
      <p className="max-w-3xl text-pretty text-muted-foreground">{summary}</p>
      {children && <div className="flex flex-wrap items-center gap-2 pt-1">{children}</div>}
    </header>
  );
}
