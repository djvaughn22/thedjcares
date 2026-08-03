// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — shared Open Mirror footer (adopted by all satellites).
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorFooter.tsx
// Then run scripts/sync-ui.sh — never edit the copies in site repos.
//
// Family footer standard (owner, 2026-08-02). Exactly two bands:
//   1. Open Mirror LLC (brand link, hub homepage) · CrossHeartPray · About ·
//      Contact · Disclaimer — one labeled <nav>, links wrap on phones
//   2. © year Open Mirror LLC. A small independent company.
// Nothing else: no site identity line, no per-site slogans, no emoji rows,
// no duplicate legal copy. Self-contained: handles its own light/dark theming
// for BOTH theme attributes (data-om-theme and data-chp-visual-theme) and
// pins itself to the bottom of short pages via the body flex column below.
// ─────────────────────────────────────────────────────────────────────────────

const OM = "https://openmirrorllc.com";

const css = `
body{min-height:100vh;min-height:100svh;display:flex;flex-direction:column}
.om-footer{margin-top:auto;width:100%;padding-top:48px}
.om-footer-rule{border-top:1px solid #26324c}
.om-footer-in{max-width:1120px;margin:0 auto;padding:14px 24px calc(26px + env(safe-area-inset-bottom,0px))}
.om-footer-nav{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:24px}
.om-footer-brand{margin-right:auto;font-size:13.5px;font-weight:700;letter-spacing:.01em;color:#e8edf5;text-decoration:none;padding:8px 0}
.om-footer-link{font-size:13px;font-weight:500;color:#94a3b8;text-decoration:none;padding:8px 0}
.om-footer-brand:hover,.om-footer-link:hover{text-decoration:underline;text-underline-offset:4px}
.om-footer a:focus-visible{outline:2px solid #94a3b8;outline-offset:3px;border-radius:2px}
.om-footer-legal{margin:2px 0 0;font-size:12px;font-weight:400;color:#94a3b8}
@media (max-width:640px){.om-footer{padding-top:40px}.om-footer-brand,.om-footer-link{padding:10px 0}}
html[data-om-theme="light"] .om-footer-rule,html[data-chp-visual-theme="light"] .om-footer-rule{border-top-color:#dbe2ea}
html[data-om-theme="light"] .om-footer-brand,html[data-chp-visual-theme="light"] .om-footer-brand{color:#172033}
html[data-om-theme="light"] .om-footer-link,html[data-chp-visual-theme="light"] .om-footer-link{color:#475569}
html[data-om-theme="light"] .om-footer-legal,html[data-chp-visual-theme="light"] .om-footer-legal{color:#64748b}
html[data-om-theme="light"] .om-footer a:focus-visible,html[data-chp-visual-theme="light"] .om-footer a:focus-visible{outline-color:#475569}
`;

type Props = {
  /** true only on the Open Mirror hub itself — links stay relative there */
  hub?: boolean;
};

export default function OpenMirrorFooter({ hub = false }: Props) {
  const base = hub ? "" : OM;
  const links: Array<[string, string]> = [
    ["CrossHeartPray", "https://crossheartpray.com"],
    ["About", `${base}/about-open-mirror`],
    ["Contact", `${base}/contact`],
    ["Disclaimer", `${base}/disclaimer`],
  ];

  return (
    <footer className="om-footer">
      <style>{css}</style>
      <div className="om-footer-rule">
        <div className="om-footer-in">
          <nav aria-label="Open Mirror LLC" className="om-footer-nav">
            <a className="om-footer-brand" href={hub ? "/" : OM}>
              Open Mirror LLC
            </a>
            {links.map(([label, href]) => (
              <a key={label} className="om-footer-link" href={href}>
                {label}
              </a>
            ))}
          </nav>
          <p className="om-footer-legal">
            © {new Date().getFullYear()} Open Mirror LLC. A small independent
            company.
          </p>
        </div>
      </div>
    </footer>
  );
}
