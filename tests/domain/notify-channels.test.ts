import { afterEach, describe, expect, it, vi } from "vitest";
import { brevoApiKey, brevoChannel, configuredChannels, emailChannel, whatsappChannel } from "@/core/notify";
import { resetEnvForTests } from "@/core/env";

const KEY = "xkeysib-abc123-def";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("brevoApiKey", () => {
  it("keeps a plain key and decodes the base64 MCP form", () => {
    expect(brevoApiKey(KEY)).toBe(KEY);
    expect(brevoApiKey(Buffer.from(JSON.stringify({ api_key: KEY })).toString("base64"))).toBe(KEY);
    expect(brevoApiKey("  not-a-key  ")).toBe("not-a-key");
  });
});

describe("brevoChannel", () => {
  it("posts to the v3 transactional API with text and html", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await brevoChannel(KEY, "me@example.com", "you@example.com").send("Subject", "Plain", "<p>Rich</p>");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init.headers as Record<string, string>)["api-key"]).toBe(KEY);
    expect(JSON.parse(String(init.body))).toEqual({
      sender: { name: "PrepOS", email: "me@example.com" },
      to: [{ email: "you@example.com" }],
      subject: "Subject",
      textContent: "Plain",
      htmlContent: "<p>Rich</p>",
    });
  });

  it("throws on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unauthorised IP", { status: 401 })));
    await expect(brevoChannel(KEY, "a@b.co", "c@d.co").send("S", "B")).rejects.toThrow(/401/);
  });
});

describe("emailChannel", () => {
  it("sends from the verified sender when given, else Resend's test sender", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await emailChannel("re_1", "me@x.co", "prepos@satyam-dev.in").send("S", "B");
    await emailChannel("re_1", "me@x.co").send("S", "B");
    const froms = fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)).from);
    expect(froms).toEqual(["PrepOS <prepos@satyam-dev.in>", "PrepOS <onboarding@resend.dev>"]);
  });
});

describe("whatsappChannel", () => {
  it("posts a bold title and body to Whapi's text endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response('{"sent":true}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await whatsappChannel("tok", "919891142251", "https://gate.whapi.cloud/").send("Morning plan", "3 problems today");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://gate.whapi.cloud/messages/text");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({ to: "919891142251", body: "*Morning plan*\n3 problems today" });
  });

  it("caps the message at WhatsApp's length limit", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await whatsappChannel("tok", "919891142251", "https://gate.whapi.cloud").send("T", "x".repeat(5000));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)).body).toHaveLength(4096);
  });
});

describe("configuredChannels", () => {
  const base = {
    MONGODB_URI: "mongodb://localhost/x",
    AUTH_SECRET: "x".repeat(32),
    ADMIN_EMAIL: "a@b.co",
    ADMIN_PASSWORD_HASH_B64: "x".repeat(20),
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
    VAPID_PUBLIC_KEY: "",
    VAPID_PRIVATE_KEY: "",
  };
  const stub = (vars: Record<string, string>) => {
    for (const [k, v] of Object.entries({ ...base, ...vars })) vi.stubEnv(k, v);
    resetEnvForTests();
  };

  it("prefers Brevo over Resend so only one email goes out", async () => {
    stub({ NOTIFY_EMAIL: "me@x.co", BREVO_API_KEY: KEY, BREVO_SENDER_EMAIL: "me@x.co", RESEND_API_KEY: "re_1" });
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const channels = configuredChannels();
    expect(channels.map((c) => c.name)).toEqual(["email"]);
    await channels[0].send("S", "B");
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain("brevo.com");
  });

  it("falls back to Resend, and sends no email without a recipient", () => {
    stub({ NOTIFY_EMAIL: "me@x.co", BREVO_API_KEY: "", BREVO_SENDER_EMAIL: "", RESEND_API_KEY: "re_1" });
    expect(configuredChannels().map((c) => c.name)).toEqual(["email"]);
    stub({ NOTIFY_EMAIL: "", BREVO_API_KEY: KEY, BREVO_SENDER_EMAIL: "me@x.co", RESEND_API_KEY: "" });
    expect(configuredChannels()).toEqual([]);
  });

  it("adds WhatsApp only when both the token and recipient are set", () => {
    stub({ NOTIFY_EMAIL: "", WHAPI_TOKEN: "tok", WHATSAPP_TO: "919891142251" });
    expect(configuredChannels().map((c) => c.name)).toEqual(["whatsapp"]);
    stub({ NOTIFY_EMAIL: "", WHAPI_TOKEN: "tok", WHATSAPP_TO: "" });
    expect(configuredChannels()).toEqual([]);
  });

  it("adds PWA push only when both VAPID keys are set", () => {
    stub({ NOTIFY_EMAIL: "", VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" });
    expect(configuredChannels().map((c) => c.name)).toEqual(["push"]);
    stub({ NOTIFY_EMAIL: "", VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "" });
    expect(configuredChannels()).toEqual([]);
  });
});
