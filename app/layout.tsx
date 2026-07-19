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
  description: "A digital DJ for Christian media. Choose a category, press play, and let The DJ Cares spin something good — hand-picked music, music videos, podcasts, and sermons. Gospel first, no algorithm.",
  applicationName: "TheDJCares",
  appleWebApp: { capable: true, title: "TheDJCares", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "TheDJCares",
    description: "A digital DJ for Christian media. Choose a category, press play, and let The DJ Cares spin something good — hand-picked music, music videos, podcasts, and sermons. Gospel first, no algorithm.",
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
        <OpenMirrorNav
          site="TheDJCares.com"
          accent="#A78BFA"
          links={[
            { emoji: "🎧", name: "Now Spinning", href: "/" },
            { emoji: "🎵", name: "Music", href: "/#music" },
            { emoji: "📺", name: "Music Videos", href: "/#videos" },
            { emoji: "🎙️", name: "Podcasts", href: "/#podcasts" },
            { emoji: "⛪", name: "Sermons", href: "/#sermons" },
            { emoji: "🌅", name: "Daily Encouragement", href: "/today" },
            { emoji: "ℹ️", name: "About TheDJCares", href: "/#about" },
          ]}
        />
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
