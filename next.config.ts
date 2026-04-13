import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["@workspace/ui"],
};

export default nextConfig;
