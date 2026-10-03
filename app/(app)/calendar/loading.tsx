import { HeaderSkeleton, LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <LoadingRegion label="Loading calendar…">
      <HeaderSkeleton actions={3} />
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={`h${i}`} className="mx-auto h-3 w-8" />
        ))}
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg sm:aspect-[4/3]" />
        ))}
      </div>
    </LoadingRegion>
  );
}
