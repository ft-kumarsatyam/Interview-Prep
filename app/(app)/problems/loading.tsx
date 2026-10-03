import { HeaderSkeleton, LoadingRegion, RowsSkeleton } from "@/components/shared/page-skeleton";

export default function ProblemsLoading() {
  return (
    <LoadingRegion label="Loading your problems…">
      <HeaderSkeleton actions={2} />
      <RowsSkeleton count={6} />
    </LoadingRegion>
  );
}
