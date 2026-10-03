import { CardGridSkeleton, HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AptitudeLoading() {
  return (
    <LoadingRegion label="Loading aptitude…">
      <HeaderSkeleton />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <CardGridSkeleton count={6} />
    </LoadingRegion>
  );
}
