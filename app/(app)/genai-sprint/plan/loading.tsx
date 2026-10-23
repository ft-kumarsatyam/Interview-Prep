import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={6} label="Loading sprint plan…" />;
}
