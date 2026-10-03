import { HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarDayLoading() {
  return (
    <LoadingRegion label="Loading day…" className="space-y-4">
      <HeaderSkeleton back actions={2} />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <RowsSkeleton count={4} />
    </LoadingRegion>
  );
}
