"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellRing, CalendarRange, Moon, Send, Smartphone, Sun, Sunset, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { subscribePushAction, testPushAction, unsubscribePushAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deviceLabel } from "@/modules/notifications/domain/push-payload";
import type { PushDevice } from "@/modules/notifications/services/push-subscriptions";

type Support = "checking" | "dev" | "unsupported" | "ios-install" | "denied" | "ready";

const TESTS = [
  { kind: "morning", label: "Morning plan", icon: Sun },
  { kind: "nudge", label: "Evening nudge", icon: Sunset },
  { kind: "night", label: "Night recap", icon: Moon },
  { kind: "weekly", label: "Weekly report", icon: CalendarRange },
  { kind: "ping", label: "Quick ping", icon: Send },
] as const;

/** VAPID keys are base64url; `PushManager.subscribe` wants the raw bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function detectSupport(): Support {
  if (process.env.NODE_ENV !== "production") return "dev";
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  if (ios && !isStandalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

const SUPPORT_NOTE: Partial<Record<Support, string>> = {
  dev: "Push needs the service worker, which only runs in production builds. Try it on the deployed app.",
  unsupported: "This browser can't receive web push. Use Chrome, Edge, Firefox or Safari 16.4+.",
  "ios-install": "On iPhone and iPad, push only works from the installed app: tap Share, then Add to Home Screen, and open PrepOS from there.",
  denied: "Notifications are blocked for this site. Allow them in the browser's site settings, then reload.",
};

const noSubscribe = () => () => {};

export function PushCard({ publicKey, devices: initialDevices }: { publicKey: string | null; devices: PushDevice[] }) {
  const detected = useSyncExternalStore<Support>(noSubscribe, detectSupport, () => "checking");
  const [override, setSupport] = useState<Support | null>(null);
  const [loaded, setLoaded] = useState(false);
  const support = override ?? (detected === "ready" && !loaded ? "checking" : detected);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [devices, setDevices] = useState(initialDevices);
  const [pending, start] = useTransition();
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (detected !== "ready") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setEndpoint(sub?.endpoint ?? null);
        setLoaded(true);
      })
      .catch(() => setSupport("unsupported"));
  }, [detected]);

  const enable = () =>
    start(async () => {
      if (!publicKey) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setSupport("denied");
        toast.error("Notifications weren't allowed");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const label = deviceLabel(navigator.userAgent, isStandalone());
        const res = await subscribePushAction({ subscription: sub.toJSON(), label });
        if (!res.ok) throw new Error(res.error);
        setEndpoint(sub.endpoint);
        setDevices((d) => [{ endpoint: sub.endpoint, label, createdAt: new Date().toISOString(), lastOkAt: null }, ...d.filter((x) => x.endpoint !== sub.endpoint)]);
        toast.success("Notifications are on for this device");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't turn on notifications");
      }
    });

  const remove = (target: string) =>
    start(async () => {
      if (target === endpoint) {
        const reg = await navigator.serviceWorker.ready;
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        setEndpoint(null);
      }
      const res = await unsubscribePushAction(target);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDevices((d) => d.filter((x) => x.endpoint !== target));
      toast.success("Device removed");
    });

  const test = (kind: (typeof TESTS)[number]["kind"]) => {
    setTesting(kind);
    start(async () => {
      const res = await testPushAction(kind);
      setTesting(null);
      if (res.ok) toast.success("Sent. It should appear in a few seconds.");
      else toast.error(res.error);
    });
  };

  const note = SUPPORT_NOTE[support];

  return (
    <Card id="push" className="scroll-mt-32 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4 text-muted-foreground" aria-hidden /> App notifications
        </CardTitle>
        <CardDescription>
          The morning plan, evening nudge, night recap and weekly report as phone or desktop notifications. Each shows a short summary; tap it for the full message.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!publicKey ? (
          <p className="text-sm text-muted-foreground">
            Not set up yet. Run <code className="font-mono text-xs">npx web-push generate-vapid-keys</code> and set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
          </p>
        ) : note ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-pretty text-muted-foreground">{note}</p>
        ) : support === "ready" && !endpoint ? (
          <Button onClick={enable} loading={pending}>
            {!pending && <BellRing aria-hidden />} Turn on for this device
          </Button>
        ) : support === "ready" ? (
          <p className="text-sm text-success">On for this device.</p>
        ) : null}

        {publicKey && devices.length > 0 && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Send a test notification</p>
              <div className="flex flex-wrap gap-2">
                {TESTS.map(({ kind, label, icon: Icon }) => (
                  <Button key={kind} variant="outline" size="sm" onClick={() => test(kind)} disabled={pending} loading={testing === kind}>
                    {testing !== kind && <Icon aria-hidden />} {label}
                  </Button>
                ))}
              </div>
            </div>
            <ul className="divide-y rounded-md border">
              {devices.map((d) => (
                <li key={d.endpoint} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Smartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{d.label}</span>
                    {d.endpoint === endpoint && <span className="shrink-0 text-xs text-muted-foreground">(this device)</span>}
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.label}`} onClick={() => remove(d.endpoint)} disabled={pending}>
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
