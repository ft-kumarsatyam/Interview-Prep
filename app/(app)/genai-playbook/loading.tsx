import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={4} label="Loading GenAI playbook…" />;
}
