import { HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MistakesLoading() {
  return (
    <LoadingRegion label="Loading your mistakes…" className="space-y-5">
      <HeaderSkeleton back actions={1} />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <RowsSkeleton count={5} />
    </LoadingRegion>
  );
}
