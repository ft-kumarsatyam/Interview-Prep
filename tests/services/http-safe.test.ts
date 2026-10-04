import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: async (host: string) => (host === "internal.test" ? [{ address: "10.0.0.5", family: 4 }] : [{ address: "93.184.216.34", family: 4 }]),
}));

const { assertPublicHost, fetchSafe, readCapped, SafeFetchError } = await import("@/lib/http-safe");

afterEach(() => vi.unstubAllGlobals());

const body = (text: string, headers: Record<string, string> = {}) => new Response(text, { headers });

describe("assertPublicHost", () => {
  it("blocks private, local and credentialed URLs, and hosts that resolve to private addresses", async () => {
    for (const u of ["http://127.0.0.1/x", "http://localhost/x", "http://10.0.0.1/x", "https://user:pw@example.com/x", "ftp://example.com/x", "http://192.168.1.1/"]) {
      await expect(assertPublicHost(new URL(u)), u).rejects.toThrow(SafeFetchError);
    }
    await expect(assertPublicHost(new URL("https://internal.test/x"))).rejects.toThrow(/Blocked address/);
    await expect(assertPublicHost(new URL("https://example.com/x"))).resolves.toBeUndefined();
  });
});

describe("readCapped", () => {
  it("reads small bodies, and refuses oversized ones without reading them all", async () => {
    expect(await readCapped(body("hello"), 100)).toBe("hello");
    await expect(readCapped(body("x".repeat(500)), 100)).rejects.toThrow(/too large/);
    await expect(readCapped(body("small", { "content-length": "999999" }), 100)).rejects.toThrow(/too large/);
  });
  it("stops pulling data once the cap is passed", async () => {
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled++;
        c.enqueue(new Uint8Array(50));
        if (pulled > 1000) c.close();
      },
    });
    await expect(readCapped(new Response(stream), 120)).rejects.toThrow(/too large/);
    expect(pulled).toBeLessThan(20);
  });
});

describe("fetchSafe", () => {
  it("follows redirects but re-checks every hop", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string | URL) => {
      calls.push(String(url));
      if (String(url).includes("start.example")) return new Response(null, { status: 302, headers: { location: "https://internal.test/secret" } });
      return body("secret", { "content-type": "text/html" });
    });
    await expect(fetchSafe("https://start.example/a")).rejects.toThrow(/Blocked address/);
    expect(calls).toEqual(["https://start.example/a"]);
  });

  it("follows a safe redirect, enforces the content type and the redirect limit", async () => {
    vi.stubGlobal("fetch", async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/a")) return new Response(null, { status: 301, headers: { location: "/b" } });
      if (u.endsWith("/b")) return body("<html></html>", { "content-type": "text/html; charset=utf-8" });
      if (u.endsWith("/loop")) return new Response(null, { status: 302, headers: { location: "/loop" } });
      return body("{}", { "content-type": "application/json" });
    });
    const ok = await fetchSafe("https://good.example/a", { accept: /html/i });
    expect(ok).toMatchObject({ status: 200, finalUrl: "https://good.example/b", text: "<html></html>" });
    await expect(fetchSafe("https://good.example/json", { accept: /html/i })).rejects.toThrow(/Unexpected content type/);
    await expect(fetchSafe("https://good.example/loop")).rejects.toThrow(/Too many redirects/);
  });

  it("returns an empty body for 304 and throws on HTTP errors", async () => {
    vi.stubGlobal("fetch", async (url: string | URL) => (String(url).endsWith("/nm") ? new Response(null, { status: 304 }) : new Response("no", { status: 500 })));
    expect((await fetchSafe("https://good.example/nm")).status).toBe(304);
    await expect(fetchSafe("https://good.example/err")).rejects.toThrow(/HTTP 500/);
  });
});
