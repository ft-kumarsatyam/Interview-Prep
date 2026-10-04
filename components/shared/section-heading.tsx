import { cn } from "@/core/utils";

/**
 * The one heading style for a page section. `level` picks the element (h2 for page sections, h3 inside
 * a card) without changing how it looks; `eyebrow` is the small uppercase label variant.
 */
export function SectionHeading({
  title,
  hint,
  action,
  id,
  level = 2,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  level?: 2 | 3;
  eyebrow?: boolean;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", className)}>
      <Heading
        id={id}
        className={cn(eyebrow ? "text-xs font-medium tracking-wide text-muted-foreground uppercase" : level === 2 ? "text-lg font-semibold tracking-tight" : "text-base font-semibold")}
      >
        {title}
      </Heading>
      {(hint || action) && (
        <div className="flex items-center gap-2">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {action}
        </div>
      )}
    </div>
  );
}
