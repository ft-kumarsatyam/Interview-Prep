"use client";

import { useTransition } from "react";
import { Bell, BellRing, CheckCircle2, CircleDashed, Database, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reseedAction, testNotificationAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsTools({ channels }: { channels: Array<{ name: string; configured: boolean; envVars: string }> }) {
  const [testing, startTest] = useTransition();
  const [seeding, startSeed] = useTransition();
  const anyConfigured = channels.some((c) => c.configured);

  const test = () =>
    startTest(async () => {
      const res = await testNotificationAction();
      if (!res.ok) return void toast.error(`${res.error}.`);
      if (res.sent.length) toast.success(`Sent via ${res.sent.join(" and ")}. Check your phone or inbox.`);
      if (res.failed.length) toast.error(`${res.failed.join(" and ")} failed. Check the token and chat id, then try again.`);
    });

  const reseed = () =>
    startSeed(async () => {
      const res = await reseedAction();
      if (res.ok) toast.success(res.message);
      else toast.error(`${res.error}. Check MONGODB_URI and try again.`);
    });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card id="notifications" className="scroll-mt-32 lg:scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" aria-hidden /> Notification channels
          </CardTitle>
          <CardDescription>In-app notifications always work. Push channels are set with env vars.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {channels.map((c) => (
              <li key={c.name} className="flex items-start gap-3 rounded-lg border p-3">
                {c.configured ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className={c.configured ? "text-xs font-medium text-success" : "text-xs text-muted-foreground"}>{c.configured ? "On" : "Off"}</span>
                  </div>
                  {!c.configured && (
                    <p className="mt-0.5 text-xs break-words text-muted-foreground">
                      Set <code className="font-mono">{c.envVars}</code> to turn it on.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="h-9" onClick={test} disabled={testing || !anyConfigured}>
            {testing ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />} {testing ? "Sending…" : "Send a test"}
          </Button>
        </CardContent>
      </Card>

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
            <Button variant="outline" className="h-9 shrink-0 self-start sm:self-auto" onClick={reseed} disabled={seeding}>
              {seeding ? <Loader2 className="animate-spin" aria-hidden /> : <Database aria-hidden />} {seeding ? "Seeding…" : "Re-seed"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
