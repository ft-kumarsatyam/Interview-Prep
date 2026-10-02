import { ProblemStatementSkeleton } from "@/components/dsa/problem-statement";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the problem">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="col-span-2 h-9 sm:w-36" />
          <Skeleton className="h-9 sm:w-40" />
          <Skeleton className="h-9 sm:w-28" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-6">
        <div className="max-lg:hidden">
          <ProblemStatementSkeleton />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
