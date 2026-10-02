import { Skeleton } from "@/components/ui/skeleton";

export default function LearnLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading tracks…</span>
      <div className="mb-5 space-y-2 sm:mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-full rounded-md sm:w-72" />
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
