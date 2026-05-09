import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent TypeScript errors from blocking production builds.
  // Run `npx tsc --noEmit` locally or in CI for type-safety checks.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
