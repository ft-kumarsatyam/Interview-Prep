import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the home directory would otherwise be picked up.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
