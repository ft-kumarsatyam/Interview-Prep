import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading job…</span>
      <Skeleton className="h-7 w-80 max-w-full" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
