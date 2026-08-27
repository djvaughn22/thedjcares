import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About TheDJCares",
  description:
    "A digital DJ for Christian media — hand-picked music, music videos, podcasts, and sermons. Gospel first, no algorithm.",
};

const A = "#A78BFA";

// Pre-filled request email — DJ reviews everything Gospel-first before adding.
const REQUEST_MAILTO =
  "mailto:ask@openmirrorllc.com?subject=" +
  encodeURIComponent("The DJ Cares — request") +
  "&body=" +
  encodeURIComponent(
    "What I'd love on The DJ Cares:\n\nTitle / name:\nArtist or speaker:\nLink (YouTube, Apple Music, or Spotify):\nWhy it encourages:\n",
  );

// Same rounded-card, compact-hero shell every other destination on the site
// uses (see HomeClient's card/border tokens) — kept as CSS custom
// properties (not JS state) so this stays a plain server component while
// still following the site's light/dark toggle via [data-om-theme].
const THEME_CSS = `
.djc-about{--bg:#0b1220;--text:#e8edf5;--sub:#94a3b8;--card:#141d2e;--border:#26324c}
html[data-om-theme="light"] .djc-about{--bg:#eef2f7;--text:#0f172a;--sub:#475569;--card:#ffffff;--border:#dbe2ea}
.djc-about a{color:${A}}
.djc-about-card{background:var(--card);border:2px solid var(--border);border-radius:18px;padding:20px 22px;margin-bottom:16px}
`;

export default function AboutPage() {
  return (
    <main className="djc-about" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{THEME_CSS}</style>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: A, margin: "0 0 10px" }}>
          <span aria-hidden>💜</span> About
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>
          TheDJCares<span style={{ color: A }}>.com</span>
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--sub)", margin: "0 0 24px" }}>
          A digital DJ for Christian media. Choose a category, press play, and let it spin something good —
          hand-picked music, music videos, playlists, podcasts, and sermons. Gospel first, no algorithm.
        </p>

        <div className="djc-about-card">
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 10px" }}>What you can do here</h2>
          <ul style={{ fontSize: 14.5, lineHeight: 1.8, color: "var(--sub)", margin: 0, paddingLeft: 18 }}>
            <li>Press play on hand-picked Christian music, videos, and playlists.</li>
            <li>Listen to podcasts and sermons chosen Gospel-first.</li>
            <li>Request something you&rsquo;d love to see added — everything is reviewed before it goes up.</li>
          </ul>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--sub)", margin: "0 0 8px" }}>
          TheDJCares is an <a href="https://openmirrorllc.com">Open Mirror LLC</a> project, and shares a heart with{" "}
          <a href="https://crossheartpray.com">CrossHeartPray</a> — no account needed for either.
        </p>

        <div className="djc-about-card">
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 8px" }}>💌 Request something</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--sub)", margin: "0 0 14px" }}>
            Have a song, sermon, podcast, or playlist that encourages you? Send it over. Everything is reviewed
            against Scripture before it&rsquo;s added — Jesus first, Scripture the test.
          </p>
          <a
            href={REQUEST_MAILTO}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 999,
              background: A,
              color: "#0b1220",
              fontWeight: 900,
              fontSize: 14.5,
              textDecoration: "none",
            }}
          >
            💌 Send a request
          </a>
          <p style={{ fontSize: 12.5, color: "var(--sub)", margin: "10px 0 0" }}>
            Opens your email app with a ready-to-fill template to ask@openmirrorllc.com.
          </p>
        </div>

        <div className="djc-about-card">
          <h2 style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px", color: "var(--sub)" }}>
            The plain print
          </h2>
          <p style={{ fontSize: 13, color: "var(--sub)", margin: 0, lineHeight: 1.7 }}>
            The DJ Cares doesn&rsquo;t own the third-party music, videos, sermons, podcasts, ministry names, artwork,
            or platform players featured here — ownership stays with their creators and publishers. Embedded and
            linked material comes from official or believed-to-be-authorized sources, and unavailable or changed
            content may be removed. Including a creator or ministry doesn&rsquo;t mean agreement with every statement
            they&rsquo;ve ever made. Embedded platforms control their own players and any advertising. Church
            submissions are reviewed by hand, and submission doesn&rsquo;t guarantee inclusion.
          </p>
        </div>

        {/* The footer's Contact and Disclaimer links land on these two
            sections (family standard, 2026-08-02). */}
        <section id="contact" className="djc-about-card" style={{ marginTop: 20, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 8px" }}>Contact</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--sub)", margin: 0 }}>
            Have a question or an idea? Email{" "}
            <a href="mailto:ask@openmirrorllc.com?subject=Open%20Mirror%20Inquiry">ask@openmirrorllc.com</a>.
          </p>
        </section>

        <section id="disclaimer" className="djc-about-card" style={{ scrollMarginTop: 96, marginBottom: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: "0 0 8px" }}>Disclaimer</h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--sub)", margin: 0 }}>
            Open Mirror LLC is independently owned and operated. Nothing published by Open Mirror LLC is sponsored
            by, affiliated with, endorsed by, or representative of the owner&rsquo;s full-time employer. Read the{" "}
            <a href="https://openmirrorllc.com/disclaimer">full Open Mirror disclaimer</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
