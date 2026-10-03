import { HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SetupLoading() {
  return (
    <LoadingRegion label="Checking setup…">
      <HeaderSkeleton actions={1} />
      <div className="space-y-3 rounded-xl border p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <RowsSkeleton count={6} />
    </LoadingRegion>
  );
}
