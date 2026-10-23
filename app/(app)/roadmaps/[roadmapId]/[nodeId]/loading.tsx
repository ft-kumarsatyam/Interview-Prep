import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={5} label="Loading study notes…" />;
}
