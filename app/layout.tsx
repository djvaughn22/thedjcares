import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TheDJCares",
  description: "Your digital disc jockey connecting you to uplifting music, sermons, podcasts, churches, charities, and gospel-centered resources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
