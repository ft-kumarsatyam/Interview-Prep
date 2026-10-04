import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/core/auth/cron";
import { runReminder } from "@/core/services/cron";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runReminder());
}
