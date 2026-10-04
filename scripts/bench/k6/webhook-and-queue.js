// k6 test for the inbound jobs webhook and the outbox relay endpoint. NOT YET RUN (k6 not installed where this was written).
//
//   k6 run -e BASE_URL=http://localhost:3000 -e WEBHOOK_SECRET=... -e CRON_SECRET=... scripts/bench/k6/webhook-and-queue.js
//
// Pushes batches of postings (the same batch twice: the second must add nothing), then calls the relay and checks the
// outbox is drained with nothing dead-lettered.
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const WEBHOOK = __ENV.WEBHOOK_SECRET;
const CRON = __ENV.CRON_SECRET;
if (!WEBHOOK || !CRON) throw new Error("Set WEBHOOK_SECRET and CRON_SECRET");

export const options = { vus: 2, iterations: 20, thresholds: { checks: ["rate>0.99"], http_req_duration: ["p(95)<2000"] } };

export default function () {
  const run = `${__VU}-${__ITER}-${Date.now()}`;
  const jobs = Array.from({ length: 50 }, (_, i) => ({ title: `Backend Engineer ${i}`, company: "K6 Co", url: `https://k6.example.com/careers/${run}/${i}`, description: "Node.js, PostgreSQL" }));
  const headers = { Authorization: `Bearer ${WEBHOOK}`, "Content-Type": "application/json" };
  const first = http.post(`${BASE}/api/webhooks/jobs`, JSON.stringify({ jobs }), { headers });
  check(first, { "accepted 50": (r) => r.status === 200 && r.json("accepted") === 50 });
  const second = http.post(`${BASE}/api/webhooks/jobs`, JSON.stringify({ jobs }), { headers });
  check(second, { "the repeat added nothing": (r) => r.status === 200 && r.json("added") === 0 });

  const relay = http.get(`${BASE}/api/cron/relay`, { headers: { Authorization: `Bearer ${CRON}` } });
  check(relay, { "relay ok": (r) => r.status === 200, "nothing dead-lettered": (r) => r.json("stats.dead") === 0 });
}
