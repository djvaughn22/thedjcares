"use client";

import { useEffect, useRef, useState } from "react";

type Item = { label: string; href: string; note?: string; blank?: boolean };

// Order: hub → faith apps → live sites → coming-soon → resources → still-being-
// -figured-out (WatchedNotWatched / WhatAmIAI / Reflect) → PleaseBeReady last.
const LINKS: Item[] = [
  { label: "Open Mirror Home", href: "https://openmirrorllc.com" },
  { label: "About Open Mirror", href: "https://openmirrorllc.com/about-open-mirror" },
];

export default function OpenMirrorNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #26324c", background: "#0b1220" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
        <a href="https://openmirrorllc.com" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#e8edf5", textDecoration: "none" }}>
          <span>Open Mirror LLC</span>
        </a>

        <div ref={ref} style={{ position: "relative" }}>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 36, width: 36, borderRadius: 50, border: "1px solid #26324c", background: "#141d2e", color: "#e8edf5", fontSize: 18, lineHeight: 1, cursor: "pointer" }}
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>

          {open && (
            <nav style={{ position: "absolute", right: 0, marginTop: 12, width: 256, maxHeight: "80vh", overflowY: "auto", borderRadius: 16, border: "1px solid #26324c", background: "#141d2e", padding: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  {...(l.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#e8edf5", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1c2740")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{l.label}</span>
                  {l.note && <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>{l.note}</span>}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
