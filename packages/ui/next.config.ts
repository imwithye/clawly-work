import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@clawly-work/db", "agent"],
  serverExternalPackages: [
    "postgres",
    "@temporalio/client",
    "@temporalio/workflow",
  ],
};

export default nextConfig;
