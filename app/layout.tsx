import type { Metadata } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";
import Script from "next/script";

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
        <OpenMirrorFooter siteName="TheDJCares.com" tagline="Follow Jesus. Love God. Pray." accent="#A78BFA" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JN3HQKH03P"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JN3HQKH03P');`}
        </Script>
      </body>
    </html>
  );
}
