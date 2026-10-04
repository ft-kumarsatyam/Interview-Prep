import { Skeleton } from "@/components/ui/skeleton";

export function CaseListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading cases…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CaseDetailSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading case…</span>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-lg" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg sm:w-72" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="space-y-8">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
