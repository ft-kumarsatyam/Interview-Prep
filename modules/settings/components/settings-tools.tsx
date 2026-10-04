"use client";

import { useTransition } from "react";
import { Database, Download } from "lucide-react";
import { toast } from "sonner";
import { reseedAction } from "@/app/(app)/settings/actions";
import { NotificationCard } from "@/modules/settings/components/notification-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsTools(props: React.ComponentProps<typeof NotificationCard>) {
  const [seeding, startSeed] = useTransition();

  const reseed = () =>
    startSeed(async () => {
      const res = await reseedAction();
      if (res.ok) toast.success(res.message);
      else toast.error(`${res.error}. Check MONGODB_URI and try again.`);
    });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <NotificationCard {...props} />

      <Card id="data" className="scroll-mt-32 lg:scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4 text-muted-foreground" aria-hidden /> Data and backup
          </CardTitle>
          <CardDescription>Your progress lives in MongoDB. Keep a backup now and then.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <div className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Export backup</p>
              <p className="text-xs text-muted-foreground">Downloads all your progress as a JSON file. Do it about once a week.</p>
            </div>
            <Button asChild variant="outline" className="h-9 shrink-0 self-start sm:self-auto">
              <a href="/api/export" download>
                <Download aria-hidden /> Export JSON
              </a>
            </Button>
          </div>
          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Re-seed content</p>
              <p className="text-xs text-muted-foreground">Upserts problems and topics from the content files into the database.</p>
            </div>
            <Button variant="outline" className="h-9 shrink-0 self-start sm:self-auto" onClick={reseed} loading={seeding}>
              {!seeding && <Database aria-hidden />} {seeding ? "Seeding…" : "Re-seed"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
