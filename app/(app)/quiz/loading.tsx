import { Skeleton } from "@/components/ui/skeleton";

export default function QuizLoading() {
  return (
    <div aria-busy="true" aria-label="Loading quiz">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-1.5 w-full" />
        <div className="space-y-4 rounded-xl border p-4">
          <Skeleton className="h-6 w-3/4" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
