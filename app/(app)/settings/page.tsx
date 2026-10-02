import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { SettingsTools } from "@/components/settings/settings-tools";
import { news } from "@/lib/content";
import { env } from "@/lib/env";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  const e = env();
  const defaultQueries = news.googleNews.defaultQueries.map((q) => q.query);

  return (
    <>
      <PageHeader title="Settings" description="Plan dates, pass marks, rest days, news keywords, LeetCode and backups." />
      <div className="space-y-4">
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
            googleNewsQueries: s.googleNewsQueries ?? defaultQueries,
            leetcodeUsername: s.leetcodeUsername ?? "",
          }}
        />
        <SettingsTools
          channels={[
            { name: "Telegram", configured: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID), envVars: "TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID" },
            { name: "Email (Resend)", configured: !!(e.RESEND_API_KEY && e.NOTIFY_EMAIL), envVars: "RESEND_API_KEY, NOTIFY_EMAIL" },
          ]}
        />
      </div>
    </>
  );
}
