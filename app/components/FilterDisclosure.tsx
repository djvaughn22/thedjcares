"use client";

// One reusable filter control for every browse tab (Sermons ministry
// filter, Videos vibe filter, …) instead of each tab exposing its own wall
// of pill buttons. Collapsed by default; the trigger always shows the
// current selection so a closed filter never hides an active one.

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type FilterDisclosurePalette = {
  text: string;
  sub: string;
  border: string;
  activeBorder: string;
  accent: string;
};

export default function FilterDisclosure({
  label = "Filter",
  summary,
  palette,
  children,
  defaultOpen = false,
}: {
  label?: string;
  /** Current selection, shown next to the label — e.g. "All ministries" or "Encouraging". */
  summary: string;
  palette: FilterDisclosurePalette;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { text, sub, border, activeBorder, accent } = palette;
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const trigger: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    minHeight: 44,
    background: "none",
    border: `2px solid ${open ? activeBorder : border}`,
    borderRadius: 14,
    padding: "10px 16px",
    color: text,
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={trigger}
      >
        <span>
          <span aria-hidden>🔽</span> {label}: <span style={{ color: accent }}>{summary}</span>
        </span>
        <span aria-hidden style={{ color: sub }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div id={panelId} role="region" aria-label={label} style={{ marginTop: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}
