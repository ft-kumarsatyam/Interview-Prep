import { CardGridSkeleton, HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MockLoading() {
  return (
    <LoadingRegion label="Loading mock interviews…">
      <HeaderSkeleton actions={1} />
      <Skeleton className="h-32 rounded-xl" />
      <CardGridSkeleton count={3} itemClassName="h-40" />
      <RowsSkeleton count={4} />
    </LoadingRegion>
  );
}
