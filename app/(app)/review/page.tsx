import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { ReviewQueue } from "@/modules/progress/components/review-queue";
import { PageHeader } from "@/components/shared/page-header";
import { todayIn } from "@/modules/planner/services/plan";
import { getReviewQueue } from "@/modules/dsa/services/problems";
import { getSettings } from "@/modules/settings/services/settings";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const today = todayIn(await getSettings());
  const items = await getReviewQueue(today);
  return (
    <>
      <PageHeader
        icon={RotateCcw}
        title="Review"
        description="Re-solve each one from scratch on LeetCode, then rate how it went. Every re-solve counts toward today's DSA target."
      />
      <ReviewQueue items={items} today={today} />
    </>
  );
}
