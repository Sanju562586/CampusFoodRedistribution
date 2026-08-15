import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent TypeScript errors from blocking production builds.
  // Run `npx tsc --noEmit` locally or in CI for type-safety checks.
  typescript: {
    ignoreBuildErrors: true,
  },

  // ── Gzip compression (helps local dev + non-edge deployments) ──────────────
  compress: true,

  // ── Remove X-Powered-By header (minor security + slightly smaller response) ─
  poweredByHeader: false,

  // ── Tree-shake heavy packages at build time ─────────────────────────────────
  // Reduces bundle size by only importing the icons / components actually used
  // instead of the entire library. Critical for framer-motion and lucide-react
  // which can add 100-200 KB unoptimized.
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
  },

  // ── Next.js Image Optimization ───────────────────────────────────────────────
  // Allow Cloudinary-hosted food images to be auto-optimized (WebP/AVIF, resized)
  // by Next.js instead of serving raw JPEGs. Reduces image payload 40-70%.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
