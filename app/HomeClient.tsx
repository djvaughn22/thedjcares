"use client";

// The DJ Cares — a digital DJ for Christian media.
// Choose a category. Press play. Let The DJ Cares spin something good.
//
// Everything playable comes from the approved library in
// app/lib/djCaresLibrary.ts. The shuffle (app/lib/spin.ts) never leaves it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DJPlayer, { type DJPlayerHandle } from "./components/DJPlayer";
import ChurchSubmitForm from "./components/ChurchSubmitForm";
import ShareSheet, { ShareTrigger } from "./components/ShareMenu";
import VolumeControl from "./components/VolumeControl";
import SyncedAudio from "./components/SyncedAudio";
import FilterDisclosure from "./components/FilterDisclosure";
import MediaSwitcher, { mediaPanelId, mediaTabId, type MediaTab } from "./components/MediaSwitcher";
import {
  APPROVED_CHURCHES,
  artworkUrl,
  getEmbedUrl,
  getWatchUrl,
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
  nextPlayableIndex,
  QUEUE_MOODS,
  resolveQueue,
  savePrefs,
  saveSession,
  volumeFromMuteToggle,
  volumeFromSlider,
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
import { buildVideoQueueFrom, reorderUpcoming, shouldStopAtQueueEnd } from "./lib/mainQueue";
import { eligibleVideosOfTheDay } from "./lib/videoOfTheDay";

const TABS = [
  { id: "spin", label: "Home", emoji: "🏠" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "podcasts", label: "Podcasts", emoji: "🎙️" },
  { id: "sermons", label: "Sermons", emoji: "✝️" },
  { id: "ministries", label: "Ministries", emoji: "🏛️" },
  { id: "churches", label: "Churches", emoji: "⛪" },
] as const;

type Tab = (typeof TABS)[number]["id"];

// The category nav is two tiers, not one flat wall of equal-weight pills:
// the four things you actually browse/play lead; Home (a return, not an
// action) and the two supporting discovery sections (Ministries, Churches
// point off-site — they aren't playback categories) sit below, lighter.
const PRIMARY_TAB_IDS: readonly Tab[] = ["music", "videos", "podcasts", "sermons"];
const SECONDARY_TAB_IDS: readonly Tab[] = ["spin", "ministries", "churches"];

// The whole page content column is one CSS flex column (see the return
// below) — every top-level section carries an explicit `order` so the
// listener always sees the SAME layout regardless of DOM source position.
// This is what lets the one stable-position persistent player (see
// activePlayerNode/playerOrder) visually land at the right spot for
// whichever tab is active without ever being reparented: `order` is a pure
// paint-order CSS property, so the underlying DJPlayer/SyncedAudio/embed
// iframe never moves in the actual DOM tree, just where it's painted.
//
// Home ("spin"): Intro, Video of the Day, Daily Encouragement, The Music,
// category tabs, then the rest of Home's own content — the nav never
// appears above the hero, and the player (when full) sits at whichever
// widget (hero/Daily/Music) actually owns what's playing, never as a
// separate generic block leading everything.
const HOME_ORDER = {
  intro: 10,
  hero: 20,
  daily: 30,
  music: 40,
  nav: 50,
  musicVideosPreview: 60,
  rest: 70,
} as const;

// Every other tab: Intro, category tabs, that tab's own heading/
// description/filters, the full player (only when it's actually natural
// for that tab — see isNaturalTab), then that tab's own library/cards.
const BROWSE_ORDER = {
  intro: 10,
  nav: 20,
  heading: 30,
  player: 40,
  cards: 50,
} as const;

export default function TheDJCaresPage({
  digitalDjEnabled = true,
  dailyPick: initialDailyPick = null,
  videoOfTheDay = null,
}: {
  digitalDjEnabled?: boolean;
  // The Daily Encouragement card's starting pick — always isPlayable()
  // (see app/lib/homeDailyPick.ts), so "Play here" is guaranteed on load.
  // Independent from /today's full-library rotation.
  dailyPick?: MediaItem | null;
  // The hero record's own pick — always a real music video, completely
  // independent from Daily Encouragement (see app/lib/videoOfTheDay.ts).
  videoOfTheDay?: MediaItem | null;
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
  // --- main (Video of the Day → Videos) continuous queue state ---
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
  // Native audio doesn't report play/pause through props like DJPlayer
  // does — this ref reaches the real <audio> element (SyncedAudio forwards
  // its ref) so the mini-player's own Play/Pause button can call
  // .play()/.pause() directly, and this state (kept in sync via the
  // element's native "play"/"pause" events) drives that button's icon.
  const podcastAudioRef = useRef<HTMLAudioElement>(null);
  const [audioPlayingState, setAudioPlayingState] = useState(false);
  const toggleAudioPlayback = () => {
    const el = podcastAudioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };
  // Whether the compact mini-player has been expanded into the full-size
  // overlay sheet — only meaningful off the natural tab; reset below
  // whenever the listener returns to a tab where the full player already
  // shows inline.
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const onEndedInProgressRef = useRef(false); // Prevent re-entrance
  // Which item the (single, page-level) share sheet is open for.
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTriggerId, setShareTriggerId] = useState<string | null>(null);
  // The record shop window: which of the DJ's Apple Music playlists is open
  // up top. Faith Playlist leads (share deep links can pick another).
  const [heroPlaylistId, setHeroPlaylistId] = useState("apple-faith-playlist");
  // The hero record's own pick — starts as today's Video of the Day, but
  // Shuffle can swap it for another eligible video without touching
  // playback at all (see shuffleHeroVideo below). Independent of `current`
  // until the hero item is actually played.
  const [heroVideo, setHeroVideo] = useState<MediaItem | null>(videoOfTheDay);
  // The Daily Encouragement card's own pick — starts as today's official
  // rotation, but Spin can swap it for another sermon/podcast that's
  // actually inline-playable (today's official pick can land on a
  // link-out-only item; this is the escape hatch, mirroring heroVideo/
  // shuffleHeroVideo above).
  const [dailyPick, setDailyPick] = useState<MediaItem | null>(initialDailyPick);
  // The Music deck's own featured/cued pick — which of the DJ's Apple Music
  // playlists is shown on the Home widget. Independent of `current` until
  // the widget's own Play button is pressed (same heroVideo/heroDisplayItem
  // pattern the hero uses) — Choose a mix / Another mix just re-cue this,
  // they never touch playback.
  const [tuneSpinOpen, setTuneSpinOpen] = useState(false);
  const [chooseMixOpen, setChooseMixOpen] = useState(false);
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
  const SECTION_IDS = ["video-of-the-day", "daily-encouragement", "now-playing", "videos", "music", "sermons", "podcasts"];

  // URL hash ↔ page state. Two namespaces share one hash string:
  //  - bare section names (#videos, #music, #sermons, #podcasts, plus
  //    #video-of-the-day / #daily-encouragement / #now-playing) scroll to a
  //    homepage section;
  //  - "#tab-<id>" switches to that exclusive browsing tab (written by
  //    goTab below, so reload/back-forward lands back on the right tab
  //    instead of bouncing to its same-named homepage section).
  // Bare legacy tab ids (e.g. #about, #ministries, #churches) still switch
  // tabs directly, for old links that predate the tab-* scheme.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "");
      // About is a real route now, not a tab — send old #about/#tab-about
      // links to the canonical page instead of landing nowhere.
      if (h === "about" || h === "tab-about") {
        window.location.replace("/about");
        return;
      }
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
      if (TABS.some((t) => t.id === h)) {
        setTab(h as Tab);
        return;
      }
      // Empty hash — either the initial load, or Back/Forward has traversed
      // past every #tab-* entry this session pushed. Either way that's Home.
      if (h === "") setTab("spin");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pushState (not replaceState) so category selection is a real, traversable
  // history entry — Back/Forward changes the selected category (via the
  // hashchange listener above re-deriving `tab` from the URL) without a full
  // reload, and without ever unmounting the persistent player, which lives
  // outside this tab switch entirely.
  const goTab = (t: Tab) => {
    setTab(t);
    window.history.pushState(null, "", t === "spin" ? window.location.pathname : `#tab-${t}`);
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
    // Default cue: today's Video of the Day — the hero's whole reason to
    // arrive. No deep link, no saved session? Lead with it.
    setCurrent(videoOfTheDay ?? LIBRARY.find((i) => i.featured && i.type === "music") ?? LIBRARY[0]);
  }, [videoOfTheDay]);

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
    // new continuous-playback anchor: any playable video (Video of the Day
    // included — it's always a music item with a videoId) seeds a fresh
    // queue of it + the rest of the video catalog so playback keeps going
    // after it ends. Anything else (a sermon, a podcast, a playlist) drops
    // any active main queue.
    if (!inMoodMix && !fromMainQueue) {
      if (item.type === "music" && item.videoId) {
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
  }, [moodQueue, pool.length, sessionHistory]);

  // "Put another record on" — swaps which video is cued on the hero platter.
  // Reuses the same never-repeat-recent pickNext the rest of the page's
  // shuffle already relies on, scoped to the Video of the Day eligible pool.
  // Never touches current/started/playerState, so playback (if anything
  // unrelated is playing) and the hero's own record view are untouched.
  const shuffleHeroVideo = useCallback(() => {
    const eligible = eligibleVideosOfTheDay();
    const next = pickNext(eligible, historyRef.current);
    if (next) {
      setHeroVideo(next);
      track("hero_shuffle", { content_title: next.title });
    }
  }, []);

  // "Tune the spin" → Vibe chip: picks and immediately plays another
  // official music video matching that vibe — reuses the exact same
  // spinPool/pickNext machinery as every other spin on the page, just
  // scoped to category "videos" (music videos only, never a sermon,
  // podcast, playlist, or audio-only upload).
  const spinVideoByVibe = useCallback((v: Vibe) => {
    const p = spinPool({ category: "videos", vibe: v }).filter((i) => !unavailable.has(i.id));
    const next = pickNext(p, historyRef.current);
    if (next) {
      setHeroVideo(next);
      startItem(next, true);
      track("hero_vibe_spin", { vibe: v, content_title: next.title });
    }
  }, [unavailable, startItem]);

  // Daily Encouragement's own "spin" — entirely local to this card. Picks
  // another sermon or podcast that's actually inline-playable (spinPool
  // already filters to isPlayable()), so Play here always works right
  // away, unlike the official daily rotation which can land on a
  // link-out-only item. The current pick is filtered OUT of the pool
  // before picking — a deterministic exclusion, not a hope that
  // pickNext's randomness happens to avoid it — so with more than one
  // eligible item, the pick always changes. Stops/resets this card's own
  // player (never the shared deck) and never autoplays the new pick.
  const spinDailyPick = useCallback(() => {
    const pool = [...spinPool({ category: "sermon" }), ...spinPool({ category: "podcast" })].filter(
      (i) => !unavailable.has(i.id) && i.id !== dailyPick?.id,
    );
    if (pool.length === 0) return; // nothing else eligible to spin to
    const next = pickNext(pool, historyRef.current);
    if (next) {
      setDailyPick(next);
      track("daily_spin", { content_type: next.type, content_title: next.title });
    }
  }, [unavailable, dailyPick]);

  // The Music deck's own "spin" — swaps to a different Apple Music
  // playlist, excluding the one currently shown, and collapses back to
  // the compact cover-art preview (no autoplay of the new pick). Entirely
  // local, same as Daily Encouragement's spin — never touches
  // current/started.
  const spinMusicMix = useCallback(() => {
    const others = itemsOfType("playlist").filter((p) => p.id !== heroPlaylistId);
    if (others.length === 0) return;
    const next = pickNext(others, historyRef.current);
    if (next) {
      setHeroPlaylistId(next.id);
      track("music_spin", { content_title: next.title });
    }
  }, [heroPlaylistId]);

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

  // Advance the main (Video of the Day → Videos) queue. Returns false if
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

  // The volume the listener last set above zero — remembered so Unmute has
  // something real to restore to even after the slider itself was dragged
  // down to zero (which clears prefs.volume; see volumeFromSlider).
  const lastNonZeroVolumeRef = useRef(prefs.volume > 0 ? prefs.volume : DEFAULT_PREFS.volume);
  useEffect(() => {
    if (prefs.volume > 0) lastNonZeroVolumeRef.current = prefs.volume;
  }, [prefs.volume]);

  const setVolumeFromSlider = (value: number) => updatePrefs(volumeFromSlider(value));
  const toggleMute = () => updatePrefs(volumeFromMuteToggle(prefs, lastNonZeroVolumeRef.current));

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

  // One volume look everywhere: the shared prefs drive it, the pure
  // volumeFromSlider/volumeFromMuteToggle helpers (moodQueue.ts) decide
  // what a change means.
  const volumePalette = { text, sub, border, accent };
  const volumeControl = (idPrefix: string) => (
    <VolumeControl
      idPrefix={idPrefix}
      volume={prefs.volume}
      muted={prefs.muted}
      onVolumeChange={setVolumeFromSlider}
      onMuteToggle={toggleMute}
      palette={volumePalette}
    />
  );
  // Spotify/Apple embeds run their own playback in a cross-origin iframe —
  // there's no documented, reliable API to drive their volume from here,
  // so instead of a fake control that can't do anything, this just tells
  // the listener where the real one lives.
  const embedVolumeNote = (
    <p role="note" style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: sub, margin: "10px 0 0" }}>
      🔊 Volume is controlled inside this player.
    </p>
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

  // One playlist card, artwork and all — a selector, not its own player:
  // pressing Play routes through the same startItem pipeline every other
  // pick on the page uses, which renders the real Apple embed in the one
  // persistent player (podcastPanelNode). No iframe mounted here — a
  // browse grid of several of these never means several playing at once.
  const PlaylistCard = ({ p }: { p: MediaItem }) => {
    const isCurrent = current?.id === p.id && started;
    return (
      <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
        {isCurrent && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: accent, textTransform: "uppercase", marginBottom: 6 }}>
            {playerState === "playing" && (
              <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
            )}
            Now Spinning
          </span>
        )}
        <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
        {p.summary && <p style={{ fontSize: 13, color: sub, margin: "3px 0 0" }}>{p.summary}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
          {isCurrent ? (
            <span style={{ fontSize: 12.5, fontWeight: 800, color: sub }}>▶ Playing in the player above ↑</span>
          ) : (
            <button onClick={() => startItem(p)} style={bigButton}>▶ Play here</button>
          )}
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
  };

  // --- the deck (Now Spinning) ---

  const deckPoolEmpty = pool.length === 0;
  const showVideo = started && current?.videoId;
  // Direct audio URL wins over a provider embed when both exist — a native
  // <audio> element is simpler and more accessible than embedding a whole
  // provider page. This is the exact same "Play here" path the Podcasts
  // tab already uses (spotifyEmbed/appleEmbed → startItem → this render),
  // just extended with one more source type.
  const showAudio = Boolean(started && current && !current.videoId && current.audioUrl);
  const showEmbed = Boolean(started && current && !current.videoId && !current.audioUrl && (current.spotifyEmbed || current.appleEmbed));
  // True whenever a real music video is what's actually playing right now —
  // the Video of the Day pick, a Shuffle stand-in, or any other music
  // video started from elsewhere on the page (a Music Videos preview
  // card, a mood mix in "videos" mode, a vibe spin). ALL of those are the
  // same "Video Deck" experience, merged into the hero: the deck below
  // never renders a second video player, and the hero always reflects
  // whichever video is actually current instead of only ever showing its
  // own originally-cued pick. False for anything that isn't a video.
  const isHeroCurrent = Boolean(current && current.type === "music" && current.videoId);
  // What the hero actually displays: the live video once one is playing,
  // otherwise the cued (Shuffle-changeable) pick.
  const heroDisplayItem = isHeroCurrent && current ? current : heroVideo;
  // Whether Daily Encouragement's own cued pick is what's actually playing
  // in the one persistent player right now — same isHeroCurrent pattern,
  // just keyed on id instead of type, since dailyPick spans every media
  // type (video, audio, embed).
  const dailyIsCurrent = Boolean(started && current && dailyPick && current.id === dailyPick.id);

  // Which category tabs are the "natural home" for whatever `current` is.
  // Home ("spin") always qualifies — it hosts the hero/Daily/Music widgets
  // covering every media type — plus the one browsing tab that matches
  // current's own category. Used to decide whether the persistent player
  // renders full-size, leading that tab's own content, or collapses into
  // the compact mini-player bar because the listener has navigated away
  // from any section related to what's actually playing (e.g. a video
  // playing while browsing Podcasts).
  const naturalTabsForCurrent: readonly Tab[] | null = !current
    ? null
    : isHeroCurrent
      ? ["spin", "videos"]
      : current.type === "sermon"
        ? ["spin", "sermons"]
        : current.type === "podcast"
          ? ["spin", "podcasts"]
          : current.type === "playlist"
            ? ["spin", "music"]
            : ["spin"];
  const isNaturalTab = !started || !current || (naturalTabsForCurrent?.includes(tab) ?? true);
  // full: inline, normal document flow, leading whichever tab is natural.
  // mini: collapsed to the compact bottom bar (off the natural tab).
  // overlay: the mini-player's own Expand control, showing the full player
  // as a sheet without navigating tabs or touching current/started/playing.
  const playerDisplayMode: "full" | "mini" | "overlay" = isNaturalTab ? "full" : playerExpanded ? "overlay" : "mini";

  // Both media slots below are size-aware, not mode-aware in *structure* —
  // "mini"/"overlay"/"full" only ever change style values (size, whether
  // native audio controls show) on the exact same DJPlayer/SyncedAudio/
  // iframe element, at the exact same position in the tree. That's what
  // keeps the provider mounted (never unmounted, never reparented) as the
  // mini-player expands, collapses, or the listener changes tabs — see
  // activePlayerNode below, where this is the ONLY place either renders.
  const isMiniSlot = playerDisplayMode === "mini";

  // The actual inline audio/embed element for whatever podcast/sermon is
  // current — including a Daily Encouragement pick, now that its Play
  // action routes through the same startItem pipeline as everything else
  // (see the Daily Encouragement section below). autoPlay so pressing
  // "Play here" anywhere (Podcasts tab, Daily Encouragement) starts sound
  // immediately, same as DJPlayer's `playing` prop does for video. Native
  // controls are hidden in the mini slot (the mini-player draws its own
  // compact Play/Pause/Mute instead) by visually shrinking the element to
  // 1px — never display:none, so playback is never interrupted — rather
  // than removing the `controls` attribute (some browsers still show a
  // native affordance at zero size, so shrinking is the reliable one).
  const podcastPanelNode = (showAudio || showEmbed) && (
    <div style={{ marginTop: isMiniSlot ? 0 : 12 }}>
      {showAudio ? (
        <SyncedAudio
          ref={podcastAudioRef}
          controls
          autoPlay
          preload="none"
          src={current!.audioUrl}
          volume={prefs.volume}
          muted={prefs.muted}
          onPreferenceChange={updatePrefs}
          style={
            isMiniSlot
              ? { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }
              : { width: "100%" }
          }
        >
          Your browser doesn&apos;t support inline audio —{" "}
          <a href={current!.url} target="_blank" rel="noopener noreferrer">listen at the source</a>.
        </SyncedAudio>
      ) : (
        <>
          <iframe
            src={getEmbedUrl(current!)!}
            title={current!.title}
            allow="autoplay *; encrypted-media *; clipboard-write"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            style={
              isMiniSlot
                ? { width: 52, height: 52, border: 0, borderRadius: 10, overflow: "hidden", background: "transparent" }
                : { width: "100%", height: current!.spotifyEmbed ? 352 : 450, border: 0, borderRadius: 14, overflow: "hidden", background: "transparent" }
            }
          />
          {!isMiniSlot && embedVolumeNote}
        </>
      )}
    </div>
  );

  // The actual inline video element — the one persistent instance for
  // whatever's current, whether it's a music video (the old hero-only
  // case) or any other video (a sermon with a videoId, etc). Rendered once,
  // at a single stable position in activePlayerNode below (never nested
  // inside a tab-conditional section), so switching category tabs never
  // unmounts it. Shrinks to a thumbnail in the mini slot via style only —
  // DJPlayer itself (position:absolute; inset:0) fills whatever size this
  // wrapper is, so resizing it never touches the DJPlayer/YouTube iframe's
  // own mount.
  const videoPanelNode = showVideo && !blocked && (
    <div
      className={isMiniSlot ? undefined : "djc-daily-video-enter"}
      style={
        isMiniSlot
          ? { position: "relative", width: 52, height: 52, flexShrink: 0, background: "#000", borderRadius: 10, overflow: "hidden" }
          : { position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }
      }
    >
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
  );

  // Blocked-video recovery, continuous-queue status, and the shared
  // transport row (Prev/Next/Play-Pause/Shuffle/Repeat/Spin Something
  // Else/Share/Volume) — the one authoritative transport for whatever
  // `current` is, video included. This used to be excluded from the hero's
  // own video (which had its own duplicate Play/Pause/Share) — now that the
  // hero never embeds a player of its own (see the Video of the Day
  // section), this is the only transport control for any media, anywhere.
  const transportPanel = (
    <>
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

      {mainQueue && !moodQueue && (
        <p role="status" style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: sub, margin: "12px 0 0" }}>
          {mainQueue.position + 1 < mainQueue.queue.length
            ? `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — up next: ${mainQueue.queue[mainQueue.position + 1].title}`
            : mainRepeat
              ? `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — Repeat is on, back to the top after this`
              : `Video ${mainQueue.position + 1} of ${mainQueue.queue.length} — last one queued`}
        </p>
      )}

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
      </div>
      {(showVideo || showAudio) && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          {volumeControl("djc-transport-volume")}
        </div>
      )}
    </>
  );

  // Which widget "owns" whatever's current — drives the label so this
  // never reads as a generic, unrelated "mixer": the video hero, Daily
  // Encouragement, or a plain type label for anything picked straight off
  // a browsing tab.
  const originIcon = isHeroCurrent ? "📀" : dailyIsCurrent ? "🌅" : current?.type === "sermon" ? "✝️" : current?.type === "podcast" ? "🎙️" : current?.type === "playlist" ? "🎶" : "🎧";
  const originLabel = isHeroCurrent ? "Music Video" : dailyIsCurrent ? "Daily Encouragement" : current ? typeLabel(current) : "";

  // The one persistent player shell — the SAME mounted instance for
  // whatever `current` is (a music video, any other video, a podcast/
  // sermon's native audio, or a provider embed). Rendered at a single
  // stable position in the tree (right after the category tabs, before the
  // per-tab content switch — see the return below), never nested inside a
  // tab==="..." conditional, so selecting Music/Videos/Sermons/Podcasts
  // never unmounts or recreates it.
  //
  // Three visual modes, ONE unchanging JSX shape — only style values and
  // which chrome is shown differ; the media slot below always sits at the
  // exact same position in the exact same wrapper elements, so
  // DJPlayer/SyncedAudio/the embed iframe is never unmounted or
  // reparented switching between them:
  //  - "full": normal document flow, leading whichever tab is natural for
  //    `current` (including Home, which is natural for every type).
  //  - "mini": collapsed to a compact fixed bottom bar when the listener
  //    has navigated away from any natural section — playback keeps going,
  //    just out of the way.
  //  - "overlay": the mini-player's own Expand control — the full chrome
  //    as a bottom sheet, without touching `tab`/current/started/playing.
  // zIndex stays below OpenMirrorNav's sticky top header (zIndex 50/60, see
  // app/OpenMirrorNav.tsx) so the family header always wins if they ever
  // overlap, and well below ShareSheet's modal (zIndex 1000) so Share still
  // opens on top of either player state.
  //
  // Visual position when "full": the page's whole content column is one
  // CSS flex column (see the return below), and every top-level section
  // carries an explicit `order` — this is what lets the ONE stable-position
  // player (still rendered from this single JSX call site, still never
  // reparented) visually land wherever it belongs for the current tab
  // instead of always leading. On Home that's right at whichever widget
  // (hero/Daily/Music) actually owns what's playing; on a browsing tab
  // that's between its heading/filters and its own card grid. `order` is a
  // pure paint-order property — it never moves the underlying DOM node, so
  // this changes nothing about how DJPlayer/SyncedAudio/the embed iframe
  // stays mounted (see HOME_ORDER below for the full scheme).
  const playerOrder =
    tab === "spin"
      ? isHeroCurrent
        ? HOME_ORDER.hero
        : current?.type === "sermon" || current?.type === "podcast"
          ? HOME_ORDER.daily
          : current?.type === "playlist"
            ? HOME_ORDER.music
            : HOME_ORDER.hero
      : BROWSE_ORDER.player;
  const playerOuterStyle: React.CSSProperties =
    playerDisplayMode === "mini"
      ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45 }
      : playerDisplayMode === "overlay"
        ? { position: "fixed", inset: 0, zIndex: 46, background: "rgba(8,12,20,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }
        : { position: "static", order: playerOrder };
  const playerInnerStyle: React.CSSProperties =
    playerDisplayMode === "mini"
      ? { background: card, borderTop: `2px solid ${border}`, padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -4px 20px rgba(0,0,0,0.25)" }
      : playerDisplayMode === "overlay"
        ? { background: card, borderRadius: "22px 22px 0 0", padding: "16px 20px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", width: "100%", maxWidth: 760, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.4)" }
        : { background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 28 };

  const activePlayerNode = (
    <div
      style={playerOuterStyle}
      onClick={playerDisplayMode === "overlay" ? () => setPlayerExpanded(false) : undefined}
    >
      <div
        ref={playerDisplayMode === "full" ? deckRef : undefined}
        id="now-playing"
        role="region"
        aria-label={playerDisplayMode === "mini" ? "Now playing (compact)" : originLabel || "Now playing"}
        style={playerInnerStyle}
        onClick={playerDisplayMode === "overlay" ? (e) => e.stopPropagation() : undefined}
      >
        <div aria-live="polite" className="djc-sr-only">{announce}</div>

        {playerDisplayMode === "overlay" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setPlayerExpanded(false)} aria-label="Close player" style={{ ...quietButton, minHeight: 44 }}>
              ✕ Close
            </button>
          </div>
        )}

        {playerDisplayMode !== "mini" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <p style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, margin: 0 }}>
              <span aria-hidden>{originIcon}</span> {originLabel}
              {playerState === "playing" && (
                <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
              )}
            </p>
            {current && <span style={{ fontSize: 12, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em" }}>{typeLabel(current)}</span>}
          </div>
        )}

        <div style={playerDisplayMode === "mini" ? { display: "flex", alignItems: "center", gap: 12 } : undefined}>
          <div style={playerDisplayMode === "mini" ? { flexShrink: 0 } : undefined}>
            {videoPanelNode}
            {podcastPanelNode}
          </div>

          {playerDisplayMode === "mini" ? (
            <>
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {current?.title}
                </p>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span aria-hidden>{originIcon}</span> {originLabel}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                {showEmbed ? (
                  // No reliable API to control a Spotify/Apple embed from
                  // here (see the honest volume note below) — a plain label
                  // instead of a Play/Pause/Mute button that can't do
                  // anything.
                  <span style={{ fontSize: 11, fontWeight: 700, color: sub, padding: "0 8px" }}>
                    via {current?.spotifyEmbed ? "Spotify" : "Apple Music"}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={showVideo ? () => setPlaying(playerState !== "playing") : toggleAudioPlayback}
                      aria-label={(showVideo ? playerState === "playing" : audioPlayingState) ? "Pause" : "Play"}
                      style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: text }}
                    >
                      {(showVideo ? playerState === "playing" : audioPlayingState) ? "⏸" : "▶"}
                    </button>
                    <button
                      onClick={toggleMute}
                      aria-label={prefs.muted ? "Unmute" : "Mute"}
                      style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", fontSize: 18, cursor: "pointer", color: text }}
                    >
                      {prefs.muted ? "🔇" : "🔊"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPlayerExpanded(true)}
                  aria-label="Expand player"
                  style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", fontSize: 18, cursor: "pointer", color: text }}
                >
                  ⌃
                </button>
              </div>
            </>
          ) : (
            <>
              {current && !blocked && (
                <div style={{ textAlign: "center", margin: "14px 0 0" }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: text, margin: 0 }}>{current.title}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: accent, margin: "2px 0 0" }}>
                    {current.author}
                    {current.ministry ? ` · ${ministryByKey(current.ministry)?.name}` : ""}
                  </p>
                </div>
              )}
              {transportPanel}
            </>
          )}
        </div>
      </div>
    </div>
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
  // Whether the Music widget's featured playlist is what's actually
  // current — same dailyIsCurrent pattern (see above).
  const musicIsCurrent = Boolean(started && current && heroPlaylist && current.id === heroPlaylist.id);
  // Video of the Day is always a real music video (see videoOfTheDay.ts's
  // eligibility filter: type "music" + a real videoId), so — unlike Daily
  // Encouragement — it never needs a branded-fallback label or an
  // open-the-source escape hatch. It always has real artwork and always
  // plays inline. isHeroStarted/isHeroPlaying are false whenever something
  // else entirely is playing, so the hero shows its own idle record instead
  // of borrowing another item's playback state.
  const isHeroStarted = isHeroCurrent && started;
  const isHeroPlaying = isHeroCurrent && playerState === "playing";

  // Once the listener is back on a tab where the full player already shows
  // inline, an expanded mini-player sheet has nothing left to add — collapse
  // it automatically so it doesn't linger stuck open over the wrong tab.
  useEffect(() => {
    if (isNaturalTab) setPlayerExpanded(false);
  }, [isNaturalTab]);

  // Mirror the real <audio> element's own play/pause state (native controls
  // are hidden in the mini-player, replaced by our own button) — reattaches
  // whenever the underlying element could be a different one (a new current
  // audio pick).
  useEffect(() => {
    const el = podcastAudioRef.current;
    if (!el) return;
    const onPlay = () => setAudioPlayingState(true);
    const onPause = () => setAudioPlayingState(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    setAudioPlayingState(!el.paused);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [current?.id, showAudio]);

  // Cross-card exclusivity used to need a separate activeDeck coordinator
  // because Daily Encouragement and the Music widget each kept their own
  // local "am I playing" state, entirely apart from `current`. Now that
  // both route every Play action through the same startItem pipeline as
  // everything else (see the Daily Encouragement and Music sections
  // below), `current`/`started`/`playing` already ARE the one source of
  // truth — starting anything new simply replaces `current`, which is by
  // construction never more than one item at a time. Nothing left to
  // coordinate.

  // The mini-player is position:fixed (out of normal flow) — reserve room
  // for it at the bottom of the page so it never overlaps the footer or
  // any other real content underneath it.
  const miniPlayerShowing = started && playerDisplayMode === "mini";

  // Which of the shared switcher's four modes is selected — null on Home
  // and the secondary sections, where none of the four is current.
  const mediaTabActive = PRIMARY_TAB_IDS.includes(tab) ? (tab as MediaTab) : null;

  return (
    <main style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: `32px 20px ${miniPlayerShowing ? "96px" : "80px"}`, display: "flex", flexDirection: "column" }}>
        {/* identity */}
        <div style={{ textAlign: "center", marginBottom: 22, order: HOME_ORDER.intro }}>
          <h1 style={{ fontSize: "clamp(1.8rem, 8vw, 2.4rem)", fontWeight: 900, color: text, margin: "0 0 8px" }}>
            The DJ <span style={{ color: accent }}>Cares</span> <span aria-hidden>🎧</span>
          </h1>
          <p style={{ fontSize: 15, color: sub, lineHeight: 1.55, maxWidth: 460, margin: "0 auto" }}>
            Music, messages, and encouragement worth passing on — hand-picked, Gospel first.
          </p>
        </div>

        {/* Category tabs — on Home, ordered AFTER the hero/Daily/Music
            widgets (HOME_ORDER.nav), never above them; on every other tab,
            ordered right after the intro (BROWSE_ORDER.nav), leading that
            tab's own content same as before. Continuous in-site listening:
            selecting Music, Videos, Sermons, or Podcasts only ever changes
            `tab`; it never touches current/started/playing, so
            activePlayerNode (below) — the single mounted DJPlayer/
            SyncedAudio/embed instance for whatever `current` is — is never
            unmounted or recreated by a tab click. It lives at one fixed
            JSX position outside every {tab === "..."} block; only its
            `order` (see playerOrder) changes where it's painted. */}
        <nav
          aria-label="Category tabs"
          style={{ maxWidth: 560, margin: "0 auto 20px", order: tab === "spin" ? HOME_ORDER.nav : BROWSE_ORDER.nav }}
        >
          {/* Home introduces the deeper library above the switcher; every
              browse tab already IS that library, so it doesn't repeat the
              intro — the switcher itself (identical component, identical
              position) is the only thing that needs to feel constant. */}
          {tab === "spin" && (
            <p style={{ fontSize: 13, fontWeight: 800, color: sub, textAlign: "center", margin: "0 0 10px" }}>
              Browse everything — hand-picked music, videos, podcasts, and sermons.
            </p>
          )}
          <MediaSwitcher
            active={mediaTabActive}
            onSelect={goTab}
            palette={{ text, sub, card, border, accent, ink }}
          />

          {/* Secondary: Home (a return, not an action) plus two supporting
              discovery sections that point off-site — not playback modes,
              so they stay out of the tablist above and read as quieter,
              smaller chips instead of a fifth/sixth equal-weight choice. */}
          <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: sub, textAlign: "center", margin: "14px 0 8px" }}>
            Explore
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {TABS.filter((t) => SECONDARY_TAB_IDS.includes(t.id)).map((t) => (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                style={{
                  background: tab === t.id ? accent : "transparent",
                  border: `1.5px solid ${tab === t.id ? accent : border}`,
                  borderRadius: 999,
                  padding: "8px 16px",
                  minHeight: 44,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: tab === t.id ? ink : sub,
                }}
              >
                <span aria-hidden>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </nav>

        {started && activePlayerNode}

        {/* MUSIC VIDEO DECK — a cue/discovery widget for today's featured
            video, Home-only. Never embeds its own player (see
            activePlayerNode above) — pressing Play here just starts
            playback through the same authoritative startItem pipeline
            every other pick on the page uses, so the persistent player
            above shows it, on every tab, without a second copy anywhere. */}
        {tab === "spin" && heroDisplayItem && (
          <section
            id="video-of-the-day"
            aria-label="Video of the Day"
            style={{ textAlign: "center", padding: "4px 0 20px", marginBottom: 6, order: HOME_ORDER.hero }}
          >
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 20px" }}>
              <span aria-hidden>📀</span> Music Video of the Day
            </p>

            {/* Purely a discovery/cue widget now — a decorative record, never
                its own embedded video. The one persistent player (above
                every tab, including this one) is the only place any video
                actually plays, so it survives navigating to Music, Videos,
                Sermons, or Podcasts instead of being torn down with this
                tab==="spin"-only section. */}
            <div className={`djc-turntable-wrap${isHeroStarted ? " engaged" : ""}`} style={{ width: "min(460px, 88vw)", margin: "0 auto 18px", position: "relative" }}>
              <div className="djc-turntable">
                <span className="djc-platter" aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                    if (isHeroStarted) setPlaying(playerState !== "playing");
                    else startItem(heroVideo);
                  }}
                  aria-label={
                    isHeroStarted
                      ? playerState === "playing"
                        ? "Pause the video of the day"
                        : "Resume the video of the day"
                      : `Play the video of the day: ${heroDisplayItem.title}`
                  }
                  className={`djc-vinyl${isHeroPlaying ? " spinning" : ""}${isHeroStarted ? " engaged" : ""}`}
                  style={{ WebkitAppearance: "none", appearance: "none", border: 0, padding: 0, margin: 0, font: "inherit", color: "inherit" }}
                >
                  <span className="djc-vinyl-sheen" aria-hidden />
                  <span className="djc-vinyl-label">
                    {artworkUrl(heroDisplayItem) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={artworkUrl(heroDisplayItem)!} alt="" />
                    ) : (
                      // Defensive only — every eligible video-of-the-day pick
                      // has a real YouTube thumbnail by construction, so this
                      // never shows in the normal path.
                      <span className="djc-vinyl-label-fallback" aria-hidden>🎧</span>
                    )}
                  </span>
                  <span className="djc-vinyl-spindle" aria-hidden />
                  <span className="djc-vinyl-playcue" aria-hidden>
                    <span className="djc-vinyl-playcue-tri">▶</span>
                    <span className="djc-vinyl-playcue-txt">Play Today</span>
                  </span>
                </button>
                <span className={`djc-tonearm${isHeroStarted ? " lowered" : ""}`} aria-hidden>
                  <span className="djc-tonearm-counterweight" />
                  <span className="djc-tonearm-pivot" />
                  <span className="djc-tonearm-shaft" />
                  <span className="djc-tonearm-head" />
                </span>
                <span className={`djc-power-light${isHeroStarted ? " on" : ""}`} aria-hidden />
              </div>
            </div>

            <p style={{ fontSize: isHeroStarted ? 19 : 24, fontWeight: 900, color: text, margin: 0, transition: "font-size 0.3s ease" }}>{heroDisplayItem.title}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "2px 0 0" }}>{heroDisplayItem.author}</p>
            {!isHeroStarted && heroDisplayItem.summary && (
              <p style={{ fontSize: 13, color: sub, margin: "6px auto 0", maxWidth: 420, lineHeight: 1.5 }}>{heroDisplayItem.summary}</p>
            )}

            {!isHeroStarted ? (
              <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => startItem(heroVideo)} style={bigButton}>▶ Play</button>
                <button onClick={shuffleHeroVideo} style={quietButton}>🔀 Spin</button>
                {share(mediaShareTarget(heroDisplayItem), "hero")}
              </div>
            ) : (
              // The persistent player (right below the category tabs, on
              // every tab) already has the real Play/Pause, Share, and full
              // transport for this exact item — a second copy here would be
              // a competing control for the same media, not a convenience.
              <p style={{ fontSize: 12.5, fontWeight: 800, color: sub, margin: "14px 0 0" }}>
                ▶ Now playing in the player above ↑
              </p>
            )}

            {/* "Tune the spin" — collapsed by default. Reuses the exact
                same Mood (QUEUE_MOODS → startMoodMix in "videos" mode,
                which already filters to real music videos only) and Vibe
                (VIBES → spinVideoByVibe, spinPool scoped to category
                "videos") machinery the rest of the page already has —
                just closed behind a disclosure instead of a permanent
                wall of buttons, and never surfacing music/podcast/sermon
                filters here. */}
            {!isHeroStarted && (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setTuneSpinOpen((v) => !v)}
                  aria-expanded={tuneSpinOpen}
                  style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: sub, cursor: "pointer" }}
                >
                  Tune the spin {tuneSpinOpen ? "▴" : "▾"}
                </button>
                {tuneSpinOpen && (
                  <div style={{ marginTop: 12, maxWidth: 420, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: sub, margin: "0 0 8px" }}>Mood</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: 6, marginBottom: 14 }}>
                      {QUEUE_MOODS.map((mood) => (
                        <button key={mood} onClick={() => startMoodMix(mood, "videos")} style={pill(false)}>
                          {mood === "surprise" ? "🎲" : mood[0].toUpperCase()}{mood.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: sub, margin: "0 0 8px" }}>Vibe</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: 6 }}>
                      {VIBES.map((v) => (
                        <button key={v} onClick={() => spinVideoByVibe(v)} style={pill(false)}>{v}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Daily Encouragement — directly beneath the hero (locked homepage
            order: hero, then Daily Encouragement, then everything else).
            ONE card, ONE current selection — Spin replaces this same
            card's contents in place, no "today's pick vs spun pick"
            concept, no second card, no back button. A pure selector now:
            Play here routes through the same authoritative startItem
            pipeline every other pick on the page uses (see
            activePlayerNode above) — it never mounts its own
            DJPlayer/SyncedAudio/iframe, so there's exactly one place any
            of this actually plays, and it survives navigating to Music,
            Videos, Sermons, or Podcasts. Never fabricates a source:
            Original source always points at whatever's actually
            displayed, honestly. */}
        {tab === "spin" && dailyPick && (
          <section
            id="daily-encouragement"
            aria-label="Daily Encouragement"
            style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20, textAlign: "center", order: HOME_ORDER.daily }}
          >
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 2px" }}>
              <span aria-hidden>🌅</span> Daily Encouragement
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: sub, margin: "0 0 14px" }}>{typeLabel(dailyPick)}</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: text, margin: 0 }}>{dailyPick.title}</p>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: accent, margin: "2px 0 0" }}>
              {dailyPick.author}
              {dailyPick.ministry ? ` · ${ministryByKey(dailyPick.ministry)?.name}` : ""}
            </p>
            {!dailyIsCurrent && dailyPick.summary && (
              <p style={{ fontSize: 13.5, color: sub, margin: "6px auto 0", maxWidth: 460, lineHeight: 1.55 }}>{dailyPick.summary}</p>
            )}

            {isPlayable(dailyPick) && (
              <div style={{ marginTop: 16 }}>
                {dailyIsCurrent ? (
                  // The persistent player (right below the category tabs, on
                  // every tab) already has the real Play/Pause, Share, and
                  // full transport for this exact item — a second copy here
                  // would be a competing control for the same media.
                  <p style={{ fontSize: 12.5, fontWeight: 800, color: sub, margin: 0 }}>
                    ▶ Now playing in the player above ↑
                  </p>
                ) : (
                  <>
                    {/* compact 16:9 preview — belongs to the card, not a
                        giant embed dropped into it. Clicking either this
                        or the button below starts it in the persistent
                        player above. */}
                    <button
                      type="button"
                      onClick={() => startItem(dailyPick)}
                      aria-label={`Play ${dailyPick.title}`}
                      style={{ display: "block", width: "min(420px, 100%)", margin: "0 auto", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden", background: active }}>
                        {artworkUrl(dailyPick) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artworkUrl(dailyPick)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎧</span>
                        )}
                        <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(11,18,32,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>▶</span>
                        </span>
                      </span>
                    </button>
                    <div style={{ marginTop: 14 }}>
                      <button onClick={() => startItem(dailyPick)} style={bigButton}>▶ Play here</button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              <a
                href={getWatchUrl(dailyPick)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("djc_source_opened", { content_id: dailyPick.id })}
                style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}
              >
                Original source ↗
              </a>
              <button onClick={spinDailyPick} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: sub, cursor: "pointer" }}>
                🔀 Spin another
              </button>
              {share(mediaShareTarget(dailyPick), "daily")}
            </div>
          </section>
        )}

        {/* THE MUSIC — the third deck, right after Daily Encouragement. A
            selector/featured card now: cover artwork + Play here, but
            pressing it routes through the same startItem pipeline every
            other pick on the page uses (see activePlayerNode above), which
            renders the real Apple Music embed via podcastPanelNode — no
            iframe mounted here, so there's exactly one place any playlist
            actually plays, and it survives navigating to Music, Videos,
            Sermons, or Podcasts. "Choose a mix" and "Another mix" just
            re-cue which playlist is featured (heroPlaylistId); neither
            starts playback on its own, same as the hero's Shuffle. */}
        {tab === "spin" && heroPlaylist && (
          <section id="music" aria-label="The Music" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20, textAlign: "center", order: HOME_ORDER.music }}>
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: accent, margin: "0 0 14px" }}>
              <span aria-hidden>🎶</span> The Music
            </p>
            <p style={{ fontSize: 20, fontWeight: 900, color: text, margin: 0 }}>{heroPlaylist.title}</p>
            {!musicIsCurrent && heroPlaylist.summary && (
              <p style={{ fontSize: 13.5, color: sub, margin: "6px auto 0", maxWidth: 460, lineHeight: 1.55 }}>{heroPlaylist.summary}</p>
            )}

            <div style={{ marginTop: 16 }}>
              {musicIsCurrent ? (
                // The persistent player (right below the category tabs, on
                // every tab) already has the real embed, Share, and volume
                // note for this exact playlist — a second copy here would
                // be a competing control for the same media.
                <p style={{ fontSize: 12.5, fontWeight: 800, color: sub, margin: 0 }}>
                  ▶ Now playing in the player above ↑
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { startItem(heroPlaylist); track("playlist_open", { content_title: heroPlaylist.title }); }}
                    aria-label={`Play ${heroPlaylist.title}`}
                    style={{ display: "block", width: "min(300px, 100%)", margin: "0 auto", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: active }}>
                      {heroPlaylist.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={heroPlaylist.artworkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎶</span>
                      )}
                      <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(11,18,32,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>▶</span>
                      </span>
                    </span>
                  </button>
                  <div style={{ marginTop: 14 }}>
                    <button onClick={() => { startItem(heroPlaylist); track("playlist_open", { content_title: heroPlaylist.title }); }} style={bigButton}>▶ Play</button>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 16, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
              <a href={heroPlaylist.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                Open in Apple Music ↗
              </a>
              {heroPlaylist.spotifyAlt && (
                <a href={heroPlaylist.spotifyAlt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                  Prefer Spotify? ↗
                </a>
              )}
              <button onClick={spinMusicMix} style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: sub, cursor: "pointer" }}>
                🔀 Another mix
              </button>
              {share(mediaShareTarget(heroPlaylist), "hero")}
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setChooseMixOpen((v) => !v)}
                aria-expanded={chooseMixOpen}
                style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 800, color: sub, cursor: "pointer" }}
              >
                Choose a mix {chooseMixOpen ? "▴" : "▾"}
              </button>
              {chooseMixOpen && (
                <div style={{ ...optionGrid, marginTop: 12 }}>
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setHeroPlaylistId(p.id);
                        setChooseMixOpen(false);
                        track("playlist_open", { content_title: p.title });
                      }}
                      aria-pressed={heroPlaylistId === p.id}
                      style={pill(heroPlaylistId === p.id)}
                    >
                      {p.shortTitle ?? p.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Music Videos preview — hand-picked songs, same MediaCard grid the
            Videos tab uses, just a taste of it up front. Clicking one makes
            it the new Now Playing anchor (see startItem's queue seeding). */}
        {tab === "spin" && songs.length > 0 && (
          <section id="videos" aria-label="Music Videos preview" style={{ marginBottom: 20, order: HOME_ORDER.musicVideosPreview }}>
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

        {tab === "spin" && (
          <div style={{ order: HOME_ORDER.rest }}>
            <section id="sermons">
              <h2 style={sectionH}>✝️ Sermons</h2>
              <p style={sectionSub}>Approved ministers, official channels — pick a message, or let The DJ spin.</p>
              <div style={grid}>
                {sermons.slice(0, 3).map((s) => (
                  <MediaCard key={s.id} item={s} showMinistry />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 30 }}>
                <button
                  onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }}
                  style={{ ...bigButton, flex: "0 0 auto" }}
                >
                  🔀 Surprise me
                </button>
                <button onClick={() => goTab("sermons")} style={{ ...quietButton, flex: "1 1 auto" }}>
                  All sermons →
                </button>
              </div>
            </section>

            <section id="podcasts">
              <h2 style={sectionH}>🎙️ Podcasts</h2>
              <p style={sectionSub}>Bible-first shows — press play, they stream right here.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 12 }}>
                {/* A selector, not its own player: Play here routes through
                    startItem into the one persistent player above — no
                    iframe mounted here, so a preview list never means
                    several Spotify embeds playable at once. Capped to a
                    taste of the catalog, same as every other Explore
                    preview — "All podcasts" below is the real browse. */}
                {podcasts.filter((p) => p.spotifyEmbed).slice(0, 3).map((p) => {
                  const isCurrent = current?.id === p.id && started;
                  return (
                    <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
                      {isCurrent && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: accent, textTransform: "uppercase", marginBottom: 6 }}>
                          {playerState === "playing" && (
                            <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
                          )}
                          Now Spinning
                        </span>
                      )}
                      <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "2px 0 0" }}>{p.author}</p>
                      {p.summary && <p style={{ fontSize: 13, color: sub, margin: "4px 0 0", lineHeight: 1.5 }}>{p.summary}</p>}
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        {isCurrent ? (
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: sub }}>▶ Playing in the player above ↑</span>
                        ) : (
                          <button onClick={() => startItem(p)} style={bigButton}>▶ Play here</button>
                        )}
                        {share(mediaShareTarget(p))}
                      </div>
                    </div>
                  );
                })}
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
          </div>
        )}

        {/* Every browsing tab below follows the same order: heading +
            description/filters (BROWSE_ORDER.heading), then the persistent
            player — only actually visible here when it's natural for this
            tab (see isNaturalTab/playerOrder) — then that tab's own
            library/cards (BROWSE_ORDER.cards). The heading always leads;
            the player never appears above it. */}
        {tab === "music" && (
          <>
            <div style={{ order: BROWSE_ORDER.heading }} role="tabpanel" id={mediaPanelId("music")} aria-labelledby={mediaTabId("music")}>
              <h2 style={sectionH}>Music</h2>
              <p style={sectionSub}>
                The DJ&apos;s own Apple Music playlists — worship, hymns, country, rap, workout — whole mixes, reviewed song
                by song. They stream right here with an Apple Music account (Spotify twins linked where they exist).
              </p>
              <button onClick={() => { setCategory("playlist"); const p = spinPool({ category: "playlist" }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, marginBottom: 20 }}>
                🔀 Spin music
              </button>
            </div>
            <div style={{ order: BROWSE_ORDER.cards }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {playlists.map((p) => (
                  <PlaylistCard key={p.id} p={p} />
                ))}
              </div>
              <button onClick={() => goTab("videos")} className="pop" style={{ width: "100%", background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "16px 20px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Want one song at a time instead?</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: accent, flexShrink: 0 }}>🎬 Videos →</span>
              </button>
            </div>
          </>
        )}

        {tab === "videos" && (
          <>
            <div style={{ order: BROWSE_ORDER.heading }} role="tabpanel" id={mediaPanelId("videos")} aria-labelledby={mediaTabId("videos")}>
              <h2 style={sectionH}>Music Videos</h2>
              <p style={sectionSub}>Hand-picked songs and music videos from official artist channels. Tap one and it plays right here.</p>
              <FilterDisclosure
                label="Mood"
                summary={vibe ?? "All moods"}
                palette={{ text, sub, border, activeBorder, accent }}
              >
                <VibeChips />
              </FilterDisclosure>
              <button onClick={() => { setCategory("music"); const p = spinPool({ category: "music", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, marginBottom: 20 }}>
                🔀 Spin videos
              </button>
            </div>
            <div style={{ ...grid, order: BROWSE_ORDER.cards }}>
              {vibeFiltered(songs).map((i) => (
                <MediaCard key={i.id} item={i} />
              ))}
            </div>
          </>
        )}

        {tab === "podcasts" && (
          <>
            <div style={{ order: BROWSE_ORDER.heading }} role="tabpanel" id={mediaPanelId("podcasts")} aria-labelledby={mediaTabId("podcasts")}>
              <h2 style={sectionH}>Podcasts</h2>
              <p style={sectionSub}>Bible-first shows worth your commute. The Spotify ones play right here; the rest link to their official homes.</p>
              <button onClick={() => { setCategory("podcast"); const p = spinPool({ category: "podcast" }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, marginBottom: 20 }}>
                🔀 Spin a podcast
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, order: BROWSE_ORDER.cards }}>
              {podcasts.map((p) => {
                const isCurrent = current?.id === p.id && started;
                return (
                  <div key={p.id} id={`djc-item-${p.id}`} className="pop" style={{ background: card, border: `2px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
                    {isCurrent && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", color: accent, textTransform: "uppercase", marginBottom: 6 }}>
                        {playerState === "playing" && (
                          <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
                        )}
                        Now Spinning
                      </span>
                    )}
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
                );
              })}
            </div>
          </>
        )}

        {tab === "sermons" && (
          <>
            <div style={{ order: BROWSE_ORDER.heading }} role="tabpanel" id={mediaPanelId("sermons")} aria-labelledby={mediaTabId("sermons")}>
              <h2 style={sectionH}>Sermons</h2>
              <p style={sectionSub}>Approved ministers, official channels, Christ at the center. Pick one, or let The DJ spin.</p>
              <FilterDisclosure
                label="Minister"
                summary={sermonMinistry ? (ministryByKey(sermonMinistry)?.speaker ?? "All ministries") : "All ministries"}
                palette={{ text, sub, border, activeBorder, accent }}
              >
                <div style={optionGrid}>
                  <button onClick={() => setSermonMinistry(null)} aria-pressed={sermonMinistry === null} style={pill(sermonMinistry === null)}>
                    All ministries
                  </button>
                  {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0).map((m) => (
                    <button key={m.key} onClick={() => setSermonMinistry(sermonMinistry === m.key ? null : m.key)} aria-pressed={sermonMinistry === m.key} style={pill(sermonMinistry === m.key)}>
                      {m.speaker}
                    </button>
                  ))}
                </div>
              </FilterDisclosure>
              <button onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe, ministry: sermonMinistry }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={{ ...bigButton, marginBottom: 20 }}>
                🔀 Spin a sermon
              </button>
            </div>
            <div style={{ order: BROWSE_ORDER.cards }}>
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
            </div>
          </>
        )}

        {tab === "ministries" && (
          <div style={{ order: BROWSE_ORDER.heading }}>
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
          </div>
        )}

        {tab === "churches" && (
          <div style={{ order: BROWSE_ORDER.heading }}>
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
          </div>
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
