import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "*.supabase.co";

const nextConfig: NextConfig = {
  // Cache Components (Next 16 default): the shop pages are cached per tenant with `use cache` +
  // `cacheTag`, everything that reads the session streams in behind <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // A second `next dev` in the same folder (e2e on another port) needs its own build directory.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
    // Uploads get a fresh file name on every change, so optimized copies can be kept for long.
    minimumCacheTTL: 2_678_400,
  },
};

export default nextConfig;
