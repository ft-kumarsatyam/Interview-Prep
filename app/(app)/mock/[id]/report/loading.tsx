import { HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MockReportLoading() {
  return (
    <LoadingRegion label="Loading report…">
      <HeaderSkeleton back actions={1} />
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </LoadingRegion>
  );
}
