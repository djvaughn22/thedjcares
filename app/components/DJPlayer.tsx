"use client";

// The Now Spinning player — official YouTube IFrame Player API, one instance.
// Handles play/pause, reports ended (so the deck can spin the next record),
// and reports unavailable/blocked videos so the deck can offer the official
// link instead. If the API script itself can't load, it falls back to a plain
// privacy-friendly embed so playback still works.

import { useEffect, useRef, useState } from "react";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const timer = window.setTimeout(() => reject(new Error("yt-api-timeout")), 8000);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("yt-api-blocked"));
    };
    document.head.appendChild(s);
  }).catch((err) => {
    apiPromise = null; // allow a retry on the next mount
    throw err;
  });
  return apiPromise;
}

export type DJPlayerProps = {
  videoId: string;
  title: string;
  playing: boolean; // desired state from the deck's Play/Pause button
  onPlaybackChange: (state: "playing" | "paused" | "ended") => void;
  onUnavailable: () => void; // embedding blocked / video gone
};

export default function DJPlayer({
  videoId,
  title,
  playing,
  onPlaybackChange,
  onUnavailable,
}: DJPlayerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const [apiFailed, setApiFailed] = useState(false);
  // Latest callbacks without re-creating the player.
  const cbRef = useRef({ onPlaybackChange, onUnavailable, videoId });
  cbRef.current = { onPlaybackChange, onUnavailable, videoId };

  useEffect(() => {
    let cancelled = false;
    const mount = boxRef.current;
    if (!mount) return;
    const el = document.createElement("div");
    mount.appendChild(el);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(el, {
          videoId: cbRef.current.videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, cc_load_policy: 1, cc_lang_pref: "en" },
          events: {
            onReady: () => {
              readyRef.current = true;
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) cbRef.current.onPlaybackChange("ended");
              else if (e.data === YT.PlayerState.PLAYING) cbRef.current.onPlaybackChange("playing");
              else if (e.data === YT.PlayerState.PAUSED) cbRef.current.onPlaybackChange("paused");
            },
            onError: () => cbRef.current.onUnavailable(),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // Already gone.
      }
      playerRef.current = null;
      el.remove();
    };
    // The player is created once; videoId changes go through loadVideoById below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the deck: new record → load it; play/pause toggles.
  const lastLoadedRef = useRef(videoId);
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      if (videoId !== lastLoadedRef.current) {
        lastLoadedRef.current = videoId;
        p.loadVideoById(videoId);
      } else if (playing) {
        p.playVideo();
      } else {
        p.pauseVideo();
      }
    } catch {
      // Player mid-teardown — the next render settles it.
    }
  }, [videoId, playing]);

  if (apiFailed) {
    // Plain official embed — controls live inside the iframe.
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=en`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  return (
    <div
      ref={boxRef}
      className="djc-player"
      aria-label={`Video player: ${title}`}
      style={{ position: "absolute", inset: 0 }}
      // The IFrame API replaces the inner div with the iframe.
    />
  );
}
