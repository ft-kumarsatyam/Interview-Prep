import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron";
import { runBriefingTick } from "@/lib/services/briefing";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runBriefingTick());
}
