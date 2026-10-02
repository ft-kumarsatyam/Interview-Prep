import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading news…</span>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="mb-5 h-[76px] rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
