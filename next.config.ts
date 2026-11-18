import type { NextConfig } from "next";

// Site-wide security headers (Nov 18 2026): the same set the hub,
// PleaseBeReady, WatchedNotWatched, DontCloneMeTom and WhatAmIAI send.
// Same-origin framing is safe: no Open Mirror site frames TheDJCares; its own
// frames are YouTube players, which these headers don't affect.
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
