import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Notification, PushSubscriptionModel } from "@/lib/models/system";
import { webPushChannel } from "@/lib/notify/web-push";
import { getNotificationDetail, notify } from "@/lib/services/notifications";
import { listPushDevices, savePushSubscription } from "@/lib/services/push-subscriptions";
import { resetDb, startDb, stopDb } from "./db";

const sendNotification = vi.hoisted(() => vi.fn());
vi.mock("web-push", async (importOriginal) => {
  const real = await importOriginal<{ default: object }>();
  return { ...real, default: { ...real.default, sendNotification }, sendNotification };
});
const { WebPushError } = await import("web-push");

const keys = { publicKey: "pub", privateKey: "priv", subject: "mailto:me@example.com" };
const sub = (n: number) => ({ endpoint: `https://push.example.com/${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });
const gone = () => new WebPushError("Gone", 410, {}, "expired", "https://push.example.com/x");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  sendNotification.mockReset();
});

describe("webPushChannel", () => {
  it("fails clearly when no device has subscribed", async () => {
    await expect(webPushChannel(keys).send("T", "B")).rejects.toThrow(/No device/);
  });

  it("sends the summarised payload to every device and marks them delivered", async () => {
    await savePushSubscription(sub(1), "Mac · Chrome");
    await savePushSubscription(sub(2), "iPhone · installed app");
    sendNotification.mockResolvedValue({ statusCode: 201 });

    await webPushChannel(keys).send("Ping", "line one\nline two", undefined, {
      content: { title: "Ping", body: "line one\nline two" },
      url: "/notifications/abc",
      tag: "prepos-sync",
    });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    const [target, payload, opts] = sendNotification.mock.calls[0];
    expect(target).toEqual(sub(1));
    expect(JSON.parse(payload)).toMatchObject({ title: "Ping", body: "line one\nline two", url: "/notifications/abc", tag: "prepos-sync" });
    expect(opts).toMatchObject({ vapidDetails: keys, TTL: 43_200 });
    expect((await listPushDevices()).every((d) => d.lastOkAt !== null)).toBe(true);
  });

  it("drops expired subscriptions and still succeeds if another device got it", async () => {
    await savePushSubscription(sub(1), "old phone");
    await savePushSubscription(sub(2), "laptop");
    sendNotification.mockImplementation(async (s: { endpoint: string }) => {
      if (s.endpoint.endsWith("/1")) throw gone();
      return { statusCode: 201 };
    });

    await webPushChannel(keys).send("T", "B");
    expect((await PushSubscriptionModel.find().lean()).map((d) => d.endpoint)).toEqual([sub(2).endpoint]);
  });

  it("reports a failure when every device rejects it", async () => {
    await savePushSubscription(sub(1), "phone");
    sendNotification.mockRejectedValue(new WebPushError("Forbidden", 403, {}, "bad vapid", sub(1).endpoint));
    await expect(webPushChannel(keys).send("T", "B")).rejects.toThrow("HTTP 403: bad vapid");
    expect(await PushSubscriptionModel.countDocuments()).toBe(1);
  });

  it("asks to turn notifications on again when every subscription has expired", async () => {
    await savePushSubscription(sub(1), "phone");
    sendNotification.mockRejectedValue(gone());
    await expect(webPushChannel(keys).send("T", "B")).rejects.toThrow(/expired/);
    expect(await PushSubscriptionModel.countDocuments()).toBe(0);
  });
});

describe("notify with push content", () => {
  const spec = { title: "Day recap", intro: "Good day.", sections: [{ heading: "Done", lines: ["2 problems"] }] };

  it("stores the full message, links the push to it, and only pushes once per dedupe key", async () => {
    const send = vi.fn(async () => {});
    const channel = { name: "push" as const, send };
    const first = await notify(
      { kind: "recap", title: "Recap", body: "short", dedupeKey: "recap:2026-10-03" },
      { push: true, channels: [channel], pushContent: { title: "Roast | Recap", body: "long", spec, roast: "Roast" } },
    );
    const again = await notify({ kind: "recap", title: "Recap", body: "short", dedupeKey: "recap:2026-10-03" }, { push: true, channels: [channel] });

    expect(first).toEqual({ created: true, pushed: ["push"] });
    expect(again).toEqual({ created: false, pushed: [] });
    expect(send).toHaveBeenCalledTimes(1);

    const meta = (send.mock.calls[0] as unknown[])[3] as { url: string; tag: string };
    expect(meta.tag).toBe("prepos-recap");
    const id = meta.url.replace("/notifications/", "");
    const detail = await getNotificationDetail(id);
    expect(detail).toMatchObject({ title: "Recap", body: "short", spec, roast: "Roast", read: true, hasDetail: true });
  });

  it("returns null for malformed or unknown ids", async () => {
    expect(await getNotificationDetail("not-an-id")).toBeNull();
    expect(await getNotificationDetail("0123456789abcdef01234567")).toBeNull();
    expect(await Notification.countDocuments()).toBe(0);
  });
});
