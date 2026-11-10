import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mutable file-store CMS + RSVP admin — keep request-time rendering.
  // (cacheComponents + force-dynamic are incompatible in this Next version.)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
