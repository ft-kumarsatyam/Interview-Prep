import { HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <LoadingRegion label="Loading calendar…">
      <HeaderSkeleton actions={3} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={`s${i}`} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-3 h-9 w-44 rounded-full" />
      <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-xl border sm:grid">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-none" />
        ))}
      </div>
      <div className="space-y-2 sm:hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </LoadingRegion>
  );
}
