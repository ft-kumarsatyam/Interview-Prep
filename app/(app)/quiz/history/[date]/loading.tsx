import { Skeleton } from "@/components/ui/skeleton";

export default function QuizReviewLoading() {
  return (
    <div aria-busy="true" aria-label="Loading quiz review">
      <Skeleton className="mb-4 h-5 w-20" />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="mb-6 h-20 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
