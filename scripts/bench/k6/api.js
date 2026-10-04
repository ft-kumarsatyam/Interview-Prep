// k6 load test for the public API. NOT YET RUN: k6 was not installed where this was written. Run it against a local or
// preview server, never against production data you care about (it creates jobs).
//
//   k6 run -e BASE_URL=http://localhost:3000 -e TOKENS=pk_a_...,pk_b_... scripts/bench/k6/api.js
//
// Each token is limited to 120 requests/minute, so give it as many tokens (capture:write + jobs:read) as virtual users / 2.
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const TOKENS = (__ENV.TOKENS || "").split(",").filter(Boolean);
if (TOKENS.length === 0) throw new Error("Set TOKENS to one or more comma-separated PrepOS API tokens");

const replays = new Counter("idempotent_replays");
const writeMs = new Trend("write_ms", true);

export const options = {
  scenarios: {
    capture: { executor: "ramping-vus", startVUs: 1, stages: [{ duration: "30s", target: 5 }, { duration: "1m", target: 5 }, { duration: "10s", target: 0 }], exec: "capture" },
    read: { executor: "constant-arrival-rate", rate: 1, timeUnit: "1s", duration: "100s", preAllocatedVUs: 2, exec: "read", startTime: "5s" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{scenario:read}": ["p(95)<500"],
    write_ms: ["p(95)<1500"],
    checks: ["rate>0.99"],
  },
};

const auth = (i) => ({ Authorization: `Bearer ${TOKENS[i % TOKENS.length]}`, "Content-Type": "application/json" });

export function capture() {
  const n = `${__VU}-${__ITER}-${Date.now()}`;
  const body = JSON.stringify({ title: `Load Test Engineer ${n}`, company: "K6", url: `https://k6.example.com/jobs/${n}`, jd: "Node.js and PostgreSQL role." });
  const headers = { ...auth(__VU), "Idempotency-Key": `k6-${n}` };
  const first = http.post(`${BASE}/api/v1/jobs`, body, { headers });
  writeMs.add(first.timings.duration);
  check(first, { "created": (r) => r.status === 201 });
  // The same request again must be a replay, not a second write.
  const again = http.post(`${BASE}/api/v1/jobs`, body, { headers });
  if (again.headers["Idempotent-Replayed"] === "true") replays.add(1);
  check(again, { "replayed with the same status": (r) => r.status === 201 && r.headers["Idempotent-Replayed"] === "true" });
  sleep(1.5);
}

export function read() {
  const res = http.get(`${BASE}/api/v1/jobs`, { headers: auth(0) });
  check(res, { "200": (r) => r.status === 200 });
}
