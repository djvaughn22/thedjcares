"use client";

// The Now Spinning player — official YouTube IFrame Player API, one instance.
// Drives the site-level control bar: play/pause, real volume + mute, live
// progress, and seeking, and reports ended (queue advance), unavailable
// (failed-item skip), and blocked-autoplay (tap-to-resume recovery) states.
// If the API script itself can't load, it falls back to a plain
// privacy-friendly embed so playback still works (controls live inside it).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

type YTPlayer = {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  mute: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
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
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
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

export type DJPlayerHandle = {
  /** Jump to a fraction (0–1) of the current video. */
  seekToFraction: (fraction: number) => void;
  /** Restart the current video from the top (repeat-one). */
  restart: () => void;
};

export type DJPlayerProps = {
  videoId: string;
  title: string;
  playing: boolean; // desired state from the deck's Play/Pause button
  volume: number; // 0–100, site-level control
  muted: boolean;
  onPlaybackChange: (state: "playing" | "paused" | "ended") => void;
  onProgress?: (currentSeconds: number, durationSeconds: number) => void;
  onAutoplayBlocked?: () => void; // asked to play, browser said no
  onUnavailable: () => void; // embedding blocked / video gone
};

const DJPlayer = forwardRef<DJPlayerHandle, DJPlayerProps>(function DJPlayer(
  { videoId, title, playing, volume, muted, onPlaybackChange, onProgress, onAutoplayBlocked, onUnavailable },
  ref,
) {
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [ready, setReady] = useState(false);
  // Latest callbacks/values without re-creating the player.
  const cbRef = useRef({ onPlaybackChange, onProgress, onAutoplayBlocked, onUnavailable, videoId, volume, muted });
  cbRef.current = { onPlaybackChange, onProgress, onAutoplayBlocked, onUnavailable, videoId, volume, muted };
  const blockedTimerRef = useRef<number | null>(null);

  const clearBlockedWatchdog = () => {
    if (blockedTimerRef.current !== null) {
      window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = null;
    }
  };

  // If we asked for playback and nothing starts within 2.5s, the browser
  // almost certainly blocked autoplay — surface a tap-to-play recovery
  // instead of a silent black box.
  const armBlockedWatchdog = () => {
    clearBlockedWatchdog();
    blockedTimerRef.current = window.setTimeout(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        const state = p.getPlayerState();
        const YT = window.YT;
        if (YT && state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING && state !== YT.PlayerState.ENDED) {
          cbRef.current.onAutoplayBlocked?.();
        }
      } catch {
        // Player mid-teardown.
      }
    }, 2500);
  };

  useImperativeHandle(ref, () => ({
    seekToFraction: (fraction: number) => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        const dur = p.getDuration();
        if (dur > 0) p.seekTo(Math.min(Math.max(0, fraction), 1) * dur, true);
      } catch {
        // Ignore — next poll re-syncs.
      }
    },
    restart: () => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        p.seekTo(0, true);
        p.playVideo();
      } catch {
        // Ignore.
      }
    },
  }));

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
              setReady(true);
              try {
                playerRef.current?.setVolume(cbRef.current.volume);
                if (cbRef.current.muted) playerRef.current?.mute();
                else playerRef.current?.unMute();
              } catch {
                // Volume re-syncs on the next prop change.
              }
              armBlockedWatchdog();
            },
            onStateChange: (e) => {
              const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
              if (e.data === YT.PlayerState.ENDED) {
                DEV && console.log('[DJPlayer] YouTube state ENDED (0)');
                clearBlockedWatchdog();
                DEV && console.log('[DJPlayer] onPlaybackChange("ended") calling');
                cbRef.current.onPlaybackChange("ended");
                DEV && console.log('[DJPlayer] onPlaybackChange("ended") called');
              } else if (e.data === YT.PlayerState.PLAYING) {
                DEV && console.log('[DJPlayer] YouTube state PLAYING (1)');
                clearBlockedWatchdog();
                cbRef.current.onPlaybackChange("playing");
              } else if (e.data === YT.PlayerState.PAUSED) {
                DEV && console.log('[DJPlayer] YouTube state PAUSED (2)');
                cbRef.current.onPlaybackChange("paused");
              } else {
                DEV && console.log('[DJPlayer] YouTube state', e.data);
              }
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
      clearBlockedWatchdog();
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
  // Use cueVideoById to load without playing, then playVideo() immediately
  // to start playback. The YouTube IFrame API requires playVideo() to be called
  // in the user gesture context (the Play button click), so we call it directly
  // without setTimeout delays that would exit the gesture context.
  const lastLoadedRef = useRef(videoId);
  useEffect(() => {
    const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
    const p = playerRef.current;
    DEV && console.log('[DJPlayer.effect] videoId:', videoId, 'playing:', playing, 'ready:', ready, 'playerExists:', !!p, 'readyRef:', readyRef.current);
    if (!p || !readyRef.current) {
      DEV && console.log('[DJPlayer.effect] early return: player not ready');
      return;
    }
    try {
      if (videoId !== lastLoadedRef.current) {
        DEV && console.log('[DJPlayer.effect] new videoId detected, old:', lastLoadedRef.current, 'new:', videoId);
        lastLoadedRef.current = videoId;
        DEV && console.log('[DJPlayer.effect] calling cueVideoById');
        p.cueVideoById(videoId);
        // After cueing the next video, immediately sync the desired play state
        // while still in the user gesture context (from the Play button click).
        if (playing) {
          DEV && console.log('[DJPlayer.effect] playing=true, calling playVideo()');
          p.playVideo();
          armBlockedWatchdog();
        } else {
          DEV && console.log('[DJPlayer.effect] playing=false, calling pauseVideo()');
          clearBlockedWatchdog();
          p.pauseVideo();
        }
      } else if (playing) {
        // Same video, ensure it's playing if we want it to be.
        DEV && console.log('[DJPlayer.effect] same video, playing=true, calling playVideo()');
        p.playVideo();
        armBlockedWatchdog();
      } else {
        // Same video, pause it.
        DEV && console.log('[DJPlayer.effect] same video, playing=false, calling pauseVideo()');
        clearBlockedWatchdog();
        p.pauseVideo();
      }
    } catch (e) {
      // Player mid-teardown — the next render settles it.
      DEV && console.log('[DJPlayer.effect] exception caught:', e);
    }
  }, [videoId, playing, ready]);

  // Site-level volume + mute — visitors never have to find the tiny
  // in-iframe controls.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    try {
      p.setVolume(volume);
      if (muted) p.mute();
      else p.unMute();
    } catch {
      // Re-synced on next change.
    }
  }, [volume, muted, ready]);

  // Live progress for the control bar, polled while mounted.
  useEffect(() => {
    if (apiFailed) return;
    const timer = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        const dur = p.getDuration();
        if (dur > 0) cbRef.current.onProgress?.(p.getCurrentTime(), dur);
      } catch {
        // Player mid-teardown.
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [apiFailed]);

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
});

export default DJPlayer;
