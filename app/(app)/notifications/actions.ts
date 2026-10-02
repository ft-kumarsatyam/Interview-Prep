"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/dal";
import { markNotificationsRead } from "@/lib/services/notifications";

export async function markNotificationsReadAction(ids?: string[]): Promise<void> {
  await requireSession();
  const parsed = z.array(z.string().regex(/^[a-f0-9]{24}$/)).max(100).optional().safeParse(ids);
  if (!parsed.success) return;
  await markNotificationsRead(parsed.data);
  refresh();
}
