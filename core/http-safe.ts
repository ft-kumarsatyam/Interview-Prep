import "server-only";
import { lookup } from "node:dns/promises";
import { isPrivateAddress, isSafeUrl } from "@/modules/news/domain/article";
import { fetchWithPolicy, type FetchPolicy } from "@/core/http";

export class SafeFetchError extends Error {}

export const USER_AGENT = "Mozilla/5.0 (compatible; PrepOS/1.0; personal job and news reader)";
const MAX_REDIRECTS = 3;

/** Every address the host resolves to must be public; blocks SSRF into the VPC or localhost. */
export async function assertPublicHost(url: URL): Promise<void> {
  if (!isSafeUrl(url.toString())) throw new SafeFetchError("Blocked URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const answers = await lookup(host, { all: true, verbatim: true });
  if (!answers.length || answers.some((a) => isPrivateAddress(a.address))) throw new SafeFetchError("Blocked address");
}

/** Reads a body but stops (and cancels the download) the moment it passes `maxBytes`. */
export async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw new SafeFetchError("Response too large");
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new SafeFetchError("Response too large");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export interface SafeFetchOptions extends Pick<FetchPolicy, "headers" | "signal"> {
  timeoutMs?: number;
  maxBytes?: number;
  /** Reject responses whose content-type doesn't match (e.g. /html/i). */
  accept?: RegExp;
}

export interface SafeResponse {
  status: number;
  headers: Headers;
  text: string;
  finalUrl: string;
}

/**
 * Fetches an arbitrary public URL: every hop is checked against the SSRF rules, redirects are followed
 * by hand (at most 3), the body is size-capped, and each hop gets its own timeout. A 304 returns an empty body.
 */
export async function fetchSafe(start: string, opts: SafeFetchOptions = {}): Promise<SafeResponse> {
  let url = new URL(start);
  const maxBytes = opts.maxBytes ?? 3_000_000;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetchWithPolicy(url, {
      redirect: "manual",
      timeoutMs: opts.timeoutMs ?? 10_000,
      retries: 0,
      ...(opts.signal ? { signal: opts.signal } : {}),
      headers: { "user-agent": USER_AGENT, ...(opts.headers as Record<string, string> | undefined) },
    });
    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => undefined);
      if (!location) throw new SafeFetchError(`HTTP ${res.status} without Location`);
      url = new URL(location, url);
      continue;
    }
    if (res.status === 304) {
      await res.body?.cancel().catch(() => undefined);
      return { status: 304, headers: res.headers, text: "", finalUrl: url.toString() };
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => undefined);
      throw new SafeFetchError(`HTTP ${res.status}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (opts.accept && !opts.accept.test(type)) {
      await res.body?.cancel().catch(() => undefined);
      throw new SafeFetchError(`Unexpected content type (${type.split(";")[0] || "unknown"})`);
    }
    return { status: res.status, headers: res.headers, text: await readCapped(res, maxBytes), finalUrl: url.toString() };
  }
  throw new SafeFetchError("Too many redirects");
}
