import { NextResponse } from "next/server";
import { requireSession } from "@/core/auth/dal";
import { exportBackup } from "@/core/services/export";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings, markRun } from "@/modules/settings/services/settings";

export async function GET() {
  await requireSession();
  const backup = await exportBackup();
  const today = todayIn(await getSettings());
  await markRun("lastExportAt");
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="prepos-backup-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
