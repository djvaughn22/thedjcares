"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — Open Mirror satellite header.
//
// Edit ONLY here: hub repo → packages/openmirror-ui/OpenMirrorNav.tsx
// Then run: scripts/sync-ui.sh (copies this file into every satellite repo,
// overwriting the copies there — never edit the copies in site repos).
// NOTE: CrossHeartPray renders its own ChpProductNav; sync-ui.sh already
// syncs theme-only there.
//
// Navigation model (2026-07-19): a satellite header belongs to the SATELLITE.
// The brand on the left is the current site and goes to the site's own home.
// The ☰ menu holds the site's own pages first, then exactly two family rows:
// "All Open Mirror projects" (the hub is the directory) and a quiet
// CrossHeartPray connection. No satellite repeats the whole product family.
//
// Each site passes its own rows:
//   <OpenMirrorNav site="iDontCry.com" accent="#38BDF8"
//     links={[{ emoji: "🎮", name: "Game Lab", href: "/games" }, …]} />
//
// A11y contract (unchanged): React-controlled open/close, real aria wiring,
// Escape + outside-click + route-change close, focus into the menu on open and
// back to the trigger on close, body-scroll lock on phones, 44px touch rows.
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import OpenMirrorThemeToggle from "./OpenMirrorTheme";

export type OmNavLink = { emoji?: string; name: string; href: string };

const FAMILY_TAIL: OmNavLink[] = [
  { emoji: "🪞", name: "All Open Mirror projects", href: "https://openmirrorllc.com" },
  { emoji: "✝️", name: "CrossHeartPray", href: "https://crossheartpray.com" },
];

// Scoped chrome the inline styles can't express: hover, focus rings, the
// light-theme panel, and reduced-motion. Keyed to .om-menu-* class names so it
// never leaks onto the rest of the page.
const MENU_CSS = `
.om-menu-btn{transition:background-color .15s ease,border-color .15s ease}
.om-menu-btn:hover{background:#1c2740}
.om-menu-btn:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(148,163,184,.6)}
.om-menu-link{transition:background-color .12s ease}
.om-menu-link:hover{background:#1c2740}
.om-menu-link:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(148,163,184,.6)}
.om-menu-link[aria-current="page"]{background:#1f2a44}
.om-brand:focus-visible{outline:none;box-shadow:0 0 0 2px rgba(148,163,184,.6);border-radius:8px}
@media (max-width:640px){.om-menu-btn-label{display:none}}
html[data-om-theme="light"] .om-menu-panel{background:#ffffff;border-color:#dbe2ea}
html[data-om-theme="light"] .om-menu-link:hover{background:#eef2f7}
html[data-om-theme="light"] .om-menu-link[aria-current="page"]{background:#eef2f7}
html[data-om-theme="light"] .om-menu-btn{background:#ffffff;border-color:#cbd5e1;color:#0f172a}
html[data-om-theme="light"] .om-menu-btn:hover{background:#f1f5f9}
@media (prefers-reduced-motion:reduce){.om-menu-btn,.om-menu-link{transition:none}}
`.trim();

export default function OpenMirrorNav({
  site,
  accent = "#94a3b8",
  links = [],
}: {
  /** e.g. "iDontCry.com" — the current site; the brand links to its home */
  site?: string;
  /** the site's canonical accent — colors the ".com" in the brand */
  accent?: string;
  /** the site's own pages, in reading order (About last) */
  links?: OmNavLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuId = useId();

  const hasCom = Boolean(site && site.endsWith(".com"));
  const baseName = hasCom ? site!.slice(0, -4) : site;

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

  const renderRow = (l: OmNavLink) => {
    const active = !l.href.startsWith("http") && pathname === l.href;
    return (
      <a
        key={l.href}
        href={l.href}
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
        <span aria-hidden="true" style={{ width: 20, flexShrink: 0, textAlign: "center", lineHeight: 1 }}>
          {l.emoji ?? "·"}
        </span>
        <span style={{ minWidth: 0 }}>{l.name}</span>
      </a>
    );
  };

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
        {/* The brand is the CURRENT site and goes to its own home. */}
        <a
          href={site ? "/" : "https://openmirrorllc.com"}
          className="om-brand"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "-0.01em",
            color: "#e8edf5",
            textDecoration: "none",
            whiteSpace: "nowrap",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {site ? (
            <>
              <span>{baseName}</span>
              {hasCom ? <span style={{ color: accent }}>.com</span> : null}
            </>
          ) : (
            <span>Open Mirror LLC</span>
          )}
        </a>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <OpenMirrorThemeToggle />

          <button
            ref={buttonRef}
            type="button"
            className="om-menu-btn"
            aria-label={site ? `${site} menu` : "Menu"}
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
              minHeight: 44,
              minWidth: 44,
              justifyContent: "center",
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
              aria-label={site ? `${site} menu` : "Menu"}
              className="om-menu-panel"
              style={{
                position: "absolute",
                right: 16,
                top: "calc(100% + 8px)",
                zIndex: 60,
                width: 264,
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
              {links.map(renderRow)}
              {links.length > 0 ? (
                <div aria-hidden="true" style={{ margin: "8px 6px", borderTop: "1px solid #26324c" }} />
              ) : null}
              {FAMILY_TAIL.map(renderRow)}
            </nav>
          ) : null}
        </span>
      </div>
    </header>
  );
}
