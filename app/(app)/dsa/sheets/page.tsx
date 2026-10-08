import type { Metadata } from "next";
import { Building2, Database, Library, Network, Shapes } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { SheetHubGrid, type HubLink } from "@/modules/dsa/components/sheet-hub-grid";
import { effectiveStatuses } from "@/modules/dsa/domain/external-catalogue";
import { sheetCardGroups } from "@/modules/dsa/domain/sheet-hub";
import { DB_CHALLENGES } from "@/modules/dsa/domain/db-lab";
import { LLD_CASES } from "@/modules/design/domain/design-sheet";
import { companyDataset, dsaCheatSheets, problems, systemDesign } from "@/core/content";
import { getExternalProgress } from "@/modules/dsa/services/external-progress";
import { getProgressMap } from "@/modules/dsa/services/problems";
import { hubSheets } from "@/modules/dsa/services/sheet-catalogue";

export const metadata: Metadata = { title: "DSA sheets" };

export default async function SheetsPage() {
  const [progress, externalProgress] = await Promise.all([getProgressMap(), getExternalProgress()]);
  const statuses = effectiveStatuses(hubSheets.map((entry) => entry.sheet), externalProgress, progress);

  const groups = sheetCardGroups(hubSheets, statuses);
  const sqlCount = problems.filter((p) => p.track === "sql").length + DB_CHALLENGES.filter((c) => c.mode === "sql").length;
  const links: HubLink[] = [
    { href: "/dsa/companies", title: "Company-wise DSA", description: "LeetCode questions by company, 30 days to all time.", icon: Building2, stat: `${companyDataset.companies.length} companies` },
    { href: "/dsa/sheets/system-design", title: "System Design Sheet", description: "HLD cases and LLD questions with status and resources.", icon: Network, stat: `${systemDesign.cases.length + LLD_CASES.length} questions` },
    { href: "/dsa/sheets/sql", title: "SQL Sheet", description: "Interview SQL from easy to hard, run in the browser.", icon: Database, stat: `${sqlCount} queries` },
    { href: "/dsa?tab=patterns", title: "Pattern cheat sheets", description: "When to use each pattern, the workflow and a decision tree.", icon: Shapes, stat: `${dsaCheatSheets.length} topics` },
  ];

  return (
    <>
      <BackLink href="/dsa">DSA</BackLink>
      <PageHeader
        icon={Library}
        title="DSA sheets"
        description="Every popular DSA sheet in one place, with your progress carried across them: solve a problem once and every sheet that lists it moves."
      />
      <SheetHubGrid groups={groups} links={links} />
    </>
  );
}
