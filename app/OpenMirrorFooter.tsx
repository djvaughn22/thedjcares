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

// Phrases render as inline-blocks so lines break BETWEEN phrases on phones
// and tablets, never mid-sentence; on desktop each line stays whole.
const phrase = { display: "inline-block" } as const;

export default function OpenMirrorFooter({ siteName, tagline, accent }: Props) {
  const baseName =
    siteName && siteName.endsWith(".com") ? siteName.slice(0, -4) : siteName;
  const hasCom = Boolean(siteName && siteName.endsWith(".com"));

  return (
    <footer className="om-footer" style={{ marginTop: 60, textAlign: "center", borderTop: "1px solid #26324c", padding: "28px 20px 36px" }}>
      {siteName && (
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
      )}
      <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", lineHeight: 1.9, margin: 0 }}>
        <span style={phrase}>
          <a href="https://openmirrorllc.com" style={{ color: "#e8edf5", textDecoration: "none" }}>Open Mirror LLC</a>
          {" · "}
          <a href="https://openmirrorllc.com/about-open-mirror" style={{ color: "#94a3b8", textDecoration: "none" }}>About</a>
        </span>
        {" · "}
        <a href="https://crossheartpray.com" aria-label="CrossHeartPray" title="CrossHeartPray" style={{ ...phrase, textDecoration: "none" }}>✝️ ❤️ 🙏</a>
      </p>
      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, lineHeight: 1.8, margin: "10px auto 0", maxWidth: 520 }}>
        <span style={phrase}>Open Mirror LLC is an independent company,</span>{" "}
        <span style={phrase}>created and operated on personal time.</span>{" "}
        <a href="https://openmirrorllc.com/about-open-mirror#disclaimer" style={{ ...phrase, color: "#64748b", textDecoration: "underline" }}>
          Full disclaimer
        </a>
      </p>
    </footer>
  );
}
