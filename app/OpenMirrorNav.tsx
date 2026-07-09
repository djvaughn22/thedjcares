// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — Open Mirror satellite header (Stage A of the reusable-
// component plan, docs/openmirror-audit/04-reusable-component-plan.md).
//
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorNav.tsx
// Then run: scripts/sync-ui.sh (copies this file into every satellite repo,
// overwriting the copies there — never edit the copies in site repos).
//
// ☰ family menu on every satellite (DJ, 2026-07-07): anyone can get anywhere
// without going back to the hub first. (Supersedes the 2026-07-06 no-menu
// rule.) Uses a plain <details> dropdown — no client JS, works everywhere.
// ─────────────────────────────────────────────────────────────────────────────

import OpenMirrorThemeToggle from "./OpenMirrorTheme";

const FAMILY = [
  { emoji: "🪞", name: "Open Mirror Home", href: "https://openmirrorllc.com" },
  { emoji: "✝️", name: "CrossHeartPray", href: "https://crossheartpray.com" },
  { emoji: "🎵", name: "TheDJCares", href: "https://thedjcares.com" },
  { emoji: "🐶", name: "DontCloneMeTom", href: "https://dontclonemetom.com" },
  { emoji: "😂", name: "iDontCry", href: "https://idontcry.com" },
  { emoji: "🥊", name: "StepInTheRing", href: "https://stepinthering.com" },
  { emoji: "🧩", name: "OpenDoku", href: "https://opendoku.com" },
  { emoji: "🤖", name: "WhatAmIAI", href: "https://whatamiai.com" },
  { emoji: "🧰", name: "PleaseBeReady", href: "https://pleasebeready.com" },
  { emoji: "🎬", name: "WatchedNotWatched", href: "https://watchednotwatched.com" },
  { emoji: "👨‍👩‍👧‍👦", name: "Fambookagram", href: "https://fambookagram.com" },
  { emoji: "🫂", name: "Friendbookagram", href: "https://friendbookagram.com" },
  { emoji: "ℹ️", name: "About Open Mirror", href: "https://openmirrorllc.com/about-open-mirror" },
];

export default function OpenMirrorNav({ site }: { site?: string }) {
  return (
    <header className="om-bar" style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #26324c", background: "#0b1220" }}>
      <style>{`.om-menu summary::-webkit-details-marker{display:none}.om-menu summary::marker{content:""}.om-menu a:hover{background:#1c2740}@media (max-width:640px){.om-bar-label{display:none}}`}</style>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
        <a href="https://openmirrorllc.com" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#e8edf5", textDecoration: "none", whiteSpace: "nowrap" }}>
          <span>Open Mirror LLC</span>
        </a>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {site ? (
            <span className="om-bar-label" style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}>
              {site}
            </span>
          ) : null}
          <OpenMirrorThemeToggle />
          <details className="om-menu" style={{ position: "relative" }}>
            <summary
              aria-label="Open Mirror family menu"
              style={{ listStyle: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 50, border: "1px solid #26324c", background: "#141d2e", color: "#e8edf5", padding: "10px 16px", fontSize: 14, fontWeight: 900, minHeight: 40, touchAction: "manipulation" }}
            >
              ☰ Menu
            </summary>
            <nav
              style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60, width: 232, maxHeight: "70vh", overflowY: "auto", background: "#141d2e", border: "1px solid #26324c", borderRadius: 14, padding: 8 }}
            >
              {FAMILY.map((f) => (
                <a
                  key={f.href}
                  href={f.href}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", minHeight: 44, boxSizing: "border-box", borderRadius: 9, color: "#e8edf5", fontSize: 14, fontWeight: 700, textDecoration: "none", touchAction: "manipulation" }}
                >
                  <span aria-hidden="true">{f.emoji}</span>
                  <span>{f.name}</span>
                </a>
              ))}
            </nav>
          </details>
        </span>
      </div>
    </header>
  );
}
