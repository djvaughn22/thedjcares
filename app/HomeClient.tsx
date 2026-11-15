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
// Home ("spin"), top to bottom (owner's Nov 14 2026 direction: a calm first
// screen, then four sections named by the four words on it): Intro (the
// name, one plain line, Listen / Watch / Reflect / Explore, the nature
// photo), the Music Video of the Day record (the persistent player takes
// this same slot once anything plays), then Listen, Watch, Reflect and
// Explore. The category tabs no longer show on Home; each section links to
// its full category instead, and the tabs still lead every browse tab.
const HOME_ORDER = {
  intro: 10,
  hero: 20,
  listen: 30,
  watch: 40,
  reflect: 50,
  explore: 60,
} as const;

// The four words on Home's first screen, in the order the sections below
// follow. Each is an in-page anchor (see SECTION_IDS), so /#reflect works as
// a shared link too.
const HOME_DOORS = [
  { id: "listen", label: "Listen" },
  { id: "watch", label: "Watch" },
  { id: "reflect", label: "Reflect" },
  { id: "explore", label: "Explore" },
] as const;

// The first screen's nature photo: only the owner's own photo, or one with a
// clear license for this site. While this is null a labelled placeholder
// shows where it goes. To add one, put the file in public/ (wide 3:1,
// compressed) and set { src: "/file.jpg", alt: "what the photo shows" }.
const NATURE_PHOTO: { src: string; alt: string } | null = null;

// Gentle headings: Georgia ships on iPhone, Mac and Windows, so no web-font
// download is needed (and no build-time font fetch to break a deploy).
const SERIF = 'Georgia, "Times New Roman", Times, serif';

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
  // A play was asked for and YouTube hasn't confirmed it yet — drives the
  // visible "Loading…" state so nothing claims playback before it starts.
  const [startPending, setStartPending] = useState(false);
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
  // Whether the mini-player's compact volume button has expanded the real
  // shared slider into its own row below the bar — narrow-screen substitute
  // for the full-size player's always-visible VolumeControl, not a
  // replacement for it.
  const [miniVolumeOpen, setMiniVolumeOpen] = useState(false);
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
  // True while the hero shows an item a share link (/?play=…) asked for, so
  // it is labelled as shared rather than as today's Video of the Day.
  const [heroShared, setHeroShared] = useState(false);
  // The Daily Encouragement card's own pick — starts as today's official
  // rotation, but Spin can swap it for another sermon/podcast that's
  // actually inline-playable (today's official pick can land on a
  // link-out-only item; this is the escape hatch, mirroring heroVideo/
  // shuffleHeroVideo above).
  const [dailyPick, setDailyPick] = useState<MediaItem | null>(initialDailyPick);
  // The Music deck's own featured/cued pick — which of the DJ's Apple Music
  // playlists is shown on the Home widget. Independent of `current` until
  // the widget's own Play button is pressed (same heroVideo/shuffleHeroVideo
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
  const SECTION_IDS = ["video-of-the-day", "daily-encouragement", "now-playing", "videos", "music", "sermons", "podcasts", ...HOME_DOORS.map((d) => d.id)];

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
      // Cue it on the deck, ready for one tap of Play — and put it on the
      // idle hero too, so the big Play plays what was shared. (The hero
      // used to keep today's pick, so only the tab title named the link.)
      setCurrent(shared);
      setHeroVideo(shared);
      setHeroShared(true);
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
    setStartPending(Boolean(item.videoId));
    setProgress(null);

    // Track this play in session history
    const newHistory = markAsPlayed(sessionHistory, item.id);
    setSessionHistory(newHistory);
    saveSessionHistory(newHistory);
    playedCountRef.current = getPlayedCount(newHistory);

    setAnnounce(`Starting: ${item.title} — ${item.author}`);
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
      setHeroShared(false);
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
    setAnnounce(`Starting: ${item.title} — ${item.author}`);
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
      setAnnounce(`Starting: ${item.title} — ${item.author}`);
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
  // Lavender — the calm hub accent (the family light theme darkens it to
  // #6d28d9 for text, so it stays readable on white).
  const accent = "#C4B5FD";
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
      🔊 Volume: use this player&apos;s controls or your computer/phone volume buttons.
    </p>
  );

  const pill = (selected: boolean): React.CSSProperties => ({
    background: selected ? active : "none",
    border: `1px solid ${selected ? activeBorder : border}`,
    borderRadius: 50,
    padding: "10px 8px",
    fontSize: 13.5,
    fontWeight: 600,
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
    padding: "13px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const quietButton: React.CSSProperties = {
    background: "none",
    border: `1px solid ${border}`,
    color: text,
    borderRadius: 50,
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const sectionH: React.CSSProperties = { fontFamily: SERIF, fontSize: 28, fontWeight: 400, color: text, margin: "0 0 6px" };
  const sectionSub: React.CSSProperties = { fontSize: 14.5, color: sub, margin: "0 0 18px", lineHeight: 1.6 };

  // Home's four sections: a quiet serif title, one plain line, generous room.
  const chapterStyle: React.CSSProperties = { scrollMarginTop: 76, marginTop: 44, paddingTop: 36, borderTop: `1px solid ${border}` };
  const chapterTitle: React.CSSProperties = { fontFamily: SERIF, fontSize: "clamp(1.75rem, 6.5vw, 2.1rem)", fontWeight: 400, letterSpacing: "-0.01em", color: text, margin: "0 0 6px" };
  const chapterLine: React.CSSProperties = { fontSize: 15, color: sub, margin: "0 0 22px", lineHeight: 1.6 };
  const subHead: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: sub, margin: "0 0 12px" };
  const calmCard: React.CSSProperties = { background: card, border: `1px solid ${border}`, borderRadius: 18, padding: "22px 20px" };
  const smallLabel: React.CSSProperties = { fontSize: 13.5, fontWeight: 500, color: sub, margin: "0 0 8px" };
  const smallLink: React.CSSProperties = { fontSize: 13.5, fontWeight: 500, color: sub, textDecoration: "none" };
  const smallTextButton: React.CSSProperties = { background: "none", border: "none", padding: 0, fontSize: 13.5, fontWeight: 500, color: sub, cursor: "pointer" };
  const chapterLinks: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "4px 22px", marginTop: 14 };
  const textLink: React.CSSProperties = { background: "none", border: "none", padding: "8px 0", minHeight: 44, fontSize: 15, fontWeight: 500, color: accent, cursor: "pointer" };
  // Solid, never see-through: the play mark drawn over a thumbnail.
  const playCircle: React.CSSProperties = { width: 54, height: 54, borderRadius: "50%", background: "#0b1220", border: "1px solid #33507e", color: "#e8edf5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, paddingLeft: 3, boxSizing: "border-box" };
  const exploreRow: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, textAlign: "left", background: card, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px", minHeight: 44, cursor: "pointer", color: text, font: "inherit" };
  const rowTitle: React.CSSProperties = { display: "block", fontSize: 16, fontWeight: 600, color: text };
  const rowLine: React.CSSProperties = { display: "block", fontSize: 14, color: sub, marginTop: 3, lineHeight: 1.5 };

  // --- small building blocks ---

  const MediaCard = ({ item, showMinistry = false, compact = false }: { item: MediaItem; showMinistry?: boolean; compact?: boolean }) => {
    const art = artworkUrl(item);
    const playable = Boolean(item.videoId || item.spotifyEmbed || item.appleEmbed);
    const isCurrent = current?.id === item.id && started;
    if (compact) {
      // Home's short lists: a small thumbnail and the title in one quiet row.
      // The whole row plays through the same startItem path as the full
      // cards. Share and the official link live in the player and on the
      // full category pages, so the row stays uncluttered on a phone.
      const row = (
        <>
          <span style={{ position: "relative", flex: "0 0 auto", width: 112, aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: active }}>
            {art && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            {isCurrent && <span style={{ fontSize: 12.5, fontWeight: 600, color: accent }}>Now Spinning</span>}
            <span style={{ fontSize: 15, fontWeight: 600, color: text, lineHeight: 1.35 }}>{item.title}</span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: accent, lineHeight: 1.35 }}>
              {item.author}
              {showMinistry && item.ministry ? ` · ${ministryByKey(item.ministry)?.name}` : ""}
            </span>
          </span>
        </>
      );
      const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit", font: "inherit", textDecoration: "none" };
      return (
        <div className="pop" style={{ background: card, border: `1px solid ${isCurrent ? activeBorder : border}`, borderRadius: 14, padding: 10 }}>
          {playable ? (
            <button onClick={() => startItem(item)} aria-label={`Play ${typeLabel(item).toLowerCase()}: ${item.title} by ${item.author}`} style={rowStyle}>
              {row}
            </button>
          ) : (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={rowStyle}>
              {row}
            </a>
          )}
        </div>
      );
    }
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
              <span style={{ position: "absolute", right: 8, bottom: 8, background: "#0b1220", color: "#e8edf5", borderRadius: 8, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
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
          <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>{item.title}</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: accent, margin: 0 }}>
            {item.author}
            {showMinistry && item.ministry ? ` · ${ministryByKey(item.ministry)?.name}` : ""}
          </p>
          {item.summary && <p style={{ fontSize: 13, color: sub, margin: "2px 0 0", lineHeight: 1.5 }}>{item.summary}</p>}
        </div>
      </>
    );
    if (!playable) {
      return (
        <div className="pop" style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          {body}
          {footer}
        </div>
      );
    }
    return (
      <div
        className="pop"
        style={{ background: card, border: `1px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, overflow: "hidden", position: "relative" }}
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
      <div key={p.id} className="pop" style={{ background: card, border: `1px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
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
  // Whether Daily Encouragement's own cued pick is what's actually playing
  // in the one persistent player right now — same isHeroCurrent pattern,
  // just keyed on id instead of type, since dailyPick spans every media
  // type (video, audio, embed).
  const dailyIsCurrent = Boolean(started && current && dailyPick && current.id === dailyPick.id);

  // Home hero view: "record" (the spinning-disc presentation) or "media"
  // (the real video/native-audio/provider element, full size). A fresh
  // selection picks its own default — Apple/Spotify need the listener to
  // tap inside the real embed to start it at all (no JS control over a
  // cross-origin iframe), so those default straight to the provider view;
  // video and native audio default to the record, since both are actually
  // controllable from here.
  const [heroView, setHeroView] = useState<"record" | "media">("record");
  // iPhone/iPad Safari only starts a YouTube video with sound from a tap
  // inside YouTube's own player — a play request sent from our record or
  // buttons is refused until that player has been tapped once. So on iOS
  // the cued video's player is mounted up front (no sound) and shown as the
  // real video; until it has played once, our play controls bring that
  // player into view instead of pretending to start it. After the first
  // play, every control drives it directly, same as desktop.
  const [isIOS, setIsIOS] = useState(false);
  const [ytActivated, setYtActivated] = useState(false);
  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);
  useEffect(() => {
    if (isIOS && !started && current?.videoId) setStarted(true); // cued, playing stays false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIOS, current?.id]);
  useEffect(() => {
    if (playerState === "playing") setYtActivated(true);
  }, [playerState]);
  useEffect(() => {
    if (!showVideo) setYtActivated(false); // a new YouTube player needs its own first tap
  }, [showVideo]);
  const needsPlayerTap = isIOS && Boolean(showVideo) && !ytActivated;
  useEffect(() => {
    if (current) setHeroView(showEmbed ? "media" : "record");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  useEffect(() => {
    if (needsPlayerTap) setHeroView("media");
  }, [needsPlayerTap]);
  useEffect(() => {
    if (autoplayBlocked && showVideo) setHeroView("media");
  }, [autoplayBlocked, showVideo]);
  useEffect(() => {
    if (playerState === "playing") setAutoplayBlocked(false);
  }, [playerState]);
  // Whether the Home hero's record should actually spin — only when the
  // application can truthfully verify playback (real YouTube state, real
  // native-audio events). A Spotify/Apple embed's play state isn't
  // observable across origins, so it's never assumed to be playing.
  const trulyPlaying = showVideo ? playerState === "playing" : showAudio ? audioPlayingState : false;
  const videoLoading = Boolean(showVideo) && startPending && playerState !== "playing";
  // True only on Home, only once something is actually current, and only
  // while the record (not the real media) is the selected hero view — the
  // one flag that decides whether the video/audio/embed element gets
  // visually hidden (never unmounted — see videoPanelNode/podcastPanelNode
  // below) in favor of the decorative record.
  const heroRecordActive = tab === "spin" && Boolean(current) && heroView === "record";

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

  // The ONE play/pause action — the record, the button under it, and the
  // mini-player all call this, so they can never disagree. YouTube's own
  // events (onPlaybackChange) are what move playerState, so a play or
  // pause made inside the video's own controls keeps all of them in step.
  const togglePlayback = () => {
    if (showAudio) { toggleAudioPlayback(); return; }
    if (!showVideo) { setHeroView("media"); return; } // Spotify/Apple: only their own player can play
    if (needsPlayerTap) {
      // iPhone, first play: bring YouTube's real player (and its Play) into view.
      setHeroView("media");
      if (playerDisplayMode === "mini") setPlayerExpanded(true);
      return;
    }
    if (playerState === "playing" || videoLoading) {
      setPlaying(false);
      setStartPending(false);
      playerRef.current?.pause();
    } else {
      setPlaying(true);
      setStartPending(true);
      setAutoplayBlocked(false);
      playerRef.current?.play();
    }
  };
  const videoButtonLabel = playerState === "playing" ? "⏸ Pause" : videoLoading ? "⏳ Loading…" : "▶ Play";

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
            isMiniSlot || heroRecordActive
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
                : heroRecordActive
                  ? { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }
                  : { width: "100%", height: current!.spotifyEmbed ? 352 : 450, border: 0, borderRadius: 14, overflow: "hidden", background: "transparent" }
            }
          />
          {!isMiniSlot && !heroRecordActive && embedVolumeNote}
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
      className={isMiniSlot || heroRecordActive ? undefined : "djc-daily-video-enter"}
      style={
        isMiniSlot
          ? { position: "relative", width: 52, height: 52, flexShrink: 0, background: "#000", borderRadius: 10, overflow: "hidden" }
          : heroRecordActive
            // Invisible but full-size: YouTube's IFrame API won't reliably
            // play below its 200x200 minimum, so a 1px player could refuse
            // Play from the record.
            ? { position: "absolute", left: 0, top: 0, width: 200, height: 200, overflow: "hidden", opacity: 0, pointerEvents: "none", zIndex: -1 }
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
          if (s === "buffering") { setStartPending(true); return; }
          if (s !== "ended") { setPlaying(s === "playing"); setStartPending(false); }
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
        onAutoplayBlocked={() => { setAutoplayBlocked(true); setStartPending(false); setPlaying(false); }}
        onUnavailable={() => { setStartPending(false); onUnavailable(); }}
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
        <div role="status" style={{ border: `1px solid ${border}`, borderRadius: 14, padding: "18px 18px", textAlign: "center" }}>
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
        {showVideo && !blocked ? (
          // iPhone before its first play, with the real video on screen:
          // YouTube's own Play is the control — no second, dead one here.
          needsPlayerTap && heroView === "media" ? null : (
            <button
              onClick={togglePlayback}
              aria-label={playerState === "playing" ? "Pause" : videoLoading ? "Loading — tap to cancel" : "Play"}
              style={quietButton}
            >
              {videoButtonLabel}
            </button>
          )
        ) : showAudio ? (
          <button onClick={toggleAudioPlayback} aria-label={audioPlayingState ? "Pause" : "Play"} style={quietButton}>
            {audioPlayingState ? "⏸ Pause" : "▶ Play"}
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
  // instead of always leading. `order` is a pure paint-order property — it
  // never moves the underlying DOM node, so this changes nothing about how
  // DJPlayer/SyncedAudio/the embed iframe stays mounted (see HOME_ORDER
  // below for the full scheme).
  //
  // On Home, the player is ALWAYS the dynamic hero at HOME_ORDER.hero,
  // whatever `current` actually is (2026-08-26 owner direction — this
  // supersedes the earlier rule that only routed music videos there and
  // sent sermons/podcasts/playlists to sit at the Daily Encouragement/Music
  // widget's own position instead). Daily Encouragement and the Music
  // widget stay exactly where they were; they just go back to being plain
  // selector cards the instant something else becomes current, same as
  // they already do via dailyIsCurrent/musicIsCurrent below.
  const playerOrder = tab === "spin" ? HOME_ORDER.hero : BROWSE_ORDER.player;
  const playerOuterStyle: React.CSSProperties =
    playerDisplayMode === "mini"
      ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45 }
      : playerDisplayMode === "overlay"
        ? { position: "fixed", inset: 0, zIndex: 46, background: "rgba(8,12,20,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }
        : { position: "static", order: playerOrder };
  const playerInnerStyle: React.CSSProperties =
    playerDisplayMode === "mini"
      ? { background: card, borderTop: `1px solid ${border}`, padding: "10px 14px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -4px 20px rgba(0,0,0,0.25)" }
      : playerDisplayMode === "overlay"
        ? { background: card, borderRadius: "22px 22px 0 0", padding: "16px 20px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", width: "100%", maxWidth: 760, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.4)" }
        : { background: card, border: `1px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 28 };

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
            <p style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: accent, margin: 0 }}>
              <span aria-hidden>{originIcon}</span> {originLabel}
              {trulyPlaying && (
                <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
              )}
            </p>
            {current && <span style={{ fontSize: 13, fontWeight: 500, color: sub }}>{typeLabel(current)}</span>}
          </div>
        )}

        {/* Home hero: a clear two-choice switch between the decorative
            record and the real media (Video/Audio/Apple Music/Spotify,
            whichever actually applies) — changes presentation only, never
            touches current/started/playing, so the same DJPlayer/
            SyncedAudio/iframe underneath just gets shown or visually
            hidden (see heroRecordActive above), never remounted. */}
        {autoplayBlocked && showVideo && !blocked && playerState !== "playing" && playerDisplayMode !== "mini" && current && (
          <p role="status" style={{ textAlign: "center", fontSize: 13.5, fontWeight: 700, color: text, margin: "0 0 12px" }}>
            It didn&apos;t start from here. Press play on the video, or{" "}
            <a href={current.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 800 }}>watch on YouTube ↗</a>
          </p>
        )}
        {tab === "spin" && current && (showVideo || showAudio || showEmbed) && (
          <div role="group" aria-label="Hero view" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
            <button type="button" aria-pressed={heroView === "record"} onClick={() => setHeroView("record")} style={pill(heroView === "record")}>
              📀 Record
            </button>
            <button type="button" aria-pressed={heroView === "media"} onClick={() => setHeroView("media")} style={pill(heroView === "media")}>
              {showVideo ? "🎬 Video" : showAudio ? "🎧 Audio" : current?.spotifyEmbed ? "🟢 Spotify" : "🎵 Apple Music"}
            </button>
          </div>
        )}

        <div style={playerDisplayMode === "mini" ? { display: "flex", alignItems: "center", gap: 12 } : undefined}>
          <div style={playerDisplayMode === "mini" ? { flexShrink: 0 } : undefined}>
            {heroRecordActive && (
              <div className="djc-turntable-wrap engaged" style={{ width: "min(300px, 66vw)", margin: "0 auto 16px", position: "relative" }}>
                {/* The whole deck is the click target, not just the disc —
                    the platter ring around it looks like part of the record
                    too. The button's own click (mouse or keyboard) bubbles
                    up here, so it fires exactly once. */}
                <div
                  className="djc-turntable"
                  style={{ cursor: "pointer" }}
                  onClick={togglePlayback}
                >
                  <span className="djc-platter" aria-hidden />
                  <button
                    type="button"
                    aria-label={
                      showVideo || showAudio
                        ? (trulyPlaying ? "Pause" : needsPlayerTap ? "Show the video player" : videoLoading ? "Loading — tap to cancel" : "Play")
                        : `Open ${current?.spotifyEmbed ? "Spotify" : "Apple Music"} player`
                    }
                    className={`djc-vinyl${trulyPlaying ? " spinning" : ""} engaged`}
                    style={{ WebkitAppearance: "none", appearance: "none", border: 0, padding: 0, margin: 0, font: "inherit", color: "inherit" }}
                  >
                    <span className="djc-vinyl-sheen" aria-hidden />
                    <span className="djc-vinyl-label">
                      {current && artworkUrl(current) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={artworkUrl(current)!} alt="" />
                      ) : (
                        <span className="djc-vinyl-label-fallback" aria-hidden>🎧</span>
                      )}
                    </span>
                    <span className="djc-vinyl-spindle" aria-hidden />
                    {(showVideo || showAudio) && !trulyPlaying && (
                      <span className="djc-vinyl-playcue" aria-hidden>
                        <span className="djc-vinyl-playcue-tri">▶</span>
                        <span className="djc-vinyl-playcue-txt">
                          {videoLoading ? "Loading…" : needsPlayerTap ? "Play video" : playerState === "idle" || showAudio ? "Play" : "Paused"}
                        </span>
                      </span>
                    )}
                  </button>
                  <span className="djc-tonearm lowered" aria-hidden>
                    <span className="djc-tonearm-counterweight" />
                    <span className="djc-tonearm-pivot" />
                    <span className="djc-tonearm-shaft" />
                    <span className="djc-tonearm-head" />
                  </span>
                  <span className="djc-power-light on" aria-hidden />
                </div>
                {showEmbed && (
                  <div style={{ textAlign: "center", marginTop: 10 }}>
                    <button onClick={() => setHeroView("media")} style={quietButton}>
                      Open {current?.spotifyEmbed ? "Spotify" : "Apple Music"} player →
                    </button>
                  </div>
                )}
              </div>
            )}
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
                      onClick={togglePlayback}
                      aria-label={trulyPlaying ? "Pause" : videoLoading ? "Loading — tap to cancel" : "Play"}
                      style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: text }}
                    >
                      {trulyPlaying ? "⏸" : videoLoading ? "⏳" : "▶"}
                    </button>
                    {/* Compact volume button — narrow mobile screens don't
                        have room for the full slider inline in the mini
                        bar, so this expands the exact same shared
                        VolumeControl (44px targets, real percentage,
                        Mute/Unmute) into its own row below instead of
                        removing volume control on small screens. */}
                    <button
                      onClick={() => setMiniVolumeOpen((v) => !v)}
                      aria-expanded={miniVolumeOpen}
                      aria-label="Volume"
                      style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 2, background: "none", border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", color: text }}
                    >
                      <span aria-hidden style={{ fontSize: 18 }}>{prefs.muted ? "🔇" : "🔊"}</span>
                      {prefs.muted ? 0 : prefs.volume}%
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
                  <p style={{ fontSize: 18, fontWeight: 600, color: text, margin: 0 }}>{current.title}</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: accent, margin: "2px 0 0" }}>
                    {current.author}
                    {current.ministry ? ` · ${ministryByKey(current.ministry)?.name}` : ""}
                  </p>
                </div>
              )}
              {transportPanel}
            </>
          )}
        </div>

        {playerDisplayMode === "mini" && miniVolumeOpen && !showEmbed && (
          <div style={{ marginTop: 10 }}>{volumeControl("djc-mini-volume")}</div>
        )}
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

  // Once the listener is back on a tab where the full player already shows
  // inline, an expanded mini-player sheet has nothing left to add — collapse
  // it automatically so it doesn't linger stuck open over the wrong tab.
  useEffect(() => {
    if (isNaturalTab) setPlayerExpanded(false);
  }, [isNaturalTab]);

  // Same idea for the mini-player's own expanded volume row — nothing to
  // show once the mini bar itself is gone.
  useEffect(() => {
    if (playerDisplayMode !== "mini") setMiniVolumeOpen(false);
  }, [playerDisplayMode]);

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
    <main className="djc-calm" style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: `32px 20px ${miniPlayerShowing ? "96px" : "80px"}`, display: "flex", flexDirection: "column" }}>
        {/* The first screen: the name, one plain line, the four ways in
            (Listen, Watch, Reflect, Explore) and the nature photo. Nothing
            here plays anything. Browse tabs keep only the name and the
            line, with their own category nav right under it. */}
        <div style={{ textAlign: "center", marginBottom: tab === "spin" ? 40 : 22, order: HOME_ORDER.intro }}>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(2.2rem, 9vw, 3rem)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.15, color: text, margin: "8px 0 10px" }}>
            The DJ <span style={{ color: accent }}>Cares</span>
          </h1>
          <p style={{ fontSize: 16, color: sub, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
            Christian music, videos, sermons and podcasts, picked by hand.
          </p>

          {tab === "spin" && (
            <>
              <nav aria-label="On this page" style={{ maxWidth: 520, margin: "30px auto 0", borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
                <ul style={{ listStyle: "none", margin: 0, padding: "4px 0", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                  {HOME_DOORS.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`#${d.id}`}
                        className="djc-door"
                        onClick={() => track("home_door", { door: d.id })}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 48, fontSize: 16.5, fontWeight: 500, letterSpacing: "0.01em", color: text, textDecoration: "none" }}
                      >
                        {d.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {NATURE_PHOTO ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={NATURE_PHOTO.src}
                  alt={NATURE_PHOTO.alt}
                  style={{ display: "block", width: "100%", height: "auto", aspectRatio: "3 / 1", objectFit: "cover", borderRadius: 18, marginTop: 30 }}
                />
              ) : (
                <div
                  role="img"
                  aria-label="Placeholder for a nature photo"
                  style={{ marginTop: 30, aspectRatio: "3 / 1", borderRadius: 18, border: `1px dashed ${activeBorder}`, background: card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 16 }}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: sub }}>Nature photo goes here</span>
                  <span style={{ fontSize: 13, color: sub }}>Placeholder: the owner&apos;s own photo, or one with a clear license</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Category tabs — browse tabs only (Home has its four sections
            instead, each linking to its full category). Continuous in-site
            listening: selecting Music, Videos, Sermons, or Podcasts only
            ever changes `tab`; it never touches current/started/playing, so
            activePlayerNode (below) — the single mounted DJPlayer/
            SyncedAudio/embed instance for whatever `current` is — is never
            unmounted or recreated by a tab click. It lives at one fixed JSX
            position outside every per-tab block; only its `order` (see
            playerOrder) changes where it's painted. */}
        {tab !== "spin" && (
          <nav
            aria-label="Category tabs"
            style={{ maxWidth: 560, margin: "0 auto 20px", order: BROWSE_ORDER.nav }}
          >
            <MediaSwitcher
              active={mediaTabActive}
              onSelect={goTab}
              palette={{ text, sub, card, border, accent, ink }}
            />

            {/* Secondary: Home (a return, not an action) plus two supporting
                discovery sections that point off-site — not playback modes,
                so they stay out of the tablist above and read as quieter,
                smaller chips instead of a fifth/sixth equal-weight choice. */}
            <p style={{ fontSize: 13, fontWeight: 600, color: sub, textAlign: "center", margin: "14px 0 8px" }}>
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
                    fontWeight: 600,
                    cursor: "pointer",
                    color: tab === t.id ? ink : sub,
                  }}
                >
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </nav>
        )}

        {started && activePlayerNode}

        {/* Music Video of the Day — idle only. Nothing has been started
            anywhere yet, so today's pick is cued on the record: a pure cue,
            never its own embedded video and never autoplaying. The instant
            anything is started this stops rendering (gated on !started) and
            the persistent player takes the same HOME_ORDER.hero slot,
            showing whatever is actually current (see heroRecordActive). */}
        {tab === "spin" && !started && heroVideo && (
          <section
            id="video-of-the-day"
            aria-label={heroShared ? "Shared with you" : "Video of the Day"}
            style={{ textAlign: "center", padding: "4px 0 0", order: HOME_ORDER.hero }}
          >
            <p style={{ fontSize: 14, fontWeight: 500, color: sub, margin: "0 0 18px" }}>
              {heroShared ? "Shared with you" : "Music Video of the Day"}
            </p>

            <div className="djc-turntable-wrap" style={{ width: "min(340px, 76vw)", margin: "0 auto 20px", position: "relative" }}>
              {/* Whole deck is clickable — see the now-playing record above. */}
              <div className="djc-turntable" style={{ cursor: "pointer" }} onClick={() => startItem(heroVideo)}>
                <span className="djc-platter" aria-hidden />
                <button
                  type="button"
                  aria-label={heroShared ? `Play ${heroVideo.title}` : `Play the video of the day: ${heroVideo.title}`}
                  className="djc-vinyl"
                  style={{ WebkitAppearance: "none", appearance: "none", border: 0, padding: 0, margin: 0, font: "inherit", color: "inherit" }}
                >
                  <span className="djc-vinyl-sheen" aria-hidden />
                  <span className="djc-vinyl-label">
                    {artworkUrl(heroVideo) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={artworkUrl(heroVideo)!} alt="" />
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
                    <span className="djc-vinyl-playcue-txt">{heroShared ? "Play" : "Play Today"}</span>
                  </span>
                </button>
                <span className="djc-tonearm" aria-hidden>
                  <span className="djc-tonearm-counterweight" />
                  <span className="djc-tonearm-pivot" />
                  <span className="djc-tonearm-shaft" />
                  <span className="djc-tonearm-head" />
                </span>
                <span className="djc-power-light" aria-hidden />
              </div>
            </div>

            <p style={{ fontSize: 21, fontWeight: 600, color: text, margin: 0, lineHeight: 1.3 }}>{heroVideo.title}</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: accent, margin: "4px 0 0" }}>{heroVideo.author}</p>
            {heroVideo.summary && (
              <p style={{ fontSize: 14, color: sub, margin: "8px auto 0", maxWidth: 420, lineHeight: 1.6 }}>{heroVideo.summary}</p>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => startItem(heroVideo)} style={bigButton}>▶ Play</button>
              <button onClick={shuffleHeroVideo} style={quietButton}>🔀 Spin</button>
              {share(mediaShareTarget(heroVideo), "hero")}
            </div>

            {/* "Tune the spin" — collapsed by default. Reuses the real Mood
                (QUEUE_MOODS → startMoodMix in "videos" mode, music videos
                only) and Vibe (VIBES → spinVideoByVibe) machinery, closed
                behind one disclosure instead of a wall of buttons. */}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setTuneSpinOpen((v) => !v)}
                aria-expanded={tuneSpinOpen}
                style={{ ...smallTextButton, minHeight: 44 }}
              >
                Tune the spin {tuneSpinOpen ? "▴" : "▾"}
              </button>
              {tuneSpinOpen && (
                <div style={{ marginTop: 8, maxWidth: 420, marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: sub, margin: "0 0 8px" }}>Mood</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: 6, marginBottom: 14 }}>
                    {QUEUE_MOODS.map((mood) => (
                      <button key={mood} onClick={() => startMoodMix(mood, "videos")} style={pill(false)}>
                        {mood === "surprise" ? "🎲" : mood[0].toUpperCase()}{mood.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: sub, margin: "0 0 8px" }}>Vibe</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))", gap: 6 }}>
                    {VIBES.map((v) => (
                      <button key={v} onClick={() => spinVideoByVibe(v)} style={pill(false)}>{v}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* LISTEN — the DJ's playlists and podcasts. Both are selectors:
            Play routes through the same startItem pipeline every other pick
            uses, so the real Apple/Spotify embed only ever mounts in the one
            persistent player (podcastPanelNode), never in these cards.
            "Choose a mix" and "Another mix" only re-cue which playlist is
            shown (heroPlaylistId); neither starts playback. */}
        {tab === "spin" && (
          <section id="listen" aria-labelledby="listen-heading" style={{ ...chapterStyle, order: HOME_ORDER.listen }}>
            <h2 id="listen-heading" style={chapterTitle}>Listen</h2>
            <p style={chapterLine}>The DJ&apos;s playlists and podcasts.</p>

            {heroPlaylist && (
              <section id="music" aria-label="The Music" style={{ ...calmCard, textAlign: "center", marginBottom: 28 }}>
                <p style={smallLabel}>Playlist</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: text, margin: 0, lineHeight: 1.35 }}>{heroPlaylist.title}</p>
                {!musicIsCurrent && heroPlaylist.summary && (
                  <p style={{ fontSize: 14, color: sub, margin: "8px auto 0", maxWidth: 440, lineHeight: 1.6 }}>{heroPlaylist.summary}</p>
                )}

                <div style={{ marginTop: 18 }}>
                  {musicIsCurrent ? (
                    // The persistent player at the top already has the real
                    // embed, Share and the volume note for this playlist.
                    <p style={{ fontSize: 13.5, fontWeight: 500, color: sub, margin: 0 }}>
                      ▶ Now playing in the player above ↑
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => { startItem(heroPlaylist); track("playlist_open", { content_title: heroPlaylist.title }); }}
                        aria-label={`Play ${heroPlaylist.title}`}
                        style={{ display: "block", width: "min(240px, 100%)", margin: "0 auto", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: active }}>
                          {heroPlaylist.artworkUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={heroPlaylist.artworkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 40 }}>🎶</span>
                          )}
                          <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={playCircle}>▶</span>
                          </span>
                        </span>
                      </button>
                      <div style={{ marginTop: 16 }}>
                        <button onClick={() => { startItem(heroPlaylist); track("playlist_open", { content_title: heroPlaylist.title }); }} style={bigButton}>▶ Play</button>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: "8px 18px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                  <a href={heroPlaylist.url} target="_blank" rel="noopener noreferrer" style={smallLink}>
                    Open in Apple Music ↗
                  </a>
                  {heroPlaylist.spotifyAlt && (
                    <a href={heroPlaylist.spotifyAlt} target="_blank" rel="noopener noreferrer" style={smallLink}>
                      Prefer Spotify? ↗
                    </a>
                  )}
                  <button onClick={spinMusicMix} style={smallTextButton}>
                    🔀 Another mix
                  </button>
                  {share(mediaShareTarget(heroPlaylist), "hero")}
                </div>

                <div style={{ marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setChooseMixOpen((v) => !v)}
                    aria-expanded={chooseMixOpen}
                    style={{ ...smallTextButton, minHeight: 44 }}
                  >
                    Choose a mix {chooseMixOpen ? "▴" : "▾"}
                  </button>
                  {chooseMixOpen && (
                    <div style={{ ...optionGrid, marginTop: 8 }}>
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

            <section id="podcasts">
              <h3 style={subHead}>Podcasts</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Selectors, not players: Play here routes through
                    startItem into the one persistent player at the top —
                    no per-card embed, so a short list never means several
                    playable at once. "All podcasts" below is the full list. */}
                {podcasts.filter((p) => p.spotifyEmbed).slice(0, 2).map((p) => {
                  const isCurrent = current?.id === p.id && started;
                  return (
                    <div key={p.id} className="pop" style={{ background: card, border: `1px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
                      {isCurrent && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, color: accent, marginBottom: 6 }}>
                          {playerState === "playing" && (
                            <span className="djc-eq" aria-hidden><span /><span /><span /><span /></span>
                          )}
                          Now Spinning
                        </span>
                      )}
                      <p style={{ fontSize: 16, fontWeight: 600, color: text, margin: 0 }}>{p.title}</p>
                      <p style={{ fontSize: 13.5, fontWeight: 500, color: accent, margin: "3px 0 0" }}>{p.author}</p>
                      {p.summary && <p style={{ fontSize: 14, color: sub, margin: "6px 0 0", lineHeight: 1.55 }}>{p.summary}</p>}
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {isCurrent ? (
                          <span style={{ fontSize: 13.5, fontWeight: 500, color: sub }}>▶ Playing in the player above ↑</span>
                        ) : (
                          <button onClick={() => startItem(p)} style={bigButton}>▶ Play here</button>
                        )}
                        {share(mediaShareTarget(p))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={chapterLinks}>
              <button onClick={() => goTab("music")} style={textLink}>All music →</button>
              <button onClick={() => goTab("podcasts")} style={textLink}>All podcasts →</button>
            </div>
          </section>
        )}

        {/* WATCH — music videos and sermons from official channels, a short
            list of each. A row plays through startItem (a video row also
            seeds the continuous video queue there). */}
        {tab === "spin" && (
          <section id="watch" aria-labelledby="watch-heading" style={{ ...chapterStyle, order: HOME_ORDER.watch }}>
            <h2 id="watch-heading" style={chapterTitle}>Watch</h2>
            <p style={chapterLine}>Music videos and sermons from official channels.</p>

            {songs.length > 0 && (
              <section id="videos" aria-label="Music Videos preview" style={{ marginBottom: 28 }}>
                <h3 style={subHead}>Music videos</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {songs.slice(0, 3).map((i) => (
                    <MediaCard key={i.id} item={i} compact />
                  ))}
                </div>
              </section>
            )}

            <section id="sermons">
              <h3 style={subHead}>Sermons</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sermons.slice(0, 3).map((s) => (
                  <MediaCard key={s.id} item={s} showMinistry compact />
                ))}
              </div>
              <button
                onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }}
                style={{ ...quietButton, marginTop: 14 }}
              >
                🔀 Surprise me
              </button>
            </section>

            <div style={chapterLinks}>
              <button onClick={() => goTab("videos")} style={textLink}>All videos →</button>
              <button onClick={() => goTab("sermons")} style={textLink}>All sermons →</button>
            </div>
          </section>
        )}

        {/* REFLECT — Daily Encouragement. ONE card, ONE current selection:
            Spin another replaces this card's contents in place and never
            starts playback. Play here routes through the same startItem
            pipeline every other pick uses, so it plays in the one
            persistent player at the top, never in this card. Original
            source always points at whatever is displayed. */}
        {tab === "spin" && (
          <section id="reflect" aria-labelledby="reflect-heading" style={{ ...chapterStyle, order: HOME_ORDER.reflect }}>
            <h2 id="reflect-heading" style={chapterTitle}>Reflect</h2>
            <p style={chapterLine}>A sermon or podcast for today. A new one each day.</p>

            {dailyPick ? (
              <section id="daily-encouragement" aria-label="Daily Encouragement" style={{ ...calmCard, textAlign: "center" }}>
                <p style={smallLabel}>Daily Encouragement · {typeLabel(dailyPick)}</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: text, margin: 0, lineHeight: 1.35 }}>{dailyPick.title}</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: accent, margin: "4px 0 0" }}>
                  {dailyPick.author}
                  {dailyPick.ministry ? ` · ${ministryByKey(dailyPick.ministry)?.name}` : ""}
                </p>
                {!dailyIsCurrent && dailyPick.summary && (
                  <p style={{ fontSize: 14, color: sub, margin: "8px auto 0", maxWidth: 460, lineHeight: 1.6 }}>{dailyPick.summary}</p>
                )}

                {isPlayable(dailyPick) && (
                  <div style={{ marginTop: 18 }}>
                    {dailyIsCurrent ? (
                      // The persistent player at the top already has the real
                      // Play/Pause, Share and transport for this item.
                      <p style={{ fontSize: 13.5, fontWeight: 500, color: sub, margin: 0 }}>
                        ▶ Now playing in the player above ↑
                      </p>
                    ) : (
                      <>
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
                              <span style={playCircle}>▶</span>
                            </span>
                          </span>
                        </button>
                        <div style={{ marginTop: 16 }}>
                          <button onClick={() => startItem(dailyPick)} style={bigButton}>▶ Play here</button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: "8px 18px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                  <a
                    href={getWatchUrl(dailyPick)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("djc_source_opened", { content_id: dailyPick.id })}
                    style={smallLink}
                  >
                    Original source ↗
                  </a>
                  <button onClick={spinDailyPick} style={smallTextButton}>
                    🔀 Spin another
                  </button>
                  {share(mediaShareTarget(dailyPick), "daily")}
                </div>
              </section>
            ) : (
              <p style={{ fontSize: 14.5, color: sub, margin: 0 }}>
                Today&apos;s pick isn&apos;t ready yet.{" "}
                <button onClick={() => goTab("sermons")} style={{ ...textLink, minHeight: 0, padding: 0 }}>All sermons →</button>
              </p>
            )}
          </section>
        )}

        {/* EXPLORE — the Digital DJ, the ministries behind the teaching, and
            local churches. Ministries and Churches open through goTab, the
            same client-side path the category tabs use. */}
        {tab === "spin" && (
          <section id="explore" aria-labelledby="explore-heading" style={{ ...chapterStyle, order: HOME_ORDER.explore }}>
            <h2 id="explore-heading" style={chapterTitle}>Explore</h2>
            <p style={chapterLine}>The Digital DJ, ministries and local churches.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {digitalDjEnabled && (
                <section aria-label="Digital DJ" style={calmCard}>
                  <p style={smallLabel}>Digital DJ</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: text, margin: "0 0 6px" }}>What should we play?</p>
                  <p style={{ fontSize: 14, color: sub, margin: "0 0 16px", lineHeight: 1.6 }}>
                    Choose your time and mood. The DJ will cue an approved session.
                  </p>
                  <a
                    href="/digital-dj"
                    onClick={() => track("digital_dj_homepage_click")}
                    style={{ ...bigButton, display: "inline-block", textDecoration: "none" }}
                  >
                    Cue my session
                  </a>
                </section>
              )}
              <button onClick={() => goTab("ministries")} style={exploreRow}>
                <span>
                  <span style={rowTitle}>Ministries</span>
                  <span style={rowLine}>Where the sermons and podcasts come from.</span>
                </span>
                <span aria-hidden style={{ fontSize: 18, color: accent, flexShrink: 0 }}>→</span>
              </button>
              <button onClick={() => goTab("churches")} style={exploreRow}>
                <span>
                  <span style={rowTitle}>Churches</span>
                  <span style={rowLine}>Churches that stream on YouTube, and a form to submit yours.</span>
                </span>
                <span aria-hidden style={{ fontSize: 18, color: accent, flexShrink: 0 }}>→</span>
              </button>
            </div>
          </section>
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
              <button onClick={() => goTab("videos")} className="pop" style={{ width: "100%", background: card, border: `1px solid ${border}`, borderRadius: 18, padding: "16px 20px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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
                  <div key={p.id} id={`djc-item-${p.id}`} className="pop" style={{ background: card, border: `1px solid ${isCurrent ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
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
                  <div key={m.key} id={`djc-ministry-${m.key}`} className="pop" style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
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
                  <div key={c.id} id={`djc-church-${c.id}`} className="pop" style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
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
              <div style={{ background: card, border: `1px dashed ${border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 26, textAlign: "center" }}>
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
