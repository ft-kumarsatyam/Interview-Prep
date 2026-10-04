import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs the app (and the worker) outside Vercel; Vercel ignores this.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // Pin the workspace root: a stray lockfile in the home directory would otherwise be picked up.
  turbopack: { root: process.cwd() },
  // pino and the OpenTelemetry SDK are plain Node packages: load them from node_modules instead of bundling them.
  serverExternalPackages: ["pino", "@opentelemetry/sdk-metrics", "@opentelemetry/exporter-metrics-otlp-http"],
  // Blocking metadata (no hidden streaming wrapper div). Avoids React hydration warnings when
  // browser extensions inject attributes (e.g. bis_skin_checked) into that div before hydrate.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Browsers must always re-check the worker so updates roll out on the next visit.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
