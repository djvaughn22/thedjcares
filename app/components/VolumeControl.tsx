"use client";

// The site-level volume control — one Mute/Unmute button plus a labeled
// slider and a visible percentage, shared by every first-party controllable
// player (Music Video, Daily Encouragement, and any podcast/sermon playing
// through the shared deck). Purely a view: all the volume/mute *decisions*
// (what zero means, what Unmute restores) live in the pure helpers in
// app/lib/moodQueue.ts (volumeFromSlider/volumeFromMuteToggle) so they stay
// testable without rendering React.

import type { CSSProperties } from "react";

export type VolumeControlPalette = {
  text: string;
  sub: string;
  border: string;
  accent: string;
};

export type VolumeControlProps = {
  volume: number; // 0–100
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  // Unique per rendered instance so the slider's <label htmlFor> never
  // collides if more than one volume control is ever mounted at once.
  idPrefix: string;
  palette: VolumeControlPalette;
};

export default function VolumeControl({ volume, muted, onVolumeChange, onMuteToggle, idPrefix, palette }: VolumeControlProps) {
  const { text, sub, border, accent } = palette;
  const effectiveVolume = muted ? 0 : volume;
  const sliderId = `${idPrefix}-slider`;
  const icon = muted || effectiveVolume === 0 ? "🔇" : effectiveVolume < 50 ? "🔉" : "🔊";

  const muteButton: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 44,
    minHeight: 44,
    padding: "10px 16px",
    background: "none",
    border: `2px solid ${border}`,
    borderRadius: 50,
    color: text,
    fontSize: 14.5,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      role="group"
      aria-label="Volume"
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}
    >
      <button type="button" onClick={onMuteToggle} aria-label={muted ? "Unmute" : "Mute"} style={muteButton}>
        <span aria-hidden>{icon}</span>
        {muted ? "Unmute" : "Mute"}
      </button>
      <label htmlFor={sliderId} style={{ fontSize: 12.5, fontWeight: 800, color: sub }}>
        Volume
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        step={1}
        value={effectiveVolume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={effectiveVolume}
        aria-valuetext={`${effectiveVolume}%`}
        style={{ flex: "1 1 120px", minWidth: 120, minHeight: 44, accentColor: accent, cursor: "pointer" }}
      />
      <span aria-hidden style={{ fontSize: 12.5, fontWeight: 800, color: sub, minWidth: 38, textAlign: "right" }}>
        {effectiveVolume}%
      </span>
    </div>
  );
}
