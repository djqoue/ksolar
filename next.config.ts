import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep dev and production artifacts isolated so `next build` does not corrupt a running `next dev`.
  distDir: isDevelopment ? ".next-dev" : ".next",
};

export default nextConfig;
