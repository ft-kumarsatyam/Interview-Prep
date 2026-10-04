import { news } from "@/core/content";
import type { SettingsInput } from "@/modules/settings/domain/settings";
import { DEFAULT_HOURS } from "@/modules/planner/domain/time-budget";
import type { AppSettings } from "@/modules/settings/services/settings";

/** The saved settings in the shape the Settings form submits, so a section save can merge onto them. */
export function settingsToInput(s: AppSettings): SettingsInput {
  return {
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
    googleNewsQueries: s.googleNewsQueries ?? null,
    leetcodeUsername: s.leetcodeUsername ?? null,
  };
}

/** Default Google News keywords, for the form's "reset" and display. */
export const defaultNewsQueries = () => news.googleNews.defaultQueries.map((q) => q.query);
