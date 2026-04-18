import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@clawly-work/db", "agent"],
  serverExternalPackages: ["postgres", "@temporalio/client", "@temporalio/workflow"],
};

export default nextConfig;
