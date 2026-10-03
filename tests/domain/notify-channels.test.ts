import { afterEach, describe, expect, it, vi } from "vitest";
import { brevoApiKey, brevoChannel, configuredChannels } from "@/lib/notify";
import { resetEnvForTests } from "@/lib/env";

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

describe("configuredChannels", () => {
  const base = {
    MONGODB_URI: "mongodb://localhost/x",
    AUTH_SECRET: "x".repeat(32),
    ADMIN_EMAIL: "a@b.co",
    ADMIN_PASSWORD_HASH_B64: "x".repeat(20),
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
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
});
