import type { Metadata, Viewport } from "next";
import "./globals.css";
import OpenMirrorFooter from "./OpenMirrorFooter";
import OpenMirrorNav from "./OpenMirrorNav";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://thedjcares.com"),
  title: {
    default: "TheDJCares",
    template: "%s | TheDJCares",
  },
  description: "Your digital disc jockey connecting you to uplifting music, sermons, podcasts, churches, charities, and gospel-centered resources.",
  applicationName: "TheDJCares",
  appleWebApp: { capable: true, title: "TheDJCares", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "TheDJCares",
    description: "Your digital disc jockey connecting you to uplifting music, sermons, podcasts, churches, charities, and gospel-centered resources.",
    url: "https://thedjcares.com",
    siteName: "TheDJCares",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
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
