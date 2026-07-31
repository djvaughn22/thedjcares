// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — shared Open Mirror footer (adopted by all 9 satellites).
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorFooter.tsx
// Then run scripts/sync-ui.sh — never edit the copies in site repos.
//
// Family footer standard (owner, 2026-07-30). Three lines, in order:
//   1. the site's own identity line (© year SiteName.com · tagline) — hub
//      passes no siteName and renders "© year Open Mirror LLC" instead
//   2. Open Mirror LLC · About Open Mirror · ✝️ ❤️ 🙏  (the three symbols are
//      ONE link to CrossHeartPray, labeled "Visit CrossHeartPray")
//   3. Open Mirror LLC is a small independent company. · Disclaimer
// Open Mirror and CrossHeartPray live HERE, not in hamburger menus.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** e.g. "iDontCry.com" — omitted (the hub) renders "© year Open Mirror LLC" */
  siteName?: string;
  /** the site's own one-liner, e.g. "The Family's Digital Playground" */
  tagline?: string;
  /** the site's canonical accent — colors the ".com" in siteName */
  accent?: string;
  /** the site's own disclaimer route when it has one; defaults to the hub's */
  disclaimerHref?: string;
};

// Phrases render as inline-blocks so lines break BETWEEN phrases on phones
// and tablets, never mid-sentence; on desktop each line stays whole.
const phrase = { display: "inline-block" } as const;

const linkStyle = {
  ...phrase,
  color: "#94a3b8",
  textDecoration: "none",
  // Comfortable tap target without breaking the text-line rhythm.
  padding: "4px 2px",
} as const;

export default function OpenMirrorFooter({
  siteName,
  tagline,
  accent,
  disclaimerHref = "https://openmirrorllc.com/disclaimer",
}: Props) {
  const baseName =
    siteName && siteName.endsWith(".com") ? siteName.slice(0, -4) : siteName;
  const hasCom = Boolean(siteName && siteName.endsWith(".com"));

  return (
    <footer className="om-footer" style={{ marginTop: 60, textAlign: "center", borderTop: "1px solid #26324c", padding: "28px 20px 36px" }}>
      {/* Line 1 — the site's own identity. */}
      {siteName ? (
        <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, lineHeight: 1.7, margin: "0 0 6px" }}>
          <span style={phrase}>
            © {new Date().getFullYear()} {baseName}
            {hasCom ? <span style={{ color: accent ?? "#94a3b8" }}>.com</span> : null}
          </span>
          {tagline ? (
            <>
              {" · "}
              <span style={phrase}>{tagline}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, lineHeight: 1.7, margin: "0 0 6px" }}>
          <span style={phrase}>© {new Date().getFullYear()} Open Mirror LLC</span>
        </p>
      )}

      {/* Line 2 — Open Mirror LLC · About Open Mirror · ✝️ ❤️ 🙏 */}
      <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, lineHeight: 1.9, margin: 0 }}>
        <a href="https://openmirrorllc.com" style={linkStyle}>Open Mirror LLC</a>
        {" · "}
        <a href="https://openmirrorllc.com/about-open-mirror" style={linkStyle}>About Open Mirror</a>
        {" · "}
        <a
          href="https://crossheartpray.com"
          aria-label="Visit CrossHeartPray"
          style={linkStyle}
        >
          <span aria-hidden="true">✝️ ❤️ 🙏</span>
        </a>
      </p>

      {/* Line 3 — plain sentence, then the disclaimer link. */}
      <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, lineHeight: 1.9, margin: "2px 0 0" }}>
        <span style={phrase}>Open Mirror LLC is a small independent company.</span>
        {" · "}
        <a href={disclaimerHref} style={{ ...linkStyle, textDecoration: "underline" }}>Disclaimer</a>
      </p>
    </footer>
  );
}
