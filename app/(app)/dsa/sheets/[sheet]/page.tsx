import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { ExternalSheetBrowser } from "@/modules/dsa/components/external-sheet-browser";
import { parseDsaView } from "@/modules/dsa/components/dsa-view-state";
import { effectiveStatuses } from "@/modules/dsa/domain/external-catalogue";
import { getExternalProgress } from "@/modules/dsa/services/external-progress";
import { getProgressMap } from "@/modules/dsa/services/problems";
import { hubSheet, taggedSheet } from "@/modules/dsa/services/sheet-catalogue";

export async function generateMetadata({ params }: PageProps<"/dsa/sheets/[sheet]">): Promise<Metadata> {
  const { sheet } = await params;
  return { title: hubSheet(sheet)?.sheet.title ?? "Sheet" };
}

export default async function SheetPage({ params, searchParams }: PageProps<"/dsa/sheets/[sheet]">) {
  const [{ sheet: id }, sp] = await Promise.all([params, searchParams]);
  const entry = hubSheet(id);
  if (!entry) notFound();
  const sheet = taggedSheet(entry.sheet);
  const [progress, externalProgress] = await Promise.all([getProgressMap(), getExternalProgress()]);
  const statuses = effectiveStatuses([sheet], externalProgress, progress);
  const inApp = sheet.questions.filter((q) => q.localSlug).length;

  return (
    <>
      <BackLink href="/dsa/sheets">All sheets</BackLink>
      <PageHeader
        icon={ListChecks}
        title={sheet.title}
        description={`${sheet.questions.length} problems in ${sheet.sections.length} topics, ${inApp} open in the PrepOS IDE; the rest open on their own site with a timer and a done button.`}
      />
      <ExternalSheetBrowser sheets={[sheet]} statuses={statuses} initial={{ ...parseDsaView(sp), sheet: sheet.id }} />
    </>
  );
}
