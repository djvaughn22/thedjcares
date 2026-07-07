import type { Metadata } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";

export const metadata: Metadata = {
  title: "TheDJCares",
  description: "Your digital disc jockey connecting you to uplifting music, sermons, podcasts, churches, charities, and gospel-centered resources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OpenMirrorNav site="TheDJCares.com" />
        {children}
        <OpenMirrorFooter siteName="TheDJCares.com" tagline="Follow Jesus. Love God. Pray." />
      </body>
    </html>
  );
}
