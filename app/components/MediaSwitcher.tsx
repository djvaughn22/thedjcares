"use client";

// The ONE shared control for moving between the four things a listener
// actually browses and presses play on. Same component, same position, same
// styling everywhere it appears (Home and each of the four media tabs) — so
// switching categories reads as one player app with four modes, not four
// separate page sections that happen to share a nav bar.
//
// Real ARIA tabs (WAI-ARIA APG "Tabs" pattern, manual activation): arrow
// keys move focus among the four tabs without changing the category, Enter/
// Space (native <button> behavior) or a click activates the focused one.
// Home/Ministries/Churches are deliberately NOT tabs here — they're a
// return destination and two off-site discovery sections, not playback
// modes, and the owner asked that they never compete with these four.

import { useRef } from "react";
import type { CSSProperties } from "react";

export type MediaTab = "music" | "videos" | "podcasts" | "sermons";

export const MEDIA_MODES: { id: MediaTab; label: string; emoji: string }[] = [
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "podcasts", label: "Podcasts", emoji: "🎙️" },
  { id: "sermons", label: "Sermons", emoji: "✝️" },
];

export type MediaSwitcherPalette = {
  text: string;
  sub: string;
  card: string;
  border: string;
  accent: string;
  ink: string;
};

/** id used by the switcher's tab buttons and every panel's aria-labelledby. */
export const mediaTabId = (id: MediaTab) => `${id}-tab`;
/** id used by each category's own heading panel and the tab's aria-controls. */
export const mediaPanelId = (id: MediaTab) => `${id}-panel`;

export default function MediaSwitcher({
  active,
  onSelect,
  palette,
}: {
  /** Which of the four modes is current, or null when browsing Home/a secondary section. */
  active: MediaTab | null;
  onSelect: (id: MediaTab) => void;
  palette: MediaSwitcherPalette;
}) {
  const { text, sub, card, border, accent, ink } = palette;
  const tablistRef = useRef<HTMLDivElement>(null);

  // Roving tabindex: only the selected tab (or the first, when none is
  // selected — e.g. on Home) is in the Tab order; arrow keys move focus
  // among the rest without activating them.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const buttons = Array.from(tablistRef.current?.querySelectorAll<HTMLButtonElement>("[role=\"tab\"]") ?? []);
    const currentIndex = buttons.findIndex((b) => b === document.activeElement);
    if (currentIndex === -1) return;
    e.preventDefault();
    let nextIndex = currentIndex;
    if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = buttons.length - 1;
    buttons[nextIndex]?.focus();
  };

  const label: CSSProperties = {
    fontSize: 11.5,
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: sub,
    margin: "0 0 8px",
    textAlign: "center",
  };

  return (
    <div>
      <p style={label}>
        <span aria-hidden>🎧</span> Choose what to play
      </p>
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Browse media"
        onKeyDown={onKeyDown}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}
      >
        {MEDIA_MODES.map((m) => {
          const selected = active === m.id;
          const isRovingStop = active === null ? m.id === MEDIA_MODES[0].id : selected;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={mediaTabId(m.id)}
              aria-selected={selected}
              aria-controls={mediaPanelId(m.id)}
              tabIndex={isRovingStop ? 0 : -1}
              onClick={() => onSelect(m.id)}
              style={{
                background: selected ? accent : card,
                border: `2px solid ${selected ? accent : border}`,
                borderRadius: 14,
                padding: "12px 4px",
                minHeight: 44,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                color: selected ? ink : sub,
                textAlign: "center",
              }}
            >
              <span aria-hidden>{m.emoji}</span> {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
