import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading DB Lab…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[32rem] rounded-xl lg:block" />
        <Skeleton className="h-[32rem] rounded-xl" />
      </div>
    </div>
  );
}
