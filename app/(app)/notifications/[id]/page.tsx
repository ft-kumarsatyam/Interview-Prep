import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MailView } from "@/modules/notifications/components/mail-view";
import { BackLink } from "@/components/shared/back-link";
import { requireSession } from "@/core/auth/dal";
import { toLocalDate } from "@/core/domain/dates";
import { env } from "@/core/env";
import { formatDate } from "@/core/plan-clock";
import { getNotificationDetail } from "@/modules/notifications/services/notifications";

export const metadata: Metadata = { title: "Message" };

export default async function NotificationPage({ params }: PageProps<"/notifications/[id]">) {
  await requireSession();
  const { id } = await params;
  const detail = await getNotificationDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <BackLink href="/dashboard">Dashboard</BackLink>
      <p className="text-xs text-muted-foreground">{formatDate(toLocalDate(new Date(detail.createdAt), env().APP_TIMEZONE), { weekday: "short", day: "numeric", month: "short" })}</p>
      {detail.spec ? (
        <MailView spec={detail.spec} roast={detail.roast} />
      ) : (
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{detail.title}</h1>
          <p className="mt-2 text-sm text-pretty whitespace-pre-line text-muted-foreground">{detail.body}</p>
        </div>
      )}
    </div>
  );
}
