// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — shared Open Mirror footer (adopted by all satellites).
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorFooter.tsx
// Then run scripts/sync-ui.sh — never edit the copies in site repos.
//
// Family footer standard (owner, 2026-08-02). Exactly three centered lines:
//   1. OpenMirrorLLC.com · About · ✝️ ❤️ 🙏
//      (About goes to THIS site's own About page; the three icons are ONE
//      accessible link to CrossHeartPray — never spelled out as text)
//   2. Contact · Disclaimer
//      (both are anchors into THIS site's own About page sections —
//      never a mailto, never a separate page, never another site)
//   3. Open Mirror LLC is a small independent company.  (plain text)
// Self-contained: handles its own light/dark theming for BOTH theme
// attributes (data-om-theme and data-chp-visual-theme) and pins itself to
// the bottom of short pages via the body flex column below. Every About
// page must carry id="contact" and id="disclaimer" sections.
// ─────────────────────────────────────────────────────────────────────────────

const OM = "https://openmirrorllc.com";

const css = `
body{min-height:100vh;min-height:100svh;display:flex;flex-direction:column}
.om-footer{margin-top:auto;width:100%;padding-top:44px}
.om-footer-rule{border-top:1px solid #26324c}
.om-footer-in{max-width:1120px;margin:0 auto;padding:6px 16px calc(16px + env(safe-area-inset-bottom,0px))}
.om-footer-row{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;column-gap:10px;margin:0}
.om-footer-row a{white-space:nowrap;text-decoration:none;padding:7px 2px;border-radius:4px}
.om-footer-main a{font-size:13px;font-weight:600;color:#cbd5e1}
.om-footer-sub a{font-size:12px;font-weight:500;color:#94a3b8}
.om-footer-row a:hover{text-decoration:underline;text-underline-offset:4px}
.om-footer-row a:active{opacity:.7}
.om-footer-row a:focus-visible{outline:2px solid #94a3b8;outline-offset:2px}
.om-footer-dot{color:#475569;font-size:12px;user-select:none}
.om-footer-legal{margin:2px 0 0;text-align:center;font-size:11px;font-weight:500;color:#64748b}
@media (prefers-reduced-motion:reduce){.om-footer *{transition:none!important;animation:none!important}}
html[data-om-theme="light"] .om-footer-rule,html[data-chp-visual-theme="light"] .om-footer-rule{border-top-color:#dbe2ea}
html[data-om-theme="light"] .om-footer-main a,html[data-chp-visual-theme="light"] .om-footer-main a{color:#334155}
html[data-om-theme="light"] .om-footer-sub a,html[data-chp-visual-theme="light"] .om-footer-sub a{color:#64748b}
html[data-om-theme="light"] .om-footer-dot,html[data-chp-visual-theme="light"] .om-footer-dot{color:#b6c2d4}
html[data-om-theme="light"] .om-footer-legal,html[data-chp-visual-theme="light"] .om-footer-legal{color:#8494ab}
html[data-om-theme="light"] .om-footer-row a:focus-visible,html[data-chp-visual-theme="light"] .om-footer-row a:focus-visible{outline-color:#475569}
`;

const Dot = () => (
  <span className="om-footer-dot" aria-hidden="true">
    ·
  </span>
);

type Props = {
  /** This site's own About route (default "/about"; the hub passes
   *  "/about-open-mirror"). Contact/Disclaimer anchor into it. */
  aboutHref?: string;
};

export default function OpenMirrorFooter({ aboutHref = "/about" }: Props) {
  return (
    <footer className="om-footer">
      <style>{css}</style>
      <div className="om-footer-rule">
        <div className="om-footer-in">
          <nav aria-label="Open Mirror LLC">
            <p className="om-footer-row om-footer-main">
              <a href={OM}>OpenMirrorLLC.com</a>
              <Dot />
              <a href={aboutHref}>About</a>
              <Dot />
              <a
                href="https://crossheartpray.com"
                aria-label="Visit CrossHeartPray"
              >
                <span aria-hidden="true">✝️ ❤️ 🙏</span>
              </a>
            </p>
            <p className="om-footer-row om-footer-sub">
              <a href={`${aboutHref}#contact`}>Contact</a>
              <Dot />
              <a href={`${aboutHref}#disclaimer`}>Disclaimer</a>
            </p>
          </nav>
          <p className="om-footer-legal">
            Open Mirror LLC is a small independent company.
          </p>
        </div>
      </div>
    </footer>
  );
}
