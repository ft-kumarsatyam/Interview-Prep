import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/dal";
import { exportBackup } from "@/lib/services/export";
import { todayIn } from "@/lib/services/plan";
import { getSettings } from "@/lib/services/settings";

export async function GET() {
  await requireSession();
  const backup = await exportBackup();
  const today = todayIn(await getSettings());
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="prepos-backup-${today}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
