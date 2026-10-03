import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";
import { MockHistory } from "@/components/mock/mock-history";
import { MockPicker } from "@/components/mock/mock-picker";
import { WeeklyMocksCard } from "@/components/mock/weekly-mocks-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { MOCK_CONFIG } from "@/lib/domain/mock";
import { countCustomProblems } from "@/lib/services/custom-problems";
import { freeAiConfigured, listMocks, weeklyMocks } from "@/lib/services/mock";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Mock interviews" };

export default async function MockPage() {
  const settings = await getSettings();
  const [mocks, customCount, weekly] = await Promise.all([listMocks(), countCustomProblems(), weeklyMocks(todayIn(settings), settings.mockSchedule)]);
  const active = mocks.find((m) => m.status === "in_progress");

  return (
    <>
      <PageHeader icon={Timer} title="Mock interviews" description="Timed rounds for every interview type, scored on tests, time and a rubric. Coding rounds use the same editor as practice. Mocks never affect your streak." />
      <div className="space-y-6">
        {active && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <span className="text-sm">
              <span className="font-medium">{MOCK_CONFIG[active.type].label}</span> is in progress. The timer is still running.
            </span>
            <Button asChild size="sm" className="ml-auto">
              <Link href={`/mock/${active.id}`}>
                Resume <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
        <WeeklyMocksCard slots={weekly} today={todayIn(settings)} />
        <section aria-labelledby="mock-types" className="space-y-3">
          <h2 id="mock-types" className="text-base font-semibold">
            Start a mock
          </h2>
          <MockPicker customCount={customCount} aiConfigured={freeAiConfigured()} />
        </section>
        <MockHistory mocks={mocks.filter((m) => m.status !== "in_progress")} />
      </div>
    </>
  );
}
