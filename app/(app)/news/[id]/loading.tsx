import { Skeleton } from "@/components/ui/skeleton";

export default function ArticleLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-2xl">
      <span className="sr-only">Loading article…</span>
      <div className="-mx-4 mb-5 flex h-12 items-center justify-between border-b px-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  );
}
