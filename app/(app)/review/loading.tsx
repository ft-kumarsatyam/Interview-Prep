import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <div aria-busy="true" aria-label="Loading reviews">
      <div className="mb-5 space-y-2 sm:mb-6">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="mb-4 h-16 w-full rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
