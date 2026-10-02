import { Skeleton } from "@/components/ui/skeleton";

export default function DsaLoading() {
  return (
    <div aria-busy="true" aria-label="Loading problems">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-xl border bg-card p-3 sm:p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full sm:w-80" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <div className="divide-y rounded-xl border bg-card">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-1 w-12 sm:w-24" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
