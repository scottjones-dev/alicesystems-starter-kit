import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // A 404 page for URLs that match no route. Needed because the root layout is under [lang].
  experimental: { globalNotFound: true },
  reactStrictMode: true,
  // Workspace packages ship TypeScript source, so Next compiles them with the app.
  transpilePackages: ["@repo/config", "@repo/ui"],
};

export default withMDX(config);
