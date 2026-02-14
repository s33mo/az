import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard output - works with both VPS and Cloudflare Pages
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
