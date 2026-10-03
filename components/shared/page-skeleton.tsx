import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Wrapper every route skeleton uses, so screen readers hear one "Loading …" per page. */
export function LoadingRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite" className={cn("space-y-6", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Mirrors `PageHeader`: title, one-line description, optional action buttons on the right. */
export function HeaderSkeleton({ actions = 0, back = false }: { actions?: number; back?: boolean }) {
  return (
    <div className="space-y-3">
      {back && <Skeleton className="h-4 w-24" />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex gap-2">
            {range(actions).map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className, itemClassName }: { count?: number; className?: string; itemClassName?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {range(count).map((i) => (
        <Skeleton key={i} className={cn("h-36 rounded-xl", itemClassName)} />
      ))}
    </div>
  );
}

/** A bordered list of rows: leading icon, two lines of text, trailing badge. */
export function RowsSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("divide-y rounded-xl border", className)}>
      {range(count).map((i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {range(count).map((i) => (
        <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/** Labelled form fields inside a card, ending in a save button. */
export function FormSkeleton({ fields = 5, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-5 rounded-xl border p-5", className)}>
      <Skeleton className="h-5 w-40" />
      {range(fields).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-8 w-32 rounded-lg" />
    </div>
  );
}

/** One question at a time: progress bar, prompt, four answer options, nav buttons. */
export function QuestionRunnerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5 rounded-xl border p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="space-y-2.5">
        {range(4).map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
