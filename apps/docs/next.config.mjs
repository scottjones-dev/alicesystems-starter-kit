import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source, so Next compiles them with the app.
  transpilePackages: ["@repo/config", "@repo/ui"],
};

export default withMDX(config);
