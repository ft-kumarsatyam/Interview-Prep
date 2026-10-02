import { Skeleton } from "@/components/ui/skeleton";

export default function PracticeLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading practice…</span>
      <Skeleton className="h-5 w-40" />
      <div className="mb-5 space-y-2 sm:mb-6">
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="mx-auto h-64 max-w-2xl rounded-xl" />
    </div>
  );
}
