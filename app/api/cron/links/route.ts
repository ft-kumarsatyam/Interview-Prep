import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/core/auth/cron";
import { runLinkCheck } from "@/modules/roadmap/services/link-health";

export const maxDuration = 60;

/** Checks the next batch of roadmap links. Called daily by .github/workflows/links-check.yml. */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runLinkCheck());
}
