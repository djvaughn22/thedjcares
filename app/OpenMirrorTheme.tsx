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
html[data-om-theme="light"] :is([class*="bg-[#0c1220]"], [class*="bg-[#07090f]"], [class*="bg-[#0e1626]"], [class*="bg-black"], [class*="bg-slate-800"], [class*="bg-zinc-8"], [class*="bg-zinc-9"], [class*="bg-gray-8"], [class*="bg-gray-9"], [class*="bg-neutral-8"], [class*="bg-neutral-9"]) {
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
html[data-om-theme="light"] :is([class*="text-[#e8edf5]"], [class*="text-white"], [class*="text-slate-1"], [class*="text-slate-2"], [class*="text-slate-3"], [class*="text-zinc-1"], [class*="text-zinc-2"], [class*="text-zinc-3"], [class*="text-gray-1"], [class*="text-gray-2"], [class*="text-gray-3"], [class*="text-neutral-1"], [class*="text-neutral-2"], [class*="text-neutral-3"]) {
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

/* Bright accent text is unreadable on light backgrounds - darken per accent. */
html[data-om-theme="light"] :is([class*="text-[#38bdf8]" i], [style*="color:#38bdf8" i], [style*="color: #38bdf8" i]) {
  color: #0369a1 !important;
}
html[data-om-theme="light"] :is([class*="text-[#22d3ee]" i], [style*="color:#22d3ee" i], [style*="color: #22d3ee" i]) {
  color: #0e7490 !important;
}
html[data-om-theme="light"] :is([class*="text-[#60a5fa]" i], [style*="color:#60a5fa" i], [style*="color: #60a5fa" i]) {
  color: #1d4ed8 !important;
}
html[data-om-theme="light"] :is([class*="text-[#93c5fd]" i], [style*="color:#93c5fd" i], [style*="color: #93c5fd" i]) {
  color: #1d4ed8 !important;
}
html[data-om-theme="light"] :is([class*="text-[#e879f9]" i], [style*="color:#e879f9" i], [style*="color: #e879f9" i]) {
  color: #a21caf !important;
}
html[data-om-theme="light"] :is([class*="text-[#f97316]" i], [style*="color:#f97316" i], [style*="color: #f97316" i]) {
  color: #c2410c !important;
}

html[data-om-theme="light"] :is([class*="text-[#7dd3fc]" i], [style*="color:#7dd3fc" i], [style*="color: #7dd3fc" i]) {
  color: #0369a1 !important;
}
html[data-om-theme="light"] :is([class*="text-[#c4b5fd]" i], [style*="color:#c4b5fd" i], [style*="color: #c4b5fd" i]) {
  color: #6d28d9 !important;
}
html[data-om-theme="light"] :is([class*="text-[#c084fc]" i], [style*="color:#c084fc" i], [style*="color: #c084fc" i]) {
  color: #7e22ce !important;
}
html[data-om-theme="light"] :is([class*="text-[#a78bfa]" i], [style*="color:#a78bfa" i], [style*="color: #a78bfa" i]) {
  color: #6d28d9 !important;
}
html[data-om-theme="light"] :is([class*="text-[#818cf8]" i], [style*="color:#818cf8" i], [style*="color: #818cf8" i]) {
  color: #4338ca !important;
}
html[data-om-theme="light"] :is([class*="text-[#34d399]" i], [style*="color:#34d399" i], [style*="color: #34d399" i]) {
  color: #047857 !important;
}
html[data-om-theme="light"] :is([class*="text-[#2dd4bf]" i], [style*="color:#2dd4bf" i], [style*="color: #2dd4bf" i]) {
  color: #0f766e !important;
}

/* Client re-renders serialize inline colors as rgb() - match that form too. */
html[data-om-theme="light"] [style*="color: rgb(232, 237, 245)"] {
  color: #0f172a !important;
}
html[data-om-theme="light"] [style*="color: rgb(148, 163, 184)"] {
  color: #475569 !important;
}
html[data-om-theme="light"] [style*="color: rgb(56, 189, 248)"] {
  color: #0369a1 !important;
}
html[data-om-theme="light"] [style*="color: rgb(34, 211, 238)"] {
  color: #0e7490 !important;
}
html[data-om-theme="light"] [style*="color: rgb(96, 165, 250)"] {
  color: #1d4ed8 !important;
}
html[data-om-theme="light"] [style*="color: rgb(147, 197, 253)"] {
  color: #1d4ed8 !important;
}
html[data-om-theme="light"] [style*="color: rgb(232, 121, 249)"] {
  color: #a21caf !important;
}
html[data-om-theme="light"] [style*="color: rgb(249, 115, 22)"] {
  color: #c2410c !important;
}
html[data-om-theme="light"] [style*="color: rgb(125, 211, 252)"] {
  color: #0369a1 !important;
}
html[data-om-theme="light"] [style*="color: rgb(196, 181, 253)"] {
  color: #6d28d9 !important;
}
html[data-om-theme="light"] [style*="color: rgb(192, 132, 252)"] {
  color: #7e22ce !important;
}
html[data-om-theme="light"] [style*="color: rgb(167, 139, 250)"] {
  color: #6d28d9 !important;
}
html[data-om-theme="light"] [style*="color: rgb(129, 140, 248)"] {
  color: #4338ca !important;
}
html[data-om-theme="light"] [style*="color: rgb(52, 211, 153)"] {
  color: #047857 !important;
}
html[data-om-theme="light"] [style*="color: rgb(45, 212, 191)"] {
  color: #0f766e !important;
}

/* Light Tailwind hue classes (100-500) are unreadable on light - darken per hue. */
html[data-om-theme="light"] :is([class*="text-sky-1"], [class*="text-sky-2"], [class*="text-sky-3"], [class*="text-sky-4"], [class*="text-sky-5"]) {
  color: #0369a1 !important;
}
html[data-om-theme="light"] :is([class*="text-blue-1"], [class*="text-blue-2"], [class*="text-blue-3"], [class*="text-blue-4"], [class*="text-blue-5"]) {
  color: #1d4ed8 !important;
}
html[data-om-theme="light"] :is([class*="text-cyan-1"], [class*="text-cyan-2"], [class*="text-cyan-3"], [class*="text-cyan-4"], [class*="text-cyan-5"]) {
  color: #0e7490 !important;
}
html[data-om-theme="light"] :is([class*="text-teal-1"], [class*="text-teal-2"], [class*="text-teal-3"], [class*="text-teal-4"], [class*="text-teal-5"]) {
  color: #0f766e !important;
}
html[data-om-theme="light"] :is([class*="text-indigo-1"], [class*="text-indigo-2"], [class*="text-indigo-3"], [class*="text-indigo-4"], [class*="text-indigo-5"]) {
  color: #4338ca !important;
}
html[data-om-theme="light"] :is([class*="text-violet-1"], [class*="text-violet-2"], [class*="text-violet-3"], [class*="text-violet-4"], [class*="text-violet-5"]) {
  color: #6d28d9 !important;
}
html[data-om-theme="light"] :is([class*="text-purple-1"], [class*="text-purple-2"], [class*="text-purple-3"], [class*="text-purple-4"], [class*="text-purple-5"]) {
  color: #7e22ce !important;
}
html[data-om-theme="light"] :is([class*="text-fuchsia-1"], [class*="text-fuchsia-2"], [class*="text-fuchsia-3"], [class*="text-fuchsia-4"], [class*="text-fuchsia-5"]) {
  color: #a21caf !important;
}
html[data-om-theme="light"] :is([class*="text-green-1"], [class*="text-green-2"], [class*="text-green-3"], [class*="text-green-4"], [class*="text-green-5"]) {
  color: #15803d !important;
}
html[data-om-theme="light"] :is([class*="text-lime-1"], [class*="text-lime-2"], [class*="text-lime-3"], [class*="text-lime-4"], [class*="text-lime-5"]) {
  color: #4d7c0f !important;
}
html[data-om-theme="light"] :is([class*="text-amber-1"], [class*="text-amber-2"], [class*="text-amber-3"], [class*="text-amber-4"], [class*="text-amber-5"]) {
  color: #b45309 !important;
}
html[data-om-theme="light"] :is([class*="text-yellow-1"], [class*="text-yellow-2"], [class*="text-yellow-3"], [class*="text-yellow-4"], [class*="text-yellow-5"]) {
  color: #a16207 !important;
}
html[data-om-theme="light"] :is([class*="text-orange-1"], [class*="text-orange-2"], [class*="text-orange-3"], [class*="text-orange-4"], [class*="text-orange-5"]) {
  color: #c2410c !important;
}
html[data-om-theme="light"] :is([class*="text-pink-1"], [class*="text-pink-2"], [class*="text-pink-3"], [class*="text-pink-4"], [class*="text-pink-5"]) {
  color: #be185d !important;
}
html[data-om-theme="light"] :is([class*="text-rose-1"], [class*="text-rose-2"], [class*="text-rose-3"], [class*="text-rose-4"], [class*="text-rose-5"]) {
  color: #be123c !important;
}
html[data-om-theme="light"] :is([class*="text-red-1"], [class*="text-red-2"], [class*="text-red-3"], [class*="text-red-4"], [class*="text-red-5"]) {
  color: #b91c1c !important;
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
  // Keep the CrossHeartPray-style theme (data-chp-visual-theme CSS on the hub
  // and CHP) in agreement so pages that mix both systems light up together.
  document.documentElement.dataset.chpVisualTheme = theme;
  window.localStorage.setItem("crossheartpray-visual-theme", theme);
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
        style={{ background: "none", border: "1px solid #26324c", borderRadius: 50, padding: "8px 13px", fontSize: 15, lineHeight: 1, cursor: "pointer", color: "#94a3b8", minHeight: 40, touchAction: "manipulation" }}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </>
  );
}
