"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — Open Mirror satellite header (Stage A of the reusable-
// component plan, docs/openmirror-audit/04-reusable-component-plan.md).
//
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorNav.tsx
// Then run: scripts/sync-ui.sh (copies this file into every satellite repo,
// overwriting the copies there — never edit the copies in site repos).
// NOTE: CrossHeartPray is a sync target on disk but renders its own
// ChpProductNav; do not overwrite CHP. Sync every satellite EXCEPT CHP.
//
// ☰ family menu on every satellite: anyone can get anywhere without going back
// to the hub first. This is the shared, polished menu system — same compact
// rhythm, positioning, and behaviour as the CrossHeartPray header (the family
// reference): React-controlled open/close, real aria wiring, Escape + outside-
// click + route-change close, focus moved into the menu on open and returned to
// the trigger on close, and a body-scroll lock on phones. Layout is expressed
// with inline styles + one scoped <style> block so it renders identically in
// every satellite regardless of that repo's Tailwind content config.
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import OpenMirrorThemeToggle from "./OpenMirrorTheme";

// Same order as the hub homepage (src/lib/products.ts registry order),
// with About next-to-last and PleaseBeReady pinned to the very bottom.
const FAMILY = [
  { emoji: "🪞", name: "Open Mirror Home", href: "https://openmirrorllc.com" },
  { emoji: "✝️", name: "CrossHeartPray", href: "https://crossheartpray.com" },
  { emoji: "🎵", name: "TheDJCares", href: "https://thedjcares.com" },
  { emoji: "🐶", name: "DontCloneMeTom", href: "https://dontclonemetom.com" },
  { emoji: "😂", name: "iDontCry", href: "https://idontcry.com" },
  { emoji: "🥊", name: "StepInTheRing", href: "https://stepinthering.com" },
  { emoji: "🧩", name: "OpenDoku", href: "https://opendoku.com" },
  { emoji: "🎬", name: "WatchedNotWatched", href: "https://watchednotwatched.com" },
  { emoji: "🤖", name: "WhatAmIAI", href: "https://whatamiai.com" },
  { emoji: "ℹ️", name: "About Open Mirror", href: "https://openmirrorllc.com/about-open-mirror" },
  { emoji: "🧰", name: "PleaseBeReady", href: "https://pleasebeready.com" },
];

// Scoped chrome the inline styles can't express: hover, focus rings, the mobile
// label hide, the light-theme panel, and reduced-motion. Keyed to .om-menu-*
// class names so it never leaks onto the rest of the page.
const MENU_CSS = `
.om-menu-btn{transition:background-color .15s ease,border-color .15s ease}
.om-menu-btn:hover{background:#1c2740}
.om-menu-btn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(148,163,184,.6)}
.om-menu-link{transition:background-color .12s ease}
.om-menu-link:hover{background:#1c2740}
.om-menu-link:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(148,163,184,.6)}
.om-menu-link[aria-current="page"]{background:#1f2a44}
@media (max-width:640px){.om-bar-label{display:none}.om-menu-btn-label{display:none}}
html[data-om-theme="light"] .om-menu-panel{background:#ffffff;border-color:#dbe2ea}
html[data-om-theme="light"] .om-menu-link:hover{background:#eef2f7}
html[data-om-theme="light"] .om-menu-link[aria-current="page"]{background:#eef2f7}
html[data-om-theme="light"] .om-menu-btn{background:#ffffff;border-color:#cbd5e1;color:#0f172a}
html[data-om-theme="light"] .om-menu-btn:hover{background:#f1f5f9}
@media (prefers-reduced-motion:reduce){.om-menu-btn,.om-menu-link{transition:none}}
`.trim();

export default function OpenMirrorNav({ site }: { site?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuId = useId();

  // Highlight the current site's row (the label already names it up top; this
  // gives the open menu a clear "you are here"). Compare on name, ignoring
  // the ".com" the satellites pass in.
  const currentName = site ? site.replace(/\.com$/i, "").toLowerCase() : "";

  const closeMenu = () => setOpen(false);

  // Escape closes (focus returns to the trigger); any pointer down outside the
  // header closes too.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  // Close if the route changes underneath an open menu (back/forward safety).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // On phones, lock the page behind the open menu so it can't drift.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the menu when it opens so keyboard users land on item one.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [open]);

  return (
    <header
      className="om-bar"
      style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #26324c", background: "#0b1220" }}
    >
      <style>{MENU_CSS}</style>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          maxWidth: 680,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 20px",
        }}
      >
        <a
          href="https://openmirrorllc.com"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "-0.01em",
            color: "#e8edf5",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span>Open Mirror LLC</span>
        </a>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          {site ? (
            <span
              className="om-bar-label"
              style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}
            >
              {site}
            </span>
          ) : null}
          <OpenMirrorThemeToggle />

          <button
            ref={buttonRef}
            type="button"
            className="om-menu-btn"
            aria-label="Open Mirror family menu"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 50,
              border: "1px solid #26324c",
              background: "#141d2e",
              color: "#e8edf5",
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 900,
              minHeight: 40,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
              {open ? "✕" : "☰"}
            </span>
            <span className="om-menu-btn-label">Menu</span>
          </button>

          {open ? (
            <nav
              id={menuId}
              ref={menuRef}
              aria-label="Open Mirror family"
              className="om-menu-panel"
              style={{
                position: "absolute",
                right: 16,
                top: "calc(100% + 8px)",
                zIndex: 60,
                width: 256,
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "min(70vh, 30rem)",
                overflowY: "auto",
                overflowX: "hidden",
                background: "#141d2e",
                border: "1px solid #26324c",
                borderRadius: 16,
                padding: 8,
                boxShadow: "0 20px 40px rgba(0,0,0,.4)",
              }}
            >
              {FAMILY.map((f) => {
                const active = currentName !== "" && f.name.toLowerCase() === currentName;
                return (
                  <a
                    key={f.href}
                    href={f.href}
                    className="om-menu-link"
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenu}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minHeight: 44,
                      boxSizing: "border-box",
                      borderRadius: 12,
                      padding: "10px 14px",
                      color: "#e8edf5",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                      touchAction: "manipulation",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 20, flexShrink: 0, textAlign: "center", lineHeight: 1 }}
                    >
                      {f.emoji}
                    </span>
                    <span style={{ minWidth: 0 }}>{f.name}</span>
                  </a>
                );
              })}
            </nav>
          ) : null}
        </span>
      </div>
    </header>
  );
}
