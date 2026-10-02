import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { ComingInPhase } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="Review" description="Spaced-repetition re-solves due today." />
      <ComingInPhase icon={RotateCcw} title="Review queue" phase={4}>
        Problems you mark as struggled come back after 3, 7 and 21 days; ok ones after 14.
      </ComingInPhase>
    </>
  );
}
