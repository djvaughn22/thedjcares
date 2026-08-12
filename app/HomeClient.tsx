"use client";

// The DJ Cares — a digital DJ for Christian media.
// Choose a category. Press play. Let The DJ Cares spin something good.
//
// Everything playable comes from the approved library in
// app/lib/djCaresLibrary.ts. The shuffle (app/lib/spin.ts) never leaves it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DJPlayer, { type DJPlayerHandle } from "./components/DJPlayer";
import ChurchSubmitForm from "./components/ChurchSubmitForm";
import EncouragementActions from "./components/EncouragementActions";
import ShareSheet, { ShareTrigger } from "./components/ShareMenu";
import {
  APPROVED_CHURCHES,
  artworkUrl,
  getEmbedUrl,
  isPlayable,
  itemsOfType,
  LIBRARY,
  MINISTRIES,
  ministryByKey,
  VIBES,
  type MediaItem,
  type Ministry,
  type MinistryKey,
  type Vibe,
} from "./lib/djCaresLibrary";
import {
  churchShareTarget,
  findShareChurch,
  findShareMedia,
  findShareMinistry,
  mediaShareTarget,
  mediaTypeLabel as typeLabel,
  ministryShareTarget,
  PRODUCTION_ORIGIN,
  type ShareTarget,
} from "./lib/shareLinks";
import {
  loadHistory,
  pickNext,
  pushHistory,
  saveHistory,
  spinPool,
  type SpinCategory,
} from "./lib/spin";
import {
  buildQueue,
  DEFAULT_PREFS,
  isAtQueueEnd,
  loadPrefs,
  loadSession,
  MIX_MODES,
  nextPlayableIndex,
  QUEUE_MOODS,
  resolveQueue,
  savePrefs,
  saveSession,
  type MixMode,
  type PlayerPrefs,
} from "./lib/moodQueue";
import {
  clearSessionHistory,
  createSessionHistory,
  getPlayedCount,
  getPlayOrder,
  hasPlayed,
  loadSessionHistory,
  markAsPlayed,
  saveSessionHistory,
  type SessionHistory,
} from "./lib/sessionHistory";
import type { DjNeed } from "./lib/digitalDjSelector";
import { track } from "./lib/analytics";
import type { DailyEncouragement } from "./lib/dailyEncouragement";
import { buildVideoQueueFrom, reorderUpcoming, shouldStopAtQueueEnd } from "./lib/mainQueue";

const TABS = [
  { id: "spin", label: "Spin", emoji: "🎧" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "podcasts", label: "Podcasts", emoji: "🎙️" },
  { id: "sermons", label: "Sermons", emoji: "✝️" },
  { id: "ministries", label: "Ministries", emoji: "🏛️" },
  { id: "churches", label: "Churches", emoji: "⛪" },
  { id: "about", label: "About", emoji: "💜" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const SPIN_CATEGORIES: { id: SpinCategory; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "music", label: "Music" },
  { id: "videos", label: "Music Videos" },
  { id: "playlist", label: "Playlists" },
  { id: "podcast", label: "Podcasts" },
  { id: "sermon", label: "Sermons" },
];

// Pre-filled request email — DJ reviews everything Gospel-first before adding.
const REQUEST_MAILTO =
  "mailto:ask@openmirrorllc.com?subject=" +
  encodeURIComponent("The DJ Cares — request") +
  "&body=" +
  encodeURIComponent(
    "What I'd love on The DJ Cares:\n\nTitle / name:\nArtist or speaker:\nLink (YouTube, Apple Music, or Spotify):\nWhy it encourages:\n",
  );

export default function TheDJCaresPage({
  digitalDjEnabled = true,
  daily = null,
}: {
  digitalDjEnabled?: boolean;
  daily?: DailyEncouragement | null;
}) {
  const [dark, setDark] = useState(true);

  // Enable debug logging with: window.__djDebug = true; in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('%c🎧 The DJ Cares Debug Mode', 'color: #A78BFA; font-weight: 900; font-size: 14px;');
      console.log('Enable detailed logging: window.__djDebug = true');
      console.log('Then select a mood and press Play to see the full event chain.');
    }
  }, []);
  const [tab, setTab] = useState<Tab>("spin");

  // --- deck state ---
  const [category, setCategory] = useState<SpinCategory>("videos");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [started, setStarted] = useState(false); // player mounted?
  const [playing, setPlaying] = useState(false); // desired play state
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused">("idle");
  const [blocked, setBlocked] = useState(false); // current item wouldn't play
  const [announce, setAnnounce] = useState("");
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(new Set());
  // --- mood mix state ---
  const [moodQueue, setMoodQueue] = useState<{ mood: DjNeed; mode: MixMode; queue: MediaItem[]; position: number } | null>(null);
  const [mixMode, setMixMode] = useState<MixMode>("both");
  // --- main (Daily Encouragement → Videos) continuous queue state ---
  const [mainQueue, setMainQueue] = useState<{ queue: MediaItem[]; position: number } | null>(null);
  const [mainShuffle, setMainShuffle] = useState(false);
  const [mainRepeat, setMainRepeat] = useState(false);
  const [prefs, setPrefs] = useState<PlayerPrefs>(DEFAULT_PREFS);
  const [progress, setProgress] = useState<{ t: number; d: number } | null>(null);
  const lastProgressRef = useRef<{ t: number; d: number } | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory>(createSessionHistory());
  const playedCountRef = useRef(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const playerRef = useRef<DJPlayerHandle>(null);
  const onEndedInProgressRef = useRef(false); // Prevent re-entrance
  // Which item the (single, page-level) share sheet is open for.
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTriggerId, setShareTriggerId] = useState<string | null>(null);
  // The record shop window: which of the DJ's Apple Music playlists is open
  // up top. Faith Playlist leads (share deep links can pick another).
  const [heroPlaylistId, setHeroPlaylistId] = useState("apple-faith-playlist");
  const historyRef = useRef<string[]>([]);
  // This session's play order, for real Previous/Next.
  const sessionRef = useRef<MediaItem[]>([]);
  const posRef = useRef(-1);
  const deckRef = useRef<HTMLDivElement>(null);

  // Track state changes for debugging
  useEffect(() => {
    if (current) console.log('[STATE] current:', current.id, current.title, 'videoId:', current.videoId);
  }, [current?.id]);
  useEffect(() => {
    console.log('[STATE] playing:', playing, 'started:', started);
  }, [playing, started]);
  useEffect(() => {
    if (moodQueue) console.log('[STATE] moodQueue: pos', moodQueue.position, 'len', moodQueue.queue.length);
  }, [moodQueue?.position, moodQueue?.queue.length]);

  // Follow the family ☀️/🌙 toggle in the Open Mirror bar.
  useEffect(() => {
    const follow = () => setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // Initialize session history on mount
  useEffect(() => {
    const history = loadSessionHistory();
    setSessionHistory(history);
    playedCountRef.current = getPlayedCount(history);
  }, []);

  // Homepage section anchors — the single-page nav menu's destinations.
  // These land on the Spin tab (where the sections live) and scroll to the
  // matching element, rather than switching to an isolated exclusive tab.
  const SECTION_IDS = ["daily-encouragement", "now-playing", "videos", "music", "sermons", "podcasts"];

  // URL hash ↔ page state. Two namespaces share one hash string:
  //  - bare section names (#videos, #music, #sermons, #podcasts, plus
  //    #daily-encouragement / #now-playing) scroll to a homepage section;
  //  - "#tab-<id>" switches to that exclusive browsing tab (written by
  //    goTab below, so reload/back-forward lands back on the right tab
  //    instead of bouncing to its same-named homepage section).
  // Bare legacy tab ids (e.g. #about, #ministries, #churches) still switch
  // tabs directly, for old links that predate the tab-* scheme.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "");
      const alias = h === "playlists" ? "music" : h; // old #playlists → Music section
      if (SECTION_IDS.includes(alias)) {
        setTab("spin");
        window.setTimeout(() => document.getElementById(alias)?.scrollIntoView({ block: "start" }), 80);
        return;
      }
      if (h.startsWith("tab-")) {
        const tabId = h.slice(4);
        if (TABS.some((t) => t.id === tabId)) setTab(tabId as Tab);
        return;
      }
      if (TABS.some((t) => t.id === h)) setTab(h as Tab);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "spin" ? window.location.pathname : `#tab-${t}`);
    window.scrollTo({ top: 0 });
    track("tab_view", { tab: t });
  };

  // Cue tonight's first record (no sound until the visitor presses Play) —
  // unless a share deep link (/?play=… /?ministry=… /?church=…) asks for a
  // specific item. Deep links cue, they never autoplay.
  useEffect(() => {
    historyRef.current = loadHistory();
    const params = new URLSearchParams(window.location.search);
    // Instant jump: smooth scrolling needs animation frames, which backgrounded
    // tabs don't get — and a deep link is a fresh page load anyway.
    const bringIntoView = (id: string) =>
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 80);

    const shared = findShareMedia(params.get("play") ?? "");
    const ministry = findShareMinistry(params.get("ministry") ?? "");
    const church = findShareChurch(params.get("church") ?? "");

    if (shared && shared.type === "playlist") {
      // The Music section keeps the full Apple player mounted — select it there.
      setHeroPlaylistId(shared.id);
      setAnnounce(`Ready to play: ${shared.title}`);
      bringIntoView("music");
    } else if (shared && isPlayable(shared)) {
      // Cue it on the deck, ready for one tap of Play.
      setCurrent(shared);
      setAnnounce(`Ready to play: ${shared.title} — ${shared.author}`);
      bringIntoView("now-playing");
      return;
    } else if (shared) {
      // Link-out podcasts play at their official homes — show their card.
      setTab("podcasts");
      bringIntoView(`djc-item-${shared.id}`);
    } else if (ministry) {
      setTab("ministries");
      bringIntoView(`djc-ministry-${ministry.key}`);
    } else if (church) {
      setTab("churches");
      bringIntoView(`djc-church-${church.id}`);
    }

    // No deep link — restore a saved mood session (cued, never auto-playing)
    // before falling back to tonight's featured record.
    setPrefs(loadPrefs());
    const saved = loadSession();
    if (saved) {
      const queue = resolveQueue(saved.queueIds);
      if (queue.length > 0) {
        const position = Math.min(saved.position, queue.length - 1);
        setMoodQueue({ mood: saved.mood, mode: saved.mode, queue, position });
        setMixMode(saved.mode);
        setCurrent(queue[position]);
        setAnnounce(`Your ${saved.mood === "surprise" ? "mix" : `${saved.mood} mix`} is cued where you left off.`);
        return;
      }
    }
    // Default cue: today's Daily Encouragement pick — the homepage's whole
    // reason to arrive. No deep link, no saved session? Lead with it.
    setCurrent(daily?.item ?? LIBRARY.find((i) => i.featured && i.type === "music") ?? LIBRARY[0]);
  }, [daily]);

  const pool = useMemo(
    () => spinPool({ category, vibe }).filter((i) => !unavailable.has(i.id)),
    [category, vibe, unavailable],
  );

  const startItem = useCallback((item: MediaItem, viaSpin = false, inMoodMix = false, fromMainQueue = false) => {
    console.log('[HomeClient.startItem] LOADING:', item.title, 'videoId:', item.videoId);
    // A pick outside the mood queue is a new choice — the mood mix steps
    // aside. A pick that IS in the queue jumps the queue there instead.
    if (!inMoodMix && moodQueue) {
      const qIdx = moodQueue.queue.findIndex((q) => q.id === item.id);
      if (qIdx === -1) {
        endMoodMix();
      } else {
        const mix = { ...moodQueue, position: qIdx };
        setMoodQueue(mix);
        persistMoodMix(mix);
      }
    }
    // A direct pick (not an internal mood/main-queue advance) becomes the
    // new continuous-playback anchor: the Daily Encouragement item, or any
    // playable video, seeds a fresh queue of it + the rest of the video
    // catalog so playback keeps going after it ends. Anything else (a
    // sermon, a podcast, a playlist) drops any active main queue.
    if (!inMoodMix && !fromMainQueue) {
      const isDailyPick = Boolean(daily && item.id === daily.item.id);
      if ((item.type === "music" && item.videoId) || isDailyPick) {
        setMainQueue({ queue: buildVideoQueueFrom(item, itemsOfType("music")), position: 0 });
      } else {
        setMainQueue(null);
      }
    }
    // New play cuts the session's forward branch (like a browser history).
    sessionRef.current = [...sessionRef.current.slice(0, posRef.current + 1), item];
    posRef.current = sessionRef.current.length - 1;
    historyRef.current = pushHistory(historyRef.current, item.id, Math.max(pool.length, 2));
    saveHistory(historyRef.current);
    console.log('[HomeClient.startItem] setState: current, playing, started=true');
    setCurrent(item);
    setStarted(true);
    setPlaying(true);
    setBlocked(false);
    setAutoplayBlocked(false);
    setProgress(null);

    // Track this play in session history
    const newHistory = markAsPlayed(sessionHistory, item.id);
    setSessionHistory(newHistory);
    saveSessionHistory(newHistory);
    playedCountRef.current = getPlayedCount(newHistory);

    setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
    track("media_play", { content_type: item.type, content_title: item.title, via: viaSpin ? "spin" : "pick" });
    deckRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [moodQueue, pool.length, sessionHistory, daily]);

  // --- the mood mix -----------------------------------------------------------

  const persistMoodMix = (mix: { mood: DjNeed; mode: MixMode; queue: MediaItem[]; position: number } | null) => {
    saveSession(mix ? { mood: mix.mood, mode: mix.mode, queueIds: mix.queue.map((i) => i.id), position: mix.position, updatedAt: Date.now() } : null);
  };

  const endMoodMix = () => {
    setMoodQueue(null);
    persistMoodMix(null);
  };

  // Selecting a mood (or "New mix") builds a fresh shuffled queue and starts it.
  const startMoodMix = useCallback((mood: DjNeed, mode: MixMode = mixMode) => {
    const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
    DEV && console.log('[HomeClient.startMoodMix] mood:', mood, 'mode:', mode);
    const queue = buildQueue(mood, mode, { avoidFirst: current?.id, avoidAlready: sessionHistory.playedIds });
    if (queue.length === 0) {
      DEV && console.log('[HomeClient.startMoodMix] queue is empty');
      setAnnounce("Nothing matches that mix yet — try Both.");
      return;
    }
    DEV && console.log('[HomeClient.startMoodMix] queue built with', queue.length, 'items, starting first');
    const mix = { mood, mode, queue, position: 0 };
    setMoodQueue(mix);
    persistMoodMix(mix);
    setUnavailable(new Set());
    startItem(queue[0], true, true);
    const label = mood === "surprise" ? "surprise mix" : `${mood} mix`;
    setAnnounce(`Your ${label} is on: ${queue.length} songs, ${queue[0].title} first.`);
    track("mood_mix_start", { mood, mode, size: queue.length });
  }, [current, sessionHistory.playedIds, mixMode, startItem]);

  // Move through the queue, skipping anything that failed to play.
  const moodStep = useCallback((direction: 1 | -1) => {
    console.log('[HomeClient.moodStep] CALLED. direction:', direction);
    if (!moodQueue) {
      console.log('[HomeClient.moodStep] no moodQueue, returning');
      return;
    }
    const idx = nextPlayableIndex(moodQueue.queue, moodQueue.position, unavailable, direction);
    console.log('[HomeClient.moodStep] nextPlayableIndex returned:', idx, 'from position:', moodQueue.position);
    if (idx === null) {
      console.log('[HomeClient.moodStep] NO PLAYABLE INDEX - queue has no more items');
      setAnnounce("Nothing in this mix will play right now — cue a new mix.");
      return;
    }
    const nextItem = moodQueue.queue[idx];
    console.log('[HomeClient.moodStep] ADVANCING to:', idx, 'item:', nextItem?.title);
    const mix = { ...moodQueue, position: idx };
    setMoodQueue(mix);
    persistMoodMix(mix);
    startItem(mix.queue[idx], true, true);
  }, [moodQueue, unavailable, startItem]);

  // When the queue's last playable item ends, repeat the mood with a fresh
  // shuffle that never opens on the item that just finished.
  const moodRollover = useCallback(() => {
    const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
    DEV && console.log('[HomeClient.moodRollover] rebuilding queue for mood:', moodQueue?.mood);
    if (!moodQueue) return;
    const queue = buildQueue(moodQueue.mood, moodQueue.mode, { avoidFirst: current?.id, avoidAlready: sessionHistory.playedIds });
    if (queue.length === 0) {
      DEV && console.log('[HomeClient.moodRollover] new queue is empty');
      return;
    }
    DEV && console.log('[HomeClient.moodRollover] new queue built with', queue.length, 'items, starting first item');
    const mix = { ...moodQueue, queue, position: 0 };
    setMoodQueue(mix);
    persistMoodMix(mix);
    startItem(queue[0], true, true);
    setAnnounce("Back to the top — fresh shuffle, same mood.");
  }, [moodQueue, current, sessionHistory.playedIds, startItem]);

  // Advance the main (Daily Encouragement → Videos) queue. Returns false if
  // there's no main queue to advance, so callers can fall through to the
  // legacy spin behavior. At the end of the queue: stop cleanly unless
  // Repeat is on (then nextPlayableIndex's own wraparound continues it).
  const mainNext = useCallback((direction: 1 | -1): boolean => {
    if (!mainQueue) return false;
    if (direction === 1 && shouldStopAtQueueEnd(mainQueue.queue, mainQueue.position, unavailable, mainRepeat)) {
      setPlaying(false);
      setAnnounce("That's the whole video queue — turn on Repeat to keep it going, or pick something else.");
      return true;
    }
    const idx = nextPlayableIndex(mainQueue.queue, mainQueue.position, unavailable, direction);
    if (idx === null) {
      setMainQueue(null);
      return false;
    }
    const q = { ...mainQueue, position: idx };
    setMainQueue(q);
    startItem(q.queue[idx], true, false, true);
    return true;
  }, [mainQueue, mainRepeat, unavailable, startItem]);

  // Shuffle rebuilds only the UPCOMING portion of the queue — the currently
  // playing item and everything before it stay put. Turning shuffle off
  // restores canonical catalog order for whatever's left to play.
  const toggleMainShuffle = () => {
    setMainShuffle((wasOn) => {
      const on = !wasOn;
      setMainQueue((q) => (q ? { ...q, queue: reorderUpcoming(q.queue, q.position, on, itemsOfType("music")) } : q));
      return on;
    });
  };

  const spin = useCallback(() => {
    const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
    DEV && console.log('[HomeClient.spin] moodQueue:', !!moodQueue);
    if (moodQueue) {
      DEV && console.log('[HomeClient.spin] in mood mix, calling moodStep(1)');
      moodStep(1);
      return;
    }
    const nextItem = pickNext(pool, historyRef.current);
    DEV && console.log('[HomeClient.spin] picked item:', nextItem?.id, nextItem?.title);
    if (nextItem) startItem(nextItem, true);
  }, [moodQueue, pool, moodStep, startItem]);

  const spinMinistry = (key: MinistryKey) => {
    endMoodMix();
    const mPool = spinPool({ category: "sermon", ministry: key }).filter((i) => !unavailable.has(i.id));
    const next = pickNext(mPool, historyRef.current);
    if (next) {
      goTab("spin");
      startItem(next, true);
    }
  };

  const prev = () => {
    if (moodQueue) {
      moodStep(-1);
      return;
    }
    if (posRef.current <= 0) return;
    posRef.current -= 1;
    const item = sessionRef.current[posRef.current];
    setCurrent(item);
    setPlaying(true);
    setBlocked(false);
    setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
  };

  const next = useCallback(() => {
    console.log('[HomeClient.next] CALLED. moodQueue:', !!moodQueue);
    if (moodQueue) {
      console.log('[HomeClient.next] in mood mix. position:', moodQueue.position, 'queue length:', moodQueue.queue.length);
      const atEnd = isAtQueueEnd(moodQueue.queue, moodQueue.position, unavailable);
      console.log('[HomeClient.next] atEnd:', atEnd);
      if (atEnd) {
        console.log('[HomeClient.next] AT END - calling moodRollover');
        moodRollover();
      } else {
        console.log('[HomeClient.next] NOT at end - calling moodStep(1)');
        moodStep(1);
      }
      return;
    }
    console.log('[HomeClient.next] regular session mode (not mood mix)');
    if (posRef.current < sessionRef.current.length - 1) {
      posRef.current += 1;
      const item = sessionRef.current[posRef.current];
      setCurrent(item);
      setPlaying(true);
      setBlocked(false);
      setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
      return;
    }
    if (mainNext(1)) return;
    spin();
  }, [moodQueue, unavailable, current, moodRollover, moodStep, mainNext, spin]);

  // A record finished on its own — memoize to prevent stale closures in effects.
  const onEnded = useCallback(() => {
    console.log('[HomeClient.onEnded] FIRED. current:', current?.id, current?.title);
    // Prevent re-entrance - only process once per video end
    if (onEndedInProgressRef.current) {
      console.log('[HomeClient.onEnded] BLOCKED - already in progress');
      return;
    }
    onEndedInProgressRef.current = true;

    if (prefs.repeat === "one") {
      console.log('[HomeClient.onEnded] repeat=one, restarting');
      playerRef.current?.restart();
      onEndedInProgressRef.current = false;
      return;
    }
    console.log('[HomeClient.onEnded] calling next()');
    next();

    // Reset after a short delay to allow state updates
    window.setTimeout(() => {
      onEndedInProgressRef.current = false;
    }, 100);
  }, [current, prefs.repeat, next]);


  const onUnavailable = () => {
    if (!current) return;
    setUnavailable((s) => new Set([...s, current.id]));
    if (moodQueue) {
      // One bad record never stops the mix — skip it and keep playing.
      setAnnounce(`${current.title} won't play here — skipping to the next one.`);
      const failed = new Set([...unavailable, current.id]);
      const idx = nextPlayableIndex(moodQueue.queue, moodQueue.position, failed, 1);
      if (idx !== null && moodQueue.queue[idx].id !== current.id) {
        const mix = { ...moodQueue, position: idx };
        setMoodQueue(mix);
        persistMoodMix(mix);
        startItem(mix.queue[idx], true, true);
        return;
      }
    }
    if (mainQueue) {
      // One bad video never stops the queue — skip it and keep playing.
      setAnnounce(`${current.title} won't play here — skipping to the next one.`);
      const failed = new Set([...unavailable, current.id]);
      const idx = nextPlayableIndex(mainQueue.queue, mainQueue.position, failed, 1);
      if (idx !== null && mainQueue.queue[idx].id !== current.id) {
        const q = { ...mainQueue, position: idx };
        setMainQueue(q);
        startItem(q.queue[idx], true, false, true);
        return;
      }
    }
    setBlocked(true);
    setPlaying(false);
    setPlayerState("idle");
    setAnnounce(`${current.title} won't play here. Use the official link, or spin another.`);
  };

  const updatePrefs = (patch: Partial<PlayerPrefs>) => {
    setPrefs((p) => {
      const nextPrefs = { ...p, ...patch };
      savePrefs(nextPrefs);
      return nextPrefs;
    });
  };

  // Palette — flat + cool, matched to the Open Mirror family.
  const bg = dark ? "#0b1220" : "#eef2f7";
  const text = dark ? "#e8edf5" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#475569";
  const card = dark ? "#141d2e" : "#ffffff";
  const border = dark ? "#26324c" : "#dbe2ea";
  const active = dark ? "#1c2740" : "#eef4ff";
  const activeBorder = dark ? "#33507e" : "#c7d7f5";
  const accent = "#A78BFA";
  const ink = "#0b1220";

  // One Share look everywhere: the trigger opens the single page-level sheet.
  const sharePalette = { card, border, text, sub, accent };
  const openShare = (target: ShareTarget, triggerId: string) => {
    setShareTarget(target);
    setShareTriggerId(triggerId);
  };
  const share = (target: ShareTarget, scope?: string) => (
    <ShareTrigger target={target} scope={scope} palette={sharePalette} onOpen={openShare} />
  );

  const pill = (selected: boolean): React.CSSProperties => ({
    background: selected ? active : "none",
    border: `2px solid ${selected ? activeBorder : border}`,
    borderRadius: 50,
    padding: "10px 8px",
    fontSize: 13.5,
    fontWeight: 800,
    cursor: "pointer",
    color: selected ? accent : sub,
    textAlign: "center",
  });

  // Symmetric option grids — every row full, every button the same size.
  // minmax(0, 1fr) keeps long labels from stretching their column.
  const optionGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
  };

  const bigButton: React.CSSProperties = {
    background: accent,
    border: "none",
    color: ink,
    borderRadius: 50,
    padding: "14px 26px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const quietButton: React.CSSProperties = {
    background: "none",
    border: `2px solid ${border}`,
    color: text,
    borderRadius: 50,
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const sectionH: React.CSSProperties = { fontSize: 24, fontWeight: 900, color: text, margin: "0 0 6px" };
  const sectionSub: React.CSSProperties = { fontSize: 14.5, color: sub, margin: "0 0 18px", lineHeight: 1.6 };

  // --- small building blocks ---

  const MediaCard = ({ item, showMinistry = false }: { item: MediaItem; showMinistry?: boolean }) => {
    const art = artworkUrl(item);
    const playable = Boolean(item.videoId || item.spotifyEmbed || item.appleEmbed);
    const isCurrent = current?.id === item.id && started;
    const open = (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}
      >
        {item.videoId ? "Open on YouTube ↗" : "Open the official source ↗"}
      </a>
    );
    const footer = (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "0 14px 12px" }}>
        {open}
        {share(mediaShareTarget(item))}
      </div>
    );
    const body = (
      <>
        {art && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            {playable && (
              <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
                {isCurrent && playerState === "playing" ? "" : "▶️"}
              </span>
            )}
            {item.duration && (
              <span style={{ position: "absolute", right: 8, bottom: 8, background: "rgba(0,0,0,0.75)", color: "#fff", borderRadius: 8, padding: "2px 8px", fontSize: 12, fontWeight: 800 }}>
                {item.duration}
              </span>
            )}
          </div>
        )}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", textAlign: "left" }}>
          {isCurrent && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: accent, textTransform: "uppercase" }}>
              {playerState === "playing" && (
                <span className="djc-eq" aria-hidden>
                  <span /><span /><span /><span />
                </span>
              )}
              Now Spinning
            </span>
          )}
          <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: 0 }}>{item.title}</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: 0 }}>
            {item.author}
            {showMinistry && item.ministry ? ` · ${ministryByKey(item.ministry)?.name}` : ""}
          </p>
          {item.summary && <p style={{ fontSize: 13, color: sub, margin: "2px 0 0", lineHeight: 1.5 }}>{item.summary}</p>}
        </div>
      </>
    );
    if (!playable) {
      return (
        <div className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          {body}
          {footer}
        </div>
      );
    }
    return (
      <div
        className="pop"
        style={{ background: card, border: `2px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, overflow: "hidden", position: "relative" }}
      >
        <button
          onClick={() => startItem(item)}
          aria-label={`Play ${typeLabel(item).toLowerCase()}: ${item.title} by ${item.author}`}
          style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit" }}
        >
          {body}
        </button>
        {footer}
      </div>
    );
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: 14,
  };

  const VibeChips = ({ scope }: { scope?: Vibe[] }) => (
    <div style={{ ...optionGrid, marginBottom: 20 }}>
      {(scope ?? VIBES).map((v) => (
        <button key={v} onClick={() => setVibe(vibe === v ? null : v)} aria-pressed={vibe === v} style={pill(vibe === v)}>
          {v}
        </button>
      ))}
    </div>
  );

  // One playlist card, artwork and all — the Apple player is always mounted
  // (lazily loaded), so pressing play is a single tap like the old site.
  const PlaylistCard = ({ p }: { p: MediaItem }) => (
    <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "16px 18px" }}>
      <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
      {p.summary && <p style={{ fontSize: 13, color: sub, margin: "3px 0 0" }}>{p.summary}</p>}
      {p.appleEmbed && (
        <iframe
          src={p.appleEmbed}
          title={p.title}
          loading="lazy"
          allow="autoplay *; encrypted-media *;"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          style={{ width: "100%", height: 430, border: 0, borderRadius: 12, marginTop: 12, background: "transparent" }}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
          Open in Apple Music ↗
        </a>
        {p.spotifyAlt && (
          <a href={p.spotifyAlt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
            Prefer Spotify? ↗
          </a>
        )}
        {share(mediaShareTarget(p))}
      </div>
    </div>
  );

  // --- the deck (Now Spinning) ---

  const deckPoolEmpty = pool.length === 0;
  const showVideo = started && current?.videoId;
  const showEmbed = started && current && !current.videoId && (current.spotifyEmbed || current.appleEmbed);

  const deck = (
    <section
      ref={deckRef}
      id="now-playing"
      aria-label="Now Spinning"
      style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 28 }}
    >
      <div aria-live="polite" className="djc-sr-only">{announce}</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <p style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: 0 }}>
          {playerState === "playing" ? (
            <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
          ) : (
            <span aria-hidden>🎧</span>
          )}
          Now Spinning
        </p>
        {current && <span style={{ fontSize: 12, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em" }}>{typeLabel(current)}</span>}
      </div>

      {/* the record / player */}
      {!started && current && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0 4px" }}>
          <button
            onClick={() => startItem(current)}
            aria-label={`Play ${current.title} by ${current.author}`}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <span className="djc-record" style={{ display: "block", width: "min(200px, 52vw)", aspectRatio: "1", border: `6px solid ${dark ? "#0c1220" : "#dbe2ea"}`, boxSizing: "content-box" }}>
              {artworkUrl(current) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artworkUrl(current)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 56, background: active }}>🎧</span>
              )}
              <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(11,18,32,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>▶</span>
              </span>
            </span>
          </button>
        </div>
      )}

      {showVideo && !blocked && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
          {(() => {
            const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
            DEV && console.log('[HomeClient.render] DJPlayer props: videoId:', current?.videoId, 'title:', current?.title, 'playing:', playing, 'volume:', prefs.volume);
            return null;
          })()}
          <DJPlayer
            ref={playerRef}
            videoId={current!.videoId!}
            title={current!.title}
            playing={playing}
            volume={prefs.volume}
            muted={prefs.muted}
            onPlaybackChange={(s) => {
              const DEV = typeof window !== 'undefined' && (window as any).__djDebug;
              DEV && console.log('[DJPlayer.onPlaybackChange] state:', s, 'current video:', current?.videoId);
              if (s === "ended") {
                DEV && console.log('[DJPlayer.onPlaybackChange] calling onEnded');
                onEnded();
              } else {
                DEV && console.log('[DJPlayer.onPlaybackChange] setPlayerState:', s);
                setPlayerState(s);
              }
            }}
            onProgress={(t, d) => {
              // Log periodically to avoid log spam - every 10 seconds or at end
              const isNearEnd = d > 0 && t >= d - 1;
              if (isNearEnd || (Math.floor(t) % 10 === 0 && t !== lastProgressRef.current?.t)) {
                console.log(`[onProgress] t:${t.toFixed(1)}s / d:${d.toFixed(1)}s - ${isNearEnd ? '*** NEAR END ***' : ''}`);
              }
              setProgress({ t, d });
            }}
            onAutoplayBlocked={() => setAutoplayBlocked(true)}
            onUnavailable={onUnavailable}
          />
        </div>
      )}

      {blocked && current && (
        <div role="status" style={{ border: `2px solid ${border}`, borderRadius: 14, padding: "18px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: "0 0 4px" }}>That one won&apos;t play here.</p>
          <p style={{ fontSize: 13.5, color: sub, margin: "0 0 12px" }}>Some videos only play on YouTube itself — the official link still works.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={current.url} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, textDecoration: "none", display: "inline-block" }}>
              Watch on YouTube ↗
            </a>
            <button onClick={spin} style={bigButton}>🎲 Spin Something Else</button>
          </div>
        </div>
      )}

      {showEmbed && (
        <iframe
          src={getEmbedUrl(current!)!}
          title={current!.title}
          allow="autoplay *; encrypted-media *; clipboard-write"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          style={{ width: "100%", height: current!.spotifyEmbed ? 352 : 450, border: 0, borderRadius: 14, overflow: "hidden", background: "transparent" }}
        />
      )}

      {/* what's on the platter */}
      {current && !blocked && (
        <div style={{ textAlign: "center", margin: "14px 0 0" }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: text, margin: 0 }}>{current.title}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: accent, margin: "2px 0 0" }}>
            {current.author}
            {current.ministry ? ` · ${ministryByKey(current.ministry)?.name}` : ""}
          </p>
          {!started && current.summary && (
            <p style={{ fontSize: 13.5, color: sub, margin: "6px auto 0", maxWidth: 420, lineHeight: 1.55 }}>{current.summary}</p>
          )}
        </div>
      )}

      {/* continuous-queue status — only meaningful outside a mood mix, which
          has its own always-shuffled, always-looping behavior below. */}
      {mainQueue && !moodQueue && (
        <p role="status" style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: sub, margin: "12px 0 0" }}>
          {mainQueue.position + 1 < mainQueue.queue.length
            ? `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — up next: ${mainQueue.queue[mainQueue.position + 1].title}`
            : mainRepeat
              ? `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — Repeat is on, back to the top after this`
              : `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — last one queued`}
        </p>
      )}

      {/* controls */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button onClick={prev} disabled={posRef.current <= 0} aria-label="Previous" style={{ ...quietButton, opacity: posRef.current <= 0 ? 0.45 : 1, cursor: posRef.current <= 0 ? "default" : "pointer" }}>
          ⏮
        </button>
        {current?.videoId && started && !blocked ? (
          <button onClick={() => setPlaying(playerState !== "playing")} aria-label={playerState === "playing" ? "Pause" : "Play"} style={quietButton}>
            {playerState === "playing" ? "⏸ Pause" : "▶ Play"}
          </button>
        ) : !started && current ? (
          <button onClick={() => startItem(current)} style={bigButton}>▶ Play</button>
        ) : null}
        <button onClick={next} aria-label="Next" style={quietButton}>⏭</button>
        {!moodQueue && (
          <>
            <button onClick={toggleMainShuffle} aria-pressed={mainShuffle} aria-label={`Shuffle ${mainShuffle ? "on" : "off"}`} style={pill(mainShuffle)}>
              🔀 Shuffle {mainShuffle ? "On" : "Off"}
            </button>
            <button onClick={() => setMainRepeat((r) => !r)} aria-pressed={mainRepeat} aria-label={`Repeat ${mainRepeat ? "on" : "off"}`} style={pill(mainRepeat)}>
              🔁 Repeat {mainRepeat ? "On" : "Off"}
            </button>
          </>
        )}
        <button onClick={spin} disabled={deckPoolEmpty && !moodQueue} style={{ ...bigButton, opacity: deckPoolEmpty && !moodQueue ? 0.5 : 1 }}>
          🎲 Spin Something Else
        </button>
        {current && share(mediaShareTarget(current), "deck")}
        <button onClick={() => updatePrefs({ muted: !prefs.muted })} aria-label={prefs.muted ? "Unmute" : "Mute"} style={quietButton}>
          {prefs.muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* mood mixer UI */}
      {tab === "spin" && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 10px" }}>
            Mood mixes
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 8, marginBottom: 12 }}>
            {QUEUE_MOODS.map((mood) => (
              <button
                key={mood}
                onClick={() => startMoodMix(mood, mixMode)}
                aria-pressed={moodQueue?.mood === mood}
                style={pill(moodQueue?.mood === mood)}
              >
                {mood === "surprise" ? "🎲" : mood[0].toUpperCase()}{mood.slice(1)}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 8px" }}>
            Mix type
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {MIX_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setMixMode(mode.id);
                  if (moodQueue) startMoodMix(moodQueue.mood, mode.id);
                }}
                aria-pressed={mixMode === mode.id}
                style={pill(mixMode === mode.id)}
              >
                <span aria-hidden>{mode.emoji}</span> {mode.label}
              </button>
            ))}
          </div>
          {moodQueue && (
            <button onClick={endMoodMix} style={{ ...quietButton, width: "100%", marginTop: 12 }}>
              End this mood mix
            </button>
          )}
        </div>
      )}

      {/* category + vibe — the DJ's request line (Spin tab only) */}
      {tab === "spin" && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 10px" }}>
            What should I spin?
          </p>
          <div style={{ ...optionGrid, marginBottom: 12 }}>
            {SPIN_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id} style={pill(category === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 10px" }}>
            Choose a vibe <span style={{ fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>(optional)</span>
          </p>
          <div style={optionGrid}>
            {VIBES.map((v) => (
              <button key={v} onClick={() => setVibe(vibe === v ? null : v)} aria-pressed={vibe === v} style={pill(vibe === v)}>
                {v}
              </button>
            ))}
          </div>
          {deckPoolEmpty && (
            <p role="status" style={{ fontSize: 13, color: sub, margin: "12px 0 0" }}>
              Nothing matches that combo yet — try another vibe or category.
            </p>
          )}
        </div>
      )}
    </section>
  );

  // --- ministries with content counts ---
  const ministryCounts = (m: Ministry) => {
    const sermons = LIBRARY.filter((i) => i.type === "sermon" && i.ministry === m.key && i.active !== false).length;
    const podcasts = LIBRARY.filter((i) => i.type === "podcast" && i.ministry === m.key && i.active !== false).length;
    return { sermons, podcasts };
  };

  const songs = itemsOfType("music");
  const podcasts = itemsOfType("podcast");
  const sermons = itemsOfType("sermon");
  const playlists = itemsOfType("playlist");
  const vibeFiltered = (items: MediaItem[]) => (vibe ? items.filter((i) => i.vibes.includes(vibe)) : items);

  const [sermonMinistry, setSermonMinistry] = useState<MinistryKey | null>(null);
  const [expandedSermons, setExpandedSermons] = useState<Record<string, boolean>>({});
  const heroPlaylist = playlists.find((p) => p.id === heroPlaylistId) ?? playlists[0];

  return (
    <main style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* identity */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{ fontSize: "clamp(1.8rem, 8vw, 2.4rem)", fontWeight: 900, color: text, margin: "0 0 8px" }}>
            The DJ <span style={{ color: accent }}>Cares</span> <span aria-hidden>🎧</span>
          </h1>
          <p style={{ fontSize: 15, color: sub, lineHeight: 1.55, maxWidth: 460, margin: "0 auto" }}>
            Music, messages, and encouragement worth passing on — hand-picked, Gospel first.
          </p>
        </div>

        {/* Daily Encouragement — the reason to arrive. Same pick /today used
            to show, reused via the shared buildDailyEncouragement adapter
            (no cloned selection logic). One click plays it in the Now
            Playing player right below; EncouragementActions (unchanged,
            reused as-is) carries everything /today offered — source link,
            share, and the download card — so nothing is lost. */}
        {tab === "spin" && daily && (
          <section
            id="daily-encouragement"
            aria-label="Daily Encouragement"
            style={{ background: card, border: `2px solid ${activeBorder}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20 }}
          >
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 4px" }}>
              <span aria-hidden>🌅</span> Daily Encouragement
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: sub, margin: "0 0 16px" }}>
              {daily.label} · {daily.post.fullDate}
            </p>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {artworkUrl(daily.item) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkUrl(daily.item)!}
                  alt=""
                  loading="lazy"
                  width={116}
                  height={65}
                  style={{ width: 116, height: 65, objectFit: "cover", borderRadius: 10, border: `2px solid ${border}`, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <p style={{ fontSize: 19, fontWeight: 900, color: text, margin: 0 }}>{daily.item.title}</p>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: accent, margin: "2px 0 0" }}>{daily.item.author}</p>
                {daily.item.summary && (
                  <p style={{ fontSize: 13, color: sub, margin: "4px 0 0", lineHeight: 1.5 }}>{daily.item.summary}</p>
                )}
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => startItem(daily.item)} style={{ ...bigButton, padding: "14px 30px" }}>
                ▶ Play Today&apos;s Encouragement
              </button>
            </div>
            <div style={{ marginTop: 14, borderTop: `1px solid ${border}`, paddingTop: 14 }}>
              <EncouragementActions
                contentId={daily.item.id}
                label={daily.label}
                title={daily.item.title}
                pageUrl={`${PRODUCTION_ORIGIN}/#daily-encouragement`}
                sourceUrl={daily.sourceUrl}
                cardPath={daily.post.imagePath}
                cardFileName={daily.post.imageFileName}
              />
            </div>
          </section>
        )}

        {/* the spin deck (Now Playing) sits right under the Daily hero —
            one click there starts the continuous queue; on other tabs it
            stays up top once something is playing */}
        {(tab === "spin" || started) && deck}

        {/* Music Videos preview — hand-picked songs, same MediaCard grid the
            Videos tab uses, just a taste of it up front. Clicking one makes
            it the new Now Playing anchor (see startItem's queue seeding). */}
        {tab === "spin" && songs.length > 0 && (
          <section id="videos" aria-label="Music Videos preview" style={{ marginBottom: 20 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 12px" }}>
              <span aria-hidden>🎬</span> Music Videos
            </p>
            <div style={grid}>
              {songs.slice(0, 6).map((i) => (
                <MediaCard key={i.id} item={i} />
              ))}
            </div>
            <button onClick={() => goTab("videos")} style={{ ...quietButton, width: "100%", marginTop: 14 }}>
              All videos →
            </button>
          </section>
        )}

        {/* the DJ's music: Faith Playlist on Apple Music, with one-tap
            filters for the other playlists */}
        {tab === "spin" && heroPlaylist && (
          <section id="music" aria-label="The Music" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 12px" }}>
              <span aria-hidden>🎶</span> The Music
            </p>
            <div style={{ ...optionGrid, marginBottom: 14 }}>
              {playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setHeroPlaylistId(p.id); track("playlist_open", { content_title: p.title }); }}
                  aria-pressed={heroPlaylistId === p.id}
                  style={pill(heroPlaylistId === p.id)}
                >
                  {p.shortTitle ?? p.title}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 17, fontWeight: 900, color: text, margin: "0 0 2px" }}>{heroPlaylist.title}</p>
            {heroPlaylist.summary && <p style={{ fontSize: 13.5, color: sub, margin: "0 0 12px", lineHeight: 1.55 }}>{heroPlaylist.summary}</p>}
            <iframe
              key={heroPlaylist.id}
              src={heroPlaylist.appleEmbed}
              title={heroPlaylist.title}
              allow="autoplay *; encrypted-media *;"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              style={{ width: "100%", height: 430, border: 0, borderRadius: 14, background: "transparent" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
              <a href={heroPlaylist.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                Open in Apple Music ↗
              </a>
              {heroPlaylist.spotifyAlt && (
                <a href={heroPlaylist.spotifyAlt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                  Prefer Spotify? ↗
                </a>
              )}
              {share(mediaShareTarget(heroPlaylist), "hero")}
            </div>
          </section>
        )}

        {/* navigation — a symmetric grid: three rows, every row full
            (8 tabs on 6 columns: 2-spans, then two 3-spans on the last row) */}
        <nav aria-label="Sections" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, maxWidth: 560, margin: "0 auto 26px" }}>
          {TABS.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              style={{
                gridColumn: idx < 6 ? "span 2" : "span 3",
                background: tab === t.id ? accent : card,
                border: `2px solid ${tab === t.id ? accent : border}`,
                borderRadius: 14,
                padding: "12px 6px",
                fontSize: 13.5,
                fontWeight: 800,
                cursor: "pointer",
                color: tab === t.id ? ink : sub,
                textAlign: "center",
              }}
            >
              <span aria-hidden>{t.emoji}</span> {t.label}
            </button>
          ))}
        </nav>

        {tab === "spin" && (
          <>
            <section id="sermons">
              <h2 style={sectionH}>✝️ Sermons</h2>
              <p style={sectionSub}>Tap a name and The DJ spins one of their messages — approved ministers, official channels only.</p>
              <div style={{ ...optionGrid, marginBottom: 30 }}>
                {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0).map((m) => (
                  <button key={m.key} onClick={() => spinMinistry(m.key)} style={pill(false)}>
                    {m.speaker}
                  </button>
                ))}
                <button onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, borderRadius: 50, padding: "10px 8px", fontSize: 13.5 }}>
                  🔀 Surprise me
                </button>
                <button onClick={() => goTab("sermons")} style={pill(false)}>
                  Browse all →
                </button>
              </div>
            </section>

            <section id="podcasts">
              <h2 style={sectionH}>🎙️ Podcasts</h2>
              <p style={sectionSub}>Bible-first shows — press play, they stream right here.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 12 }}>
                {podcasts.filter((p) => p.spotifyEmbed).map((p) => (
                  <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "16px 18px" }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "2px 0 0" }}>{p.author}</p>
                    {p.summary && <p style={{ fontSize: 13, color: sub, margin: "4px 0 0", lineHeight: 1.5 }}>{p.summary}</p>}
                    <iframe
                      src={p.spotifyEmbed}
                      title={p.title}
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      style={{ width: "100%", height: 232, border: 0, borderRadius: 12, marginTop: 12 }}
                    />
                    <div style={{ marginTop: 10 }}>{share(mediaShareTarget(p))}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => goTab("podcasts")} style={{ ...quietButton, width: "100%", marginBottom: 30 }}>
                All podcasts →
              </button>
            </section>

            {/* Digital DJ — a secondary discovery tool now that Daily
                Encouragement leads the page. Same card, just demoted. */}
            {digitalDjEnabled && (
              <section
                aria-label="Digital DJ"
                style={{ background: card, border: `2px solid ${activeBorder}`, borderRadius: 22, padding: "18px 20px", marginBottom: 30 }}
              >
                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 250px", minWidth: 0 }}>
                    <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 8px" }}>
                      <span className="djc-eq" aria-hidden>
                        <span /><span /><span /><span />
                      </span>
                      Digital DJ
                    </p>
                    <p style={{ fontSize: 21, fontWeight: 900, color: text, margin: "0 0 4px" }}>What should we play?</p>
                    <p style={{ fontSize: 13.5, color: sub, margin: "0 0 12px", lineHeight: 1.55 }}>
                      Choose your time and mood. The DJ will cue an approved session.
                    </p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {[
                        ["⏱", "5–60 min"],
                        ["💜", "9 moods"],
                        ["🎧", "Music · Videos · Sermons · Podcasts"],
                      ].map(([emoji, label]) => (
                        <span
                          key={label}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `2px solid ${border}`, borderRadius: 50, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: sub }}
                        >
                          <span aria-hidden>{emoji}</span> {label}
                        </span>
                      ))}
                    </div>
                    <a
                      href="/digital-dj"
                      onClick={() => track("digital_dj_homepage_click")}
                      style={{ display: "inline-block", background: accent, color: ink, borderRadius: 50, padding: "12px 24px", fontSize: 15, fontWeight: 900, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      🎛️ Cue my session
                    </a>
                  </div>
                  {/* A taste of the shelf: artwork from approved catalog records. */}
                  <div aria-hidden style={{ position: "relative", width: 150, height: 108, flexShrink: 0 }}>
                    {["song-my-jesus", "bg-seoul-1973", "song-way-maker"].map((id, i) => {
                      const item = LIBRARY.find((x) => x.id === id);
                      const art = item ? artworkUrl(item) : null;
                      if (!art) return null;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={id}
                          src={art}
                          alt=""
                          loading="lazy"
                          width={116}
                          height={65}
                          style={{
                            position: "absolute",
                            top: i * 16,
                            right: i * 14,
                            width: 116,
                            height: 65,
                            objectFit: "cover",
                            borderRadius: 10,
                            border: `2px solid ${border}`,
                            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <button onClick={() => goTab("churches")} className="pop" style={{ width: "100%", background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "18px 22px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Does your church stream on YouTube?</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: accent, flexShrink: 0 }}>⛪ Submit it →</span>
            </button>
          </>
        )}

        {tab === "music" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={sectionH}>Music</h2>
              <button onClick={() => { setCategory("playlist"); const p = spinPool({ category: "playlist" }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={bigButton}>
                🔀 Spin music
              </button>
            </div>
            <p style={sectionSub}>
              The DJ&apos;s own Apple Music playlists — worship, hymns, country, rap, workout — whole mixes, reviewed song
              by song. They stream right here with an Apple Music account (Spotify twins linked where they exist).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {playlists.map((p) => (
                <PlaylistCard key={p.id} p={p} />
              ))}
            </div>
            <button onClick={() => goTab("videos")} className="pop" style={{ width: "100%", background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "16px 20px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Want one song at a time instead?</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: accent, flexShrink: 0 }}>🎬 Videos →</span>
            </button>
          </>
        )}

        {tab === "videos" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={sectionH}>Music Videos</h2>
              <button onClick={() => { setCategory("music"); const p = spinPool({ category: "music", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={bigButton}>
                🔀 Spin videos
              </button>
            </div>
            <p style={sectionSub}>Hand-picked songs and music videos from official artist channels. Tap one and it plays right here.</p>
            <VibeChips />
            <div style={grid}>
              {vibeFiltered(songs).map((i) => (
                <MediaCard key={i.id} item={i} />
              ))}
            </div>
          </>
        )}

        {tab === "podcasts" && (
          <>
            <h2 style={sectionH}>Podcasts</h2>
            <p style={sectionSub}>Bible-first shows worth your commute. The Spotify ones play right here; the rest link to their official homes.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {podcasts.map((p) => (
                <div key={p.id} id={`djc-item-${p.id}`} className="pop" style={{ background: card, border: `2px solid ${current?.id === p.id && started ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "2px 0 0" }}>
                        {p.author}
                        {p.ministry ? ` · ${ministryByKey(p.ministry)?.name}` : ""}
                      </p>
                      {p.summary && <p style={{ fontSize: 13, color: sub, margin: "4px 0 0", lineHeight: 1.5 }}>{p.summary}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {p.spotifyEmbed ? (
                        <button onClick={() => startItem(p)} style={bigButton}>▶ Play here</button>
                      ) : (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, textDecoration: "none", display: "inline-block" }}>
                          Listen at the official home ↗
                        </a>
                      )}
                      {share(mediaShareTarget(p))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "sermons" && (
          <>
            <h2 style={sectionH}>Sermons</h2>
            <p style={sectionSub}>Approved ministers, official channels, Christ at the center. Pick one, or let The DJ spin.</p>
            <div style={{ ...optionGrid, marginBottom: 20 }}>
              <button onClick={() => setSermonMinistry(null)} aria-pressed={sermonMinistry === null} style={pill(sermonMinistry === null)}>
                All ministries
              </button>
              {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0).map((m) => (
                <button key={m.key} onClick={() => setSermonMinistry(sermonMinistry === m.key ? null : m.key)} aria-pressed={sermonMinistry === m.key} style={pill(sermonMinistry === m.key)}>
                  {m.speaker}
                </button>
              ))}
              <button onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe, ministry: sermonMinistry }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, borderRadius: 50, padding: "10px 8px", fontSize: 13.5 }}>
                🔀 Spin a sermon
              </button>
            </div>
            {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0 && (sermonMinistry === null || sermonMinistry === m.key)).map((m) => {
              const list = sermons.filter((s) => s.ministry === m.key);
              const open = expandedSermons[m.key] || sermonMinistry === m.key;
              const shown = open ? list : list.slice(0, 6);
              return (
                <section key={m.key} style={{ marginBottom: 30 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: text, margin: "0 0 2px" }}>{m.speaker}</h3>
                  <p style={{ fontSize: 13, color: sub, margin: "0 0 12px" }}>{m.name} · {list.length} messages</p>
                  <div style={grid}>
                    {shown.map((s) => (
                      <MediaCard key={s.id} item={s} />
                    ))}
                  </div>
                  {!open && list.length > shown.length && (
                    <button onClick={() => setExpandedSermons((e) => ({ ...e, [m.key]: true }))} style={{ ...quietButton, width: "100%", marginTop: 12 }}>
                      Show all {list.length} from {m.speaker} →
                    </button>
                  )}
                </section>
              );
            })}
          </>
        )}

        {tab === "ministries" && (
          <>
            <h2 style={sectionH}>Trusted Ministries</h2>
            <p style={sectionSub}>
              The teaching on The DJ Cares comes from these ministries — official channels only, selected for Christ-centered,
              Scripture-rooted, encouraging teaching.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {MINISTRIES.map((m) => {
                const counts = ministryCounts(m);
                return (
                  <div key={m.key} id={`djc-ministry-${m.key}`} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
                    <p style={{ fontSize: 17, fontWeight: 900, color: text, margin: 0 }}>{m.name}</p>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: accent, margin: "2px 0 6px" }}>{m.speaker}</p>
                    <p style={{ fontSize: 13.5, color: sub, margin: "0 0 10px", lineHeight: 1.55 }}>{m.purpose}</p>
                    {(counts.sermons > 0 || counts.podcasts > 0) && (
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: sub, margin: "0 0 12px" }}>
                        On The DJ Cares:{" "}
                        {[
                          counts.sermons > 0 ? `${counts.sermons} sermon${counts.sermons > 1 ? "s" : ""}` : null,
                          counts.podcasts > 0 ? `${counts.podcasts} podcast${counts.podcasts > 1 ? "s" : ""}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {counts.sermons > 0 && (
                        <button onClick={() => spinMinistry(m.key)} style={{ ...bigButton, padding: "11px 20px", fontSize: 14 }}>
                          🔀 Spin a message
                        </button>
                      )}
                      <a href={m.officialUrl} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, padding: "10px 16px", fontSize: 13.5, textDecoration: "none", display: "inline-block" }}>
                        Official site ↗
                      </a>
                      {m.youtubeUrl && (
                        <a href={m.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, padding: "10px 16px", fontSize: 13.5, textDecoration: "none", display: "inline-block" }}>
                          Official YouTube ↗
                        </a>
                      )}
                      {share(ministryShareTarget(m))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "churches" && (
          <>
            <h2 style={sectionH}>Local Churches</h2>
            <p style={sectionSub}>
              Does your church stream on YouTube? Submit its official channel for review. Approved churches are added to
              The DJ Cares so people can find a live service or a recent message.
            </p>

            {APPROVED_CHURCHES.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 26 }}>
                {APPROVED_CHURCHES.map((c) => (
                  <div key={c.id} id={`djc-church-${c.id}`} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{c.name}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: sub, margin: "2px 0 8px" }}>
                      {c.city}, {c.region} · {c.country}
                    </p>
                    {c.serviceTimes && (
                      <p style={{ fontSize: 13, color: sub, margin: "0 0 10px" }}>
                        Normally streams: {c.serviceTimes}
                        {c.timezone ? ` (${c.timezone})` : ""}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {c.liveUrl && (
                        <a href={c.liveUrl} target="_blank" rel="noopener noreferrer" style={{ ...bigButton, padding: "11px 20px", fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                          Watch live ↗
                        </a>
                      )}
                      <a href={c.youtubeUrl} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, padding: "10px 16px", fontSize: 13.5, textDecoration: "none", display: "inline-block" }}>
                        Official channel ↗
                      </a>
                      <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, padding: "10px 16px", fontSize: 13.5, textDecoration: "none", display: "inline-block" }}>
                        Website ↗
                      </a>
                      {share(churchShareTarget(c))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: card, border: `2px dashed ${border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 26, textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: text, margin: 0 }}>Approved churches will appear here.</p>
                <p style={{ fontSize: 13, color: sub, margin: "4px 0 0" }}>Every submission is reviewed by hand first — yours could be the first one listed.</p>
              </div>
            )}

            <h3 style={{ fontSize: 18, fontWeight: 900, color: text, margin: "0 0 12px" }}>Submit your church</h3>
            <ChurchSubmitForm card={card} border={border} text={text} sub={sub} />
          </>
        )}

        {tab === "about" && (
          <>
            <h2 style={sectionH}>About The DJ Cares</h2>
            <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", marginBottom: 16 }}>
              <p style={{ fontSize: 15, color: text, margin: 0, lineHeight: 1.7 }}>
                The DJ Cares is a curated place for encouraging Christian music and media. Everything here was selected by
                hand — Gospel first, built to point people toward Jesus — not dumped onto the page by an algorithm. Choose a
                category, press play, and let The DJ spin something good.
              </p>
              <p style={{ fontSize: 14, color: sub, margin: "12px 0 0", lineHeight: 1.7 }}>
                It&apos;s part of the{" "}
                <a href="https://openmirrorllc.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 800, textDecoration: "none" }}>
                  Open Mirror
                </a>{" "}
                family, and shares a heart with{" "}
                <a href="https://crossheartpray.com" target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 800, textDecoration: "none" }}>
                  CrossHeartPray
                </a>
                {" "}— no account needed for either.
              </p>
            </div>

            <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, margin: "0 0 8px" }}>
                💌 Request something
              </p>
              <p style={{ fontSize: 14, color: sub, margin: "0 0 14px", lineHeight: 1.65 }}>
                Have a song, sermon, podcast, or playlist that encourages you? Send it over. Everything is reviewed against
                Scripture before it's added — Jesus first, Scripture the test.
              </p>
              <a href={REQUEST_MAILTO} style={{ ...bigButton, textDecoration: "none", display: "inline-block", padding: "12px 24px", fontSize: 14.5 }}>
                💌 Send a request
              </a>
              <p style={{ fontSize: 12.5, color: sub, margin: "10px 0 0" }}>Opens your email app with a ready-to-fill template to ask@openmirrorllc.com.</p>
            </div>

            <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: sub, margin: "0 0 8px" }}>
                The plain print
              </p>
              <p style={{ fontSize: 13, color: sub, margin: 0, lineHeight: 1.7 }}>
                The DJ Cares doesn&apos;t own the third-party music, videos, sermons, podcasts, ministry names, artwork, or
                platform players featured here — ownership stays with their creators and publishers. Embedded and linked
                material comes from official or believed-to-be-authorized sources, and unavailable or changed content may be
                removed. Including a creator or ministry doesn&apos;t mean agreement with every statement they&apos;ve ever
                made. Embedded platforms control their own players and any advertising. Church submissions are reviewed by
                hand, and submission doesn&apos;t guarantee inclusion.
              </p>
            </div>
          </>
        )}
      </div>

      <ShareSheet
        target={shareTarget}
        triggerId={shareTriggerId}
        palette={sharePalette}
        onClose={() => setShareTarget(null)}
      />
    </main>
  );
}
