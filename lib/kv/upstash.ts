import { fetchWithPolicy } from "@/lib/http";
import { EVENT_MAX, EVENT_TTL_SEC, type KvEvent, type KvStore } from "./types";

type Cmd = (string | number)[];

/** Releases a lock only when its value still equals the caller's token. */
const RELEASE = "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";

/**
 * KvStore on Upstash Redis through its REST API (plain fetch, no SDK, no TCP), so it works on Vercel.
 * Every command is one request, which is what the free tier counts: callers keep polling gentle.
 */
export class UpstashKv implements KvStore {
  readonly name = "upstash" as const;
  /** Commands sent by this process, for the budget shown in Setup. */
  commands = 0;

  constructor(private readonly url: string, private readonly token: string, private readonly timeoutMs = 4000) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    this.commands += Array.isArray(body) && Array.isArray(body[0]) ? body.length : 1;
    const res = await fetchWithPolicy(`${this.url.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      timeoutMs: this.timeoutMs,
      retries: 1,
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    return (await res.json()) as T;
  }
  private async cmd<T = unknown>(args: Cmd): Promise<T> {
    const out = await this.post<{ result?: T; error?: string }>("", args);
    if (out.error) throw new Error(`Upstash: ${out.error}`);
    return out.result as T;
  }

  async get(key: string) {
    return (await this.cmd<string | null>(["GET", key])) ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    await this.cmd(["SET", key, value, "EX", Math.max(1, Math.ceil(ttlSec))]);
  }
  async del(key: string) {
    await this.cmd(["DEL", key]);
  }
  async incr(key: string, ttlSec: number) {
    const out = await this.post<Array<{ result?: number; error?: string }>>("/pipeline", [["INCR", key], ["EXPIRE", key, Math.max(1, Math.ceil(ttlSec)), "NX"]]);
    if (out[0]?.error) throw new Error(`Upstash: ${out[0].error}`);
    return out[0]?.result ?? 1;
  }
  async setNx(key: string, token: string, ttlSec: number) {
    return (await this.cmd<string | null>(["SET", key, token, "NX", "EX", Math.max(1, Math.ceil(ttlSec))])) === "OK";
  }
  async releaseIfOwner(key: string, token: string) {
    return (await this.cmd<number>(["EVAL", RELEASE, 1, key, token])) === 1;
  }
  async eventsAppend(channel: string, data: string) {
    const out = await this.post<Array<{ result?: string; error?: string }>>("/pipeline", [["XADD", `ev:${channel}`, "MAXLEN", "~", EVENT_MAX, "*", "d", data], ["EXPIRE", `ev:${channel}`, EVENT_TTL_SEC]]);
    if (out[0]?.error || !out[0]?.result) throw new Error(`Upstash: ${out[0]?.error ?? "no id"}`);
    return out[0].result;
  }
  async eventsRead(channel: string, after: string, limit = 100): Promise<KvEvent[]> {
    if (!/^\d+-\d+$/.test(after)) return [];
    const rows = await this.cmd<Array<[string, string[]]>>(["XRANGE", `ev:${channel}`, `(${after}`, "+", "COUNT", limit]);
    return (rows ?? []).map(([id, fields]) => ({ id, data: fields[fields.indexOf("d") + 1] ?? "" }));
  }
  async eventsLastId(channel: string) {
    const rows = await this.cmd<Array<[string, string[]]>>(["XREVRANGE", `ev:${channel}`, "+", "-", "COUNT", 1]);
    return rows?.[0]?.[0] ?? null;
  }
}
