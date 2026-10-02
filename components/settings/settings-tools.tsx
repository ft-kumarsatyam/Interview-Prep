"use client";

import { useTransition } from "react";
import { BellRing, CheckCircle2, CircleDashed, Database, Download } from "lucide-react";
import { toast } from "sonner";
import { reseedAction, testNotificationAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsTools({ channels }: { channels: Array<{ name: string; configured: boolean; envVars: string }> }) {
  const [testing, startTest] = useTransition();
  const [seeding, startSeed] = useTransition();

  const test = () =>
    startTest(async () => {
      const res = await testNotificationAction();
      if (!res.ok) return void toast.error(`${res.error}.`);
      if (res.sent.length) toast.success(`Sent via ${res.sent.join(" and ")}`);
      if (res.failed.length) toast.error(`${res.failed.join(" and ")} failed. Check the token and chat id, then try again.`);
    });

  const reseed = () =>
    startSeed(async () => {
      const res = await reseedAction();
      if (res.ok) toast.success(res.message);
      else toast.error(`${res.error}. Check MONGODB_URI and try again.`);
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Notification channels</CardTitle>
          <CardDescription>In-app notifications always work. Push channels are set with env vars.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            {channels.map((c) => (
              <li key={c.name} className="flex items-start gap-2">
                {c.configured ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <CircleDashed className="mt-0.5 size-4 text-muted-foreground" />}
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  <span className="text-muted-foreground">{c.configured ? "configured" : <>off · set <code className="font-mono text-xs">{c.envVars}</code></>}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" onClick={test} disabled={testing || !channels.some((c) => c.configured)}>
            <BellRing /> {testing ? "Sending…" : "Send test"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Your progress lives in MongoDB. Keep a backup now and then.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/export" download>
              <Download /> Export backup (JSON)
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={reseed} disabled={seeding}>
            <Database /> {seeding ? "Seeding…" : "Re-seed content"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
