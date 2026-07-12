import type { MetadataRoute } from "next";

// Installable-app manifest — same app-readiness layer as stepinthering.com
// and idontcry.com.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TheDJCares",
    short_name: "TheDJCares",
    description:
      "Your digital disc jockey connecting you to uplifting music, sermons, podcasts, churches, charities, and gospel-centered resources.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/djc-512.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/djc-512-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
