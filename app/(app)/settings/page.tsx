import { DEFAULT_HOURS } from "@/lib/domain/time-budget";
import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AiPanel } from "@/components/settings/ai-panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PushCard } from "@/components/settings/push-card";
import { SettingsTools } from "@/components/settings/settings-tools";
import { news } from "@/lib/content";
import { env } from "@/lib/env";
import { providerRows, usageToday } from "@/lib/services/ai";
import { todayIn } from "@/lib/services/plan";
import { listPushDevices } from "@/lib/services/push-subscriptions";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const e = env();
  const defaultQueries = news.googleNews.defaultQueries.map((q) => q.query);
  const [providers, usage, pushDevices] = await Promise.all([providerRows(), usageToday(), listPushDevices()]);

  return (
    <>
      <PageHeader title="Settings" icon={Settings} description="Plan dates, daily targets, rest days, integrations, notifications and backups." />
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
              {
                name: "Email (Resend, fallback)",
                configured: !!(e.RESEND_API_KEY && e.NOTIFY_EMAIL),
                envVars: "RESEND_API_KEY, RESEND_FROM_EMAIL, NOTIFY_EMAIL",
              },
              { name: "WhatsApp (Whapi)", configured: !!(e.WHAPI_TOKEN && e.WHATSAPP_TO), envVars: "WHAPI_TOKEN, WHATSAPP_TO" },
              {
                name: "App notifications (PWA)",
                configured: !!(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY && pushDevices.length > 0),
                envVars: "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY",
                ...(e.VAPID_PUBLIC_KEY && e.VAPID_PRIVATE_KEY ? { offHint: "No device yet. Turn it on under App notifications below." } : {}),
              },
            ]}
            roastLevel={s.roastLevel}
            mail={s.mail}
            emailTo={e.NOTIFY_EMAIL ?? null}
            name={e.ADMIN_NAME}
          />
          <PushCard publicKey={e.VAPID_PUBLIC_KEY ?? null} devices={pushDevices} />
        </div>
      </div>
    </>
  );
}
