import type { Metadata } from "next";
import { Database } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { SqlSheetTable } from "@/modules/dsa/components/sql-sheet-table";
import { DB_CHALLENGES } from "@/modules/dsa/domain/db-lab";
import { sqlSheetRows } from "@/modules/dsa/domain/sql-sheet";
import { problems } from "@/core/content";
import { getProgressMap } from "@/modules/dsa/services/problems";

export const metadata: Metadata = { title: "SQL sheet" };

export default async function SqlSheetPage() {
  const progress = await getProgressMap();
  const rows = sqlSheetRows(problems, DB_CHALLENGES);
  const solved = rows.flatMap((row) => (row.solvedBy.kind === "problem" && progress[row.solvedBy.slug]?.status === "solved" ? [row.solvedBy.slug] : []));

  return (
    <>
      <BackLink href="/dsa/sheets">All sheets</BackLink>
      <PageHeader
        icon={Database}
        title="SQL sheet"
        description={`${rows.length} SQL questions from easy to hard: LeetCode's interview classics in the SQL IDE, and DB Lab challenges on realistic datasets. Everything runs in your browser.`}
      />
      <SqlSheetTable rows={rows} solvedProblems={solved} />
    </>
  );
}
