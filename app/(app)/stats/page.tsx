import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { ComingInPhase } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Stats" };

export default function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" description="Pace, difficulty mix, quiz trend and topic coverage." />
      <ComingInPhase icon={BarChart3} title="Charts" phase={7}>
        Problems per day, actual vs ideal pace, quiz scores and track coverage.
      </ComingInPhase>
    </>
  );
}
