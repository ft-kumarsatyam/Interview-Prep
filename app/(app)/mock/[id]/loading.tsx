import { LoadingRegion } from "@/components/shared/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MockRunLoading() {
  return (
    <LoadingRegion label="Opening the interview…" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
      <div className="space-y-3 rounded-xl border p-5">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
    </LoadingRegion>
  );
}
