// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — shared Open Mirror footer (adopted by all 9 satellites).
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorFooter.tsx
// Then run scripts/sync-ui.sh — never edit the copies in site repos.
//
// Mounted in each satellite's app/layout.tsx after {children}; each site
// passes its own identity via `siteName` / `tagline`.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** e.g. "iDontCry.com" — omitted renders just the Open Mirror line */
  siteName?: string;
  /** the site's own one-liner, e.g. "The Family's Digital Playground" */
  tagline?: string;
  /** the site's canonical accent — colors the ".com" in siteName */
  accent?: string;
};

export default function OpenMirrorFooter({ siteName, tagline, accent }: Props) {
  const baseName =
    siteName && siteName.endsWith(".com") ? siteName.slice(0, -4) : siteName;
  const hasCom = Boolean(siteName && siteName.endsWith(".com"));

  return (
    <footer className="om-footer" style={{ marginTop: 60, textAlign: "center", borderTop: "1px solid #26324c", padding: "28px 20px 36px" }}>
      {siteName && (
        <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, margin: "0 0 6px" }}>
          © {new Date().getFullYear()} {baseName}
          {hasCom ? <span style={{ color: accent ?? "#94a3b8" }}>.com</span> : null}
          {tagline ? ` · ${tagline}` : ""}
        </p>
      )}
      <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
        <a href="https://openmirrorllc.com" style={{ color: "#e8edf5", textDecoration: "none" }}>Open Mirror LLC</a>
        {" · "}
        <a href="https://openmirrorllc.com/about-open-mirror" style={{ color: "#94a3b8", textDecoration: "none" }}>About</a>
        {" · "}
        <a href="https://crossheartpray.com" style={{ color: "#94a3b8", textDecoration: "none" }}>✝️ CrossHeartPray</a>
      </p>
    </footer>
  );
}
