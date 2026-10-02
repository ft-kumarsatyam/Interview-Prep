import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the home directory would otherwise be picked up.
  turbopack: { root: process.cwd() },
  // Blocking metadata (no hidden streaming wrapper div). Avoids React hydration warnings when
  // browser extensions inject attributes (e.g. bis_skin_checked) into that div before hydrate.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
