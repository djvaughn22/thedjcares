"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — family dark/light toggle (☀️/🌙) + the shared light theme.
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorTheme.tsx
// Then run scripts/sync-ui.sh — never edit the copies in site repos.
//
// One toggle, every site: sets data-om-theme on <html>, remembers the choice,
// and broadcasts an "om-theme" event so page code (TheDJCares, iDontCry) can
// follow along. The light theme itself ships as embedded CSS that remaps the
// family color tokens (--om-* variables plus the shared hex utilities), so no
// per-site CSS imports are needed.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

const STORAGE_KEY = "om-theme";

export type OmTheme = "dark" | "light";

const LIGHT_CSS = `
html[data-om-theme="light"] {
  color-scheme: light;
  background: #eef2f7 !important;
  --om-bg: #eef2f7;
  --om-surface: #ffffff;
  --om-surface-2: #eef4ff;
  --om-inset: #f1f5f9;
  --om-border: #dbe2ea;
  --om-text: #0f172a;
  --om-sub: #475569;
  --bg: #eef2f7;
  --surface: #f1f5f9;
  --panel: #ffffff;
  --panel2: #eef4ff;
  --text: #0f172a;
  --muted: #475569;
  --dim: #94a3b8;
  --line: rgba(15, 23, 42, 0.12);
  --line2: rgba(15, 23, 42, 0.2);
  --background: #eef2f7;
  --foreground: #0f172a;
}
html[data-om-theme="light"] body {
  background: #eef2f7 !important;
  color: #0f172a !important;
}

/* Family surfaces */
html[data-om-theme="light"] :is([class*="bg-[#0b1220]"], [class*="bg-slate-950"], [class*="bg-slate-900"]),
html[data-om-theme="light"] [style*="background: #0b1220"],
html[data-om-theme="light"] [style*="background:#0b1220"] {
  background-color: #eef2f7 !important;
}
html[data-om-theme="light"] [class*="bg-[#141d2e]"],
html[data-om-theme="light"] [style*="background: #141d2e"],
html[data-om-theme="light"] [style*="background:#141d2e"] {
  background-color: #ffffff !important;
}
html[data-om-theme="light"] [class*="bg-[#1c2740]"],
html[data-om-theme="light"] [style*="background: #1c2740"],
html[data-om-theme="light"] [style*="background:#1c2740"] {
  background-color: #eef4ff !important;
}
html[data-om-theme="light"] :is([class*="bg-[#0c1220]"], [class*="bg-[#07090f]"], [class*="bg-black/"], [class*="bg-slate-800"]) {
  background-color: #f1f5f9 !important;
}
html[data-om-theme="light"] [class*="bg-white/"] {
  background-color: #ffffff !important;
}

/* Family borders */
html[data-om-theme="light"] :is([class*="border-[#26324c]"], [class*="border-[#1c2740]"], [class*="border-white/"], [class*="border-slate-"]),
html[data-om-theme="light"] [style*="#26324c"] {
  border-color: #dbe2ea !important;
}

/* Family text */
html[data-om-theme="light"] :is([class*="text-[#e8edf5]"], [class*="text-white"], [class*="text-slate-1"], [class*="text-slate-2"], [class*="text-slate-3"]) {
  color: #0f172a !important;
}
html[data-om-theme="light"] [style*="color: #e8edf5"],
html[data-om-theme="light"] [style*="color:#e8edf5"] {
  color: #0f172a !important;
}
/* Safety net: headings always dark on light. Accent spans inside keep their
   own inline colors, so ".com" and "LLC" stay colorful. */
html[data-om-theme="light"] :is(h1, h2, h3, h4) {
  color: #0f172a !important;
}
html[data-om-theme="light"] main {
  color: #0f172a;
}
html[data-om-theme="light"] :is([class*="text-[#94a3b8]"], [class*="text-slate-4"], [class*="text-slate-5"], [class*="text-slate-6"], [class*="text-slate-7"]),
html[data-om-theme="light"] [style*="color: #94a3b8"],
html[data-om-theme="light"] [style*="color:#94a3b8"] {
  color: #475569 !important;
}
html[data-om-theme="light"] :is([class*="text-emerald-5"], [class*="text-emerald-1"], [class*="text-emerald-2"]) {
  color: #047857 !important;
}

/* Soften heavy dark shadows on light */
html[data-om-theme="light"] :is([class*="shadow-2xl"], [class*="shadow-xl"], [class*="shadow-lg"]) {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
}

/* Family chrome (nav + footer render inline dark styles) */
html[data-om-theme="light"] .om-bar {
  background: #ffffff !important;
  border-bottom-color: #dbe2ea !important;
}
html[data-om-theme="light"] .om-bar a {
  color: #0f172a !important;
}
html[data-om-theme="light"] .om-bar .om-bar-label {
  color: #475569 !important;
}
html[data-om-theme="light"] .om-theme-btn {
  border-color: #cbd5e1 !important;
  color: #475569 !important;
}
html[data-om-theme="light"] .om-footer {
  border-top-color: #dbe2ea !important;
}
html[data-om-theme="light"] .om-footer p,
html[data-om-theme="light"] .om-footer a {
  color: #475569 !important;
}
`;

function applyTheme(theme: OmTheme) {
  document.documentElement.dataset.omTheme = theme;
}

export default function OpenMirrorThemeToggle() {
  const [theme, setTheme] = useState<OmTheme>("dark");

  useEffect(() => {
    const saved: OmTheme =
      window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    applyTheme(saved);
    setTheme(saved);

    const follow = () =>
      setTheme(document.documentElement.dataset.omTheme === "light" ? "light" : "dark");
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  function toggle() {
    const next: OmTheme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("om-theme", { detail: { theme: next } }));
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LIGHT_CSS }} />
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        className="om-theme-btn"
        style={{ background: "none", border: "1px solid #26324c", borderRadius: 50, padding: "4px 10px", fontSize: 13, lineHeight: 1, cursor: "pointer", color: "#94a3b8" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </>
  );
}
