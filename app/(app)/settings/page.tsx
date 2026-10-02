import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { ComingInPhase } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Plan dates, pass mark, rest days, news keywords and backups." />
      <ComingInPhase icon={Settings} title="Settings" phase={7}>
        Edit plan dates and rest days, Google News keywords, notification channels, and export a JSON backup.
      </ComingInPhase>
    </>
  );
}
