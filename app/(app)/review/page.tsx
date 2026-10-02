import type { Metadata } from "next";
import { ReviewQueue } from "@/components/progress/review-queue";
import { PageHeader } from "@/components/shared/page-header";
import { todayIn } from "@/lib/services/plan";
import { getReviewQueue } from "@/lib/services/problems";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const today = todayIn(await getSettings());
  const items = await getReviewQueue(today);
  return (
    <>
      <PageHeader title="Review" description="Spaced repetition: re-solve from scratch, then rate how it went. Every re-solve counts toward today's DSA target." />
      <ReviewQueue items={items} />
    </>
  );
}
