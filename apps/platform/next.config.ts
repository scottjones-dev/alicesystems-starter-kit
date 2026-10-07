import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Workspace packages ship TypeScript source, so Next compiles them with the app.
  transpilePackages: ["@repo/config", "@repo/ui"],
};

export default nextConfig;
