"use client";

import { useEffect, useRef, useState } from "react";

type Item = { label: string; href: string; note?: string; blank?: boolean };

const LINKS: Item[] = [
  { label: "Open Mirror Home", href: "https://openmirrorllc.com" },
  { label: "CrossHeartPray.com", href: "https://crossheartpray.com" },
  { label: "WhatAmIAI.com", href: "https://whatamiai.com" },
  { label: "Reflect", href: "https://openmirrorllc.com/reflect", note: "Quick" },
  { label: "PleaseBeReady.com", href: "https://pleasebeready.com" },
  { label: "TheDJCares.com", href: "https://thedjcares.com" },
  { label: "DontCloneMeTom.com", href: "https://dontclonemetom.com" },
  { label: "iDontCry.com", href: "https://idontcry.com" },
  { label: "StepInTheRing.com", href: "https://stepinthering.com" },
  { label: "WatchedNotWatched.com", href: "https://watchednotwatched.com" },
  { label: "Fambookagram.com", href: "https://fambookagram.com" },
  { label: "Friendbookagram.com", href: "https://friendbookagram.com" },
  { label: "About Open Mirror", href: "https://openmirrorllc.com/about-open-mirror" },
  { label: "Bible Reading Plan PDF", href: "https://openmirrorllc.com/resources/52-week-bible-reading-plan.pdf", note: "PDF", blank: true },
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
    <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #1E1E1E", background: "rgba(12,12,12,0.95)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
        <a href="https://openmirrorllc.com" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#F5F0E8", textDecoration: "none" }}>
          <span aria-hidden>🪞</span><span>Open Mirror</span>
        </a>

        <div ref={ref} style={{ position: "relative" }}>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 36, width: 36, borderRadius: 50, border: "1px solid #262626", background: "#151515", color: "#F5F0E8", fontSize: 18, lineHeight: 1, cursor: "pointer" }}
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>

          {open && (
            <nav style={{ position: "absolute", right: 0, marginTop: 12, width: 256, maxHeight: "80vh", overflowY: "auto", borderRadius: 16, border: "1px solid #262626", background: "#151515", padding: 8, boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  {...(l.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#F5F0E8", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span>{l.label}</span>
                  {l.note && <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7A736B" }}>{l.note}</span>}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
