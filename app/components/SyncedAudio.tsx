"use client";

// A native <audio> element kept in sync with the shared site-level volume
// preference — applies volume/mute on mount and on every preference change,
// and reports back when the listener adjusts the browser's own native
// audio controls (its volume slider/mute button), so their adjustment is
// saved like any other. The `settingRef` guard exists because setting
// `el.volume`/`el.muted` ourselves also fires the native "volumechange"
// event — without it, our own writes would immediately echo back as if the
// listener had made them.

import { forwardRef, useEffect, useRef } from "react";
import type { AudioHTMLAttributes } from "react";

export type SyncedAudioProps = AudioHTMLAttributes<HTMLAudioElement> & {
  volume: number; // 0–100
  muted: boolean;
  onPreferenceChange: (patch: { volume: number; muted: boolean }) => void;
};

const SyncedAudio = forwardRef<HTMLAudioElement, SyncedAudioProps>(function SyncedAudio(
  { volume, muted, onPreferenceChange, children, ...audioProps },
  forwardedRef,
) {
  const innerRef = useRef<HTMLAudioElement | null>(null);
  const settingRef = useRef(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    settingRef.current = true;
    el.volume = Math.min(1, Math.max(0, volume / 100));
    el.muted = muted;
    // The native "volumechange" event fires synchronously from the two
    // assignments above — release the guard right after so a listener's
    // own next adjustment is picked up normally.
    settingRef.current = false;
  }, [volume, muted]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const handleVolumeChange = () => {
      if (settingRef.current) return;
      onPreferenceChange({ volume: Math.round(el.volume * 100), muted: el.muted });
    };
    el.addEventListener("volumechange", handleVolumeChange);
    return () => el.removeEventListener("volumechange", handleVolumeChange);
  }, [onPreferenceChange]);

  return (
    <audio
      {...audioProps}
      ref={(node) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
    >
      {children}
    </audio>
  );
});

export default SyncedAudio;
