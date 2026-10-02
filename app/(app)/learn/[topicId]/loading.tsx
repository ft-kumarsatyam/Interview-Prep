import { Skeleton } from "@/components/ui/skeleton";

export default function TopicLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading topic…</span>
      <Skeleton className="h-6 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="h-8 w-96 max-w-full" />
        <Skeleton className="h-2 w-full" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
