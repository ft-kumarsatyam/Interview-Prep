import { DEFAULT_HOURS } from "@/lib/domain/time-budget";
import type { Metadata } from "next";
import Link from "next/link";
import { Settings, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { AiPanel } from "@/components/settings/ai-panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { SettingsTools } from "@/components/settings/settings-tools";
import { news } from "@/lib/content";
import { env } from "@/lib/env";
import { providerRows, usageToday } from "@/lib/services/ai";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const e = env();
  const defaultQueries = news.googleNews.defaultQueries.map((q) => q.query);
  const [providers, usage] = await Promise.all([providerRows(), usageToday()]);

  return (
    <>
      <PageHeader title="Settings" icon={Settings} description="Plan dates, daily targets, rest days, integrations, notifications and backups.">
        <Button asChild variant="outline" className="h-9">
          <Link href="/setup">
            <Wrench aria-hidden /> Setup checklist
          </Link>
        </Button>
      </PageHeader>
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav />
        <div className="min-w-0 space-y-4">
          <SettingsForm
            today={todayIn(s)}
            timezone={s.timezone}
            defaultQueries={defaultQueries}
            initial={{
              startDate: s.startDate,
              endDate: s.endDate,
              quizPassPct: s.quizPassPct,
              topicMasteryPct: s.topicMasteryPct,
              minDailyDsa: s.minDailyDsa,
              maxDailyDsa: s.maxDailyDsa,
              maxSaturdayDsa: s.maxSaturdayDsa,
              maxDailyTheory: s.maxDailyTheory,
              revisionWeeks: s.revisionWeeks,
              restDays: s.restDays.toSorted(),
              geminiLinks: { ...s.geminiLinks },
              llmPaidEnabled: s.llmPaid.enabled,
              llmPaidDailyCap: s.llmPaid.dailyCap,
              llmPaidRequireConfirm: s.llmPaid.requireConfirm,
              mockDsaWeekday: s.mockSchedule.dsaWeekday,
              mockHldWeekday: s.mockSchedule.hldWeekday,
              hoursByDow: s.hoursByDow ? [...s.hoursByDow] : [...DEFAULT_HOURS],
              googleNewsQueries: s.googleNewsQueries ?? defaultQueries,
              leetcodeUsername: s.leetcodeUsername ?? "",
            }}
          />
          <AiPanel providers={providers} usage={usage} />
          <h2 className="px-1 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">System</h2>
          <SettingsTools
            channels={[
              { name: "Telegram", configured: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID), envVars: "TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID" },
              {
                name: "Email (Brevo)",
                configured: !!(e.BREVO_API_KEY && e.BREVO_SENDER_EMAIL && e.NOTIFY_EMAIL),
                envVars: "BREVO_API_KEY, BREVO_SENDER_EMAIL, NOTIFY_EMAIL",
              },
              { name: "Email (Resend, fallback)", configured: !!(e.RESEND_API_KEY && e.NOTIFY_EMAIL), envVars: "RESEND_API_KEY, NOTIFY_EMAIL" },
            ]}
            roastMode={s.roastMode}
            emailTo={e.NOTIFY_EMAIL ?? null}
            name={e.ADMIN_NAME}
          />
        </div>
      </div>
    </>
  );
}
