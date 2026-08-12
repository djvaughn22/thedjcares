import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /today was the standing Instagram-bio link and the old dedicated
      // Daily Encouragement page. The homepage is now that experience —
      // permanent redirect so old bookmarks/bio links land gracefully
      // instead of duplicating the UI on its own route. Dated archives
      // (/today/2026-08-11) are untouched — they're a distinct history
      // feature, not the "second experience" this retires.
      {
        source: "/today",
        destination: "/#daily-encouragement",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
