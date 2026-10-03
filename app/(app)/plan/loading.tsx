import { HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlanLoading() {
  return (
    <LoadingRegion label="Loading your plan…">
      <HeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-5">
          <Skeleton className="h-56 rounded-xl" />
          <RowsSkeleton count={4} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </LoadingRegion>
  );
}
