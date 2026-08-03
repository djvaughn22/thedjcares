import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About TheDJCares",
  description:
    "A digital DJ for Christian media — hand-picked music, music videos, podcasts, and sermons. Gospel first, no algorithm.",
};

const A = "#A78BFA";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", color: "#e8edf5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 12px" }}>
          About TheDJCares<span style={{ color: A }}>.com</span>
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: "0 0 28px" }}>
          TheDJCares is a digital DJ for Christian media. Choose a category,
          press play, and let it spin something good — hand-picked music, music
          videos, playlists, podcasts, and sermons. Gospel first, no algorithm.
        </p>

        <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>What you can do here</h2>
        <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#94a3b8", margin: "0 0 28px", paddingLeft: 18 }}>
          <li>Press play on hand-picked Christian music, videos, and playlists.</li>
          <li>Listen to podcasts and sermons chosen Gospel-first.</li>
          <li>Request something you&rsquo;d love to see added — everything is reviewed before it goes up.</li>
        </ul>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#71717a", margin: 0 }}>
          TheDJCares is an{" "}
          <a href="https://openmirrorllc.com" style={{ color: A, textDecoration: "none" }}>
            Open Mirror LLC
          </a>{" "}
          project.
        </p>

        {/* The footer's Contact and Disclaimer links land on these two
            sections (family standard, 2026-08-02). */}
        <section id="contact" style={{ marginTop: 28, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>Contact</h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>
            Have a question or an idea? Email{" "}
            <a
              href="mailto:ask@openmirrorllc.com?subject=Open%20Mirror%20Inquiry"
              style={{ color: A }}
            >
              ask@openmirrorllc.com
            </a>
            .
          </p>
        </section>

        <section id="disclaimer" style={{ marginTop: 28, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, margin: "0 0 8px" }}>Disclaimer</h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#94a3b8", margin: 0 }}>
            Open Mirror LLC is independently owned and operated. Nothing
            published by Open Mirror LLC is sponsored by, affiliated with,
            endorsed by, or representative of the owner&rsquo;s full-time
            employer. Read the{" "}
            <a href="https://openmirrorllc.com/disclaimer" style={{ color: A }}>
              full Open Mirror disclaimer
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
