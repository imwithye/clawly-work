import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@clawly-work/db"],
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
