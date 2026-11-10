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
// Navigation model (2026-07-30): a satellite header belongs to the SATELLITE.
// The brand on the left is the current site and goes to the site's own home.
// The ☰ menu holds ONLY the site's own pages. Open Mirror and CrossHeartPray
// are reached through the shared footer (OpenMirrorFooter), never from here.
//
// Each site passes its own rows:
//   <OpenMirrorNav site="iDontCry.com" accent="#38BDF8"
//     links={[{ emoji: "🎮", name: "Game Lab", href: "/games" }, …]} />
//
// A11y contract (unchanged): React-controlled open/close, real aria wiring,
// Escape + outside-click + route-change close, focus into the menu on open and
// back to the trigger on close, body-scroll lock on phones, 44px touch rows.
//
// Width (2026-11-08): the row is 680px wide with 20px sides. A site whose pages
// run wider sets two variables on .om-bar in its own CSS so the brand and the
// menu line up with its content, e.g. DontCloneMeTom's 1024px page:
//   .om-bar { --om-bar-max: 64rem; --om-bar-pad-x: 1rem; }
//   @media (min-width: 40rem) { .om-bar { --om-bar-pad-x: 1.5rem; } }
//
// Groups (2026-11-09): a site with more than a handful of pages passes `groups`
// instead of `links`: a short heading over each set of rows. On a wide screen the
// groups sit side by side; on a phone they stack in one full-width column. A row
// whose href starts with http opens in a new tab and says which site it opens
// (↗ and "Opens example.com"), so a page of this site never looks like another
// app and another app never hides behind a plain row. The row for the page you
// are on, or the section it sits in, is marked. Tabbing out of the menu closes it.
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import OpenMirrorThemeToggle from "./OpenMirrorTheme";

export type OmNavLink = {
  emoji?: string;
  name: string;
  href: string;
  /** a few plain words under the name, e.g. "Scores, next games, playoffs" */
  note?: string;
};
export type OmNavGroup = { label: string; links: OmNavLink[] };

/** "example.com" for an outside link, null for one of this site's pages. */
function outsideHost(href: string): string | null {
  if (!/^https?:\/\//.test(href)) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** The row for the page you are on: the longest of this site's hrefs the path sits under. */
function currentHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (outsideHost(href) || href.includes("#")) continue;
    const hit = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && (!best || href.length > best.length)) best = href;
  }
  return best;
}

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
.om-menu-panel{background:#141d2e;border:1px solid #26324c;right:var(--om-bar-pad-x,16px);width:264px;max-width:calc(100vw - 2rem);max-height:min(70vh,30rem)}
.om-menu-panel[data-grouped]{width:min(46rem,calc(100vw - 2rem));max-height:calc(100vh - 6rem);display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:4px 8px;padding:10px}
.om-menu-group-label{margin:6px 14px 4px;font-size:12.5px;font-weight:800;color:#94a3b8;letter-spacing:.01em}
.om-menu-note{display:block;font-size:12px;font-weight:500;color:#94a3b8;line-height:1.35;margin-top:1px}
.om-menu-link[aria-current="page"]{box-shadow:inset 3px 0 0 var(--om-menu-accent)}
@media (max-width:640px){
  .om-menu-panel,.om-menu-panel[data-grouped]{left:12px;right:12px;width:auto;max-width:none}
  .om-menu-panel[data-grouped]{grid-template-columns:1fr;max-height:calc(100dvh - 5.5rem)}
}
html[data-om-theme="light"] .om-menu-group-label,html[data-om-theme="light"] .om-menu-note{color:#475569}
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
  groups,
}: {
  /** e.g. "iDontCry.com" — the current site; the brand links to its home */
  site?: string;
  /** the site's canonical accent — colors the ".com" in the brand */
  accent?: string;
  /** the site's own pages, in reading order (About last) */
  links?: OmNavLink[];
  /** the same rows under short headings; when given, `links` is ignored */
  groups?: OmNavGroup[];
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

  const sets: OmNavGroup[] = groups?.length ? groups : [{ label: "", links }];
  const rowCount = sets.reduce((n, g) => n + g.links.length, 0);
  const current = currentHref(
    pathname ?? "/",
    sets.flatMap((g) => g.links.map((l) => l.href)),
  );

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
    const host = outsideHost(l.href);
    const note = l.note ?? (host ? `Opens ${host}` : undefined);
    return (
      <a
        key={l.href}
        href={l.href}
        className="om-menu-link"
        aria-current={l.href === current ? "page" : undefined}
        onClick={closeMenu}
        {...(host ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 44,
          boxSizing: "border-box",
          borderRadius: 12,
          padding: note ? "8px 14px" : "10px 14px",
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
        <span style={{ minWidth: 0, flex: 1 }}>
          {l.name}
          {note ? <span className="om-menu-note">{note}</span> : null}
          {host ? <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}> (new tab)</span> : null}
        </span>
        {host ? <span aria-hidden="true" style={{ flexShrink: 0, fontWeight: 800 }}>↗</span> : null}
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
        // Tabbing past the last row (or back past the button) closes the menu.
        onBlur={(e) => {
          if (open && e.relatedTarget && !containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        style={{
          position: "relative",
          maxWidth: "var(--om-bar-max, 680px)",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px var(--om-bar-pad-x, 20px)",
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

          {rowCount > 0 ? (
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
          ) : null}

          {open && rowCount > 0 ? (
            <nav
              id={menuId}
              ref={menuRef}
              aria-label={site ? `${site} menu` : "Menu"}
              className="om-menu-panel"
              data-grouped={groups?.length ? "" : undefined}
              style={{
                // Width, height and the right edge (flush with the Menu
                // button) are in MENU_CSS so a phone can widen the panel.
                ["--om-menu-accent" as string]: accent,
                position: "absolute",
                top: "calc(100% + 8px)",
                zIndex: 60,
                overflowY: "auto",
                overflowX: "hidden",
                // Background and border are in MENU_CSS: inline colours beat
                // the light theme's panel rule, which left dark-on-dark rows.
                borderRadius: 16,
                padding: 8,
                boxShadow: "0 20px 40px rgba(0,0,0,.4)",
              }}
            >
              {groups?.length
                ? groups.map((g, i) => (
                    <div key={g.label} role="group" aria-labelledby={`${menuId}-g${i}`}>
                      <p id={`${menuId}-g${i}`} className="om-menu-group-label">
                        {g.label}
                      </p>
                      {g.links.map(renderRow)}
                    </div>
                  ))
                : links.map(renderRow)}
            </nav>
          ) : null}
        </span>
      </div>
    </header>
  );
}
