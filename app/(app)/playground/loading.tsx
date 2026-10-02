import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading playground…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg sm:w-64" />
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Skeleton className="hidden h-96 rounded-xl lg:block" />
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-xl" />
          <div className="grid gap-3 xl:grid-cols-2">
            <Skeleton className="h-90 rounded-lg" />
            <Skeleton className="hidden h-90 rounded-lg lg:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
