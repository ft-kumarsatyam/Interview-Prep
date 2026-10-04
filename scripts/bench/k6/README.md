# k6 load tests

These two scripts exercise a **running** server over HTTP. They have **not been run**: k6 was not installed on the machine
they were written on, so thresholds are starting points, not measured results. The measured numbers in
[`docs/BENCHMARKS.md`](../../../docs/BENCHMARKS.md) come from `npm run bench`, which runs in-process.

- `api.js`: captures jobs with an Idempotency-Key, repeats every request (must replay, not write twice) and reads the tracker. Needs API tokens (Settings > API tokens), one per two virtual users because a token allows 120 requests a minute.
- `webhook-and-queue.js`: pushes batches of 50 postings twice (the repeat must add nothing) and calls `/api/cron/relay`, checking nothing was dead-lettered.

Run against a local or preview deployment, not data you care about. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
