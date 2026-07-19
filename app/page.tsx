"use client";

// The DJ Cares — a digital DJ for Christian media.
// Choose a category. Press play. Let The DJ Cares spin something good.
//
// Everything playable comes from the approved library in
// app/lib/djCaresLibrary.ts. The shuffle (app/lib/spin.ts) never leaves it.

import { useEffect, useMemo, useRef, useState } from "react";
import DJPlayer from "./components/DJPlayer";
import ChurchSubmitForm from "./components/ChurchSubmitForm";
import {
  APPROVED_CHURCHES,
  artworkUrl,
  getEmbedUrl,
  itemsOfType,
  LIBRARY,
  MINISTRIES,
  ministryByKey,
  musicVideos,
  VIBES,
  type MediaItem,
  type Ministry,
  type MinistryKey,
  type Vibe,
} from "./lib/djCaresLibrary";
import {
  loadHistory,
  pickNext,
  pushHistory,
  saveHistory,
  spinPool,
  type SpinCategory,
} from "./lib/spin";
import { track } from "./lib/analytics";

const TABS = [
  { id: "spin", label: "Spin", emoji: "🎧" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "videos", label: "Videos", emoji: "🎬" },
  { id: "playlists", label: "Playlists", emoji: "🎶" },
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

const typeLabel = (item: MediaItem): string =>
  item.type === "music"
    ? item.musicVideo
      ? "Music Video"
      : "Song"
    : item.type === "podcast"
      ? "Podcast"
      : item.type === "sermon"
        ? "Sermon"
        : "Playlist";

export default function TheDJCaresPage() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("spin");

  // --- deck state ---
  const [category, setCategory] = useState<SpinCategory>("all");
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [started, setStarted] = useState(false); // player mounted?
  const [playing, setPlaying] = useState(false); // desired play state
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused">("idle");
  const [blocked, setBlocked] = useState(false); // current item wouldn't play
  const [announce, setAnnounce] = useState("");
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(new Set());
  const historyRef = useRef<string[]>([]);
  // This session's play order, for real Previous/Next.
  const sessionRef = useRef<MediaItem[]>([]);
  const posRef = useRef(-1);
  const deckRef = useRef<HTMLDivElement>(null);

  // Follow the family ☀️/🌙 toggle in the Open Mirror bar.
  useEffect(() => {
    const follow = () => setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // Tabs ↔ URL hash (#music, #sermons…), so sections are linkable.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "");
      if (TABS.some((t) => t.id === h)) setTab(h as Tab);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const goTab = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, "", t === "spin" ? window.location.pathname : `#${t}`);
    window.scrollTo({ top: 0 });
    track("tab_view", { tab: t });
  };

  // Cue tonight's first record (no sound until the visitor presses Play).
  useEffect(() => {
    historyRef.current = loadHistory();
    setCurrent(LIBRARY.find((i) => i.featured && i.type === "music") ?? LIBRARY[0]);
  }, []);

  const pool = useMemo(
    () => spinPool({ category, vibe }).filter((i) => !unavailable.has(i.id)),
    [category, vibe, unavailable],
  );

  const startItem = (item: MediaItem, viaSpin = false) => {
    // New play cuts the session's forward branch (like a browser history).
    sessionRef.current = [...sessionRef.current.slice(0, posRef.current + 1), item];
    posRef.current = sessionRef.current.length - 1;
    historyRef.current = pushHistory(historyRef.current, item.id, Math.max(pool.length, 2));
    saveHistory(historyRef.current);
    setCurrent(item);
    setStarted(true);
    setPlaying(true);
    setBlocked(false);
    setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
    track("media_play", { content_type: item.type, content_title: item.title, via: viaSpin ? "spin" : "pick" });
    deckRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const spin = () => {
    const next = pickNext(pool, historyRef.current);
    if (next) startItem(next, true);
  };

  const spinMinistry = (key: MinistryKey) => {
    const mPool = spinPool({ category: "sermon", ministry: key }).filter((i) => !unavailable.has(i.id));
    const next = pickNext(mPool, historyRef.current);
    if (next) {
      goTab("spin");
      startItem(next, true);
    }
  };

  const prev = () => {
    if (posRef.current <= 0) return;
    posRef.current -= 1;
    const item = sessionRef.current[posRef.current];
    setCurrent(item);
    setPlaying(true);
    setBlocked(false);
    setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
  };

  const next = () => {
    if (posRef.current < sessionRef.current.length - 1) {
      posRef.current += 1;
      const item = sessionRef.current[posRef.current];
      setCurrent(item);
      setPlaying(true);
      setBlocked(false);
      setAnnounce(`Now spinning: ${item.title} — ${item.author}`);
    } else {
      spin();
    }
  };

  const onUnavailable = () => {
    if (!current) return;
    setBlocked(true);
    setPlaying(false);
    setPlayerState("idle");
    setUnavailable((s) => new Set([...s, current.id]));
    setAnnounce(`${current.title} won't play here. Use the official link, or spin another.`);
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

  const pill = (selected: boolean): React.CSSProperties => ({
    background: selected ? active : "none",
    border: `2px solid ${selected ? activeBorder : border}`,
    borderRadius: 50,
    padding: "10px 18px",
    fontSize: 13.5,
    fontWeight: 800,
    cursor: "pointer",
    color: selected ? accent : sub,
    whiteSpace: "nowrap",
  });

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
          <div style={{ marginTop: 6 }}>{open}</div>
        </div>
      </>
    );
    if (!playable) {
      return (
        <div className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden" }}>
          {body}
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
      </div>
    );
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: 14,
  };

  const VibeChips = ({ scope }: { scope?: Vibe[] }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
      {(scope ?? VIBES).map((v) => (
        <button key={v} onClick={() => setVibe(vibe === v ? null : v)} aria-pressed={vibe === v} style={pill(vibe === v)}>
          {v}
        </button>
      ))}
    </div>
  );

  // --- the deck (Now Spinning) ---

  const deckPoolEmpty = pool.length === 0;
  const showVideo = started && current?.videoId;
  const showEmbed = started && current && !current.videoId && (current.spotifyEmbed || current.appleEmbed);

  const deck = (
    <section
      ref={deckRef}
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
          <DJPlayer
            videoId={current!.videoId!}
            title={current!.title}
            playing={playing}
            onPlaybackChange={(s) => {
              if (s === "ended") next();
              else setPlayerState(s);
            }}
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
            <button onClick={spin} style={bigButton}>🔀 Spin Another</button>
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
        <button onClick={spin} disabled={deckPoolEmpty} style={{ ...bigButton, opacity: deckPoolEmpty ? 0.5 : 1 }}>
          🔀 Spin Another
        </button>
      </div>

      {/* category + vibe — the DJ's request line (Spin tab only) */}
      {tab === "spin" && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 10px" }}>
            What should I spin?
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {SPIN_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id} style={pill(category === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: sub, margin: "0 0 10px" }}>
            Choose a vibe <span style={{ fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>(optional)</span>
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
  const videos = musicVideos();
  const podcasts = itemsOfType("podcast");
  const sermons = itemsOfType("sermon");
  const playlists = itemsOfType("playlist");
  const vibeFiltered = (items: MediaItem[]) => (vibe ? items.filter((i) => i.vibes.includes(vibe)) : items);

  const [openPlaylists, setOpenPlaylists] = useState<Record<string, boolean>>({});
  const [sermonMinistry, setSermonMinistry] = useState<MinistryKey | null>(null);

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

        {/* navigation */}
        <nav aria-label="Sections" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              style={{
                background: tab === t.id ? accent : card,
                border: `2px solid ${tab === t.id ? accent : border}`,
                borderRadius: 50,
                padding: "11px 16px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                color: tab === t.id ? ink : sub,
              }}
            >
              <span aria-hidden>{t.emoji}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* the deck: always on Spin; elsewhere only once something is playing */}
        {(tab === "spin" || started) && deck}

        {tab === "spin" && (
          <>
            <h2 style={sectionH}>Keep listening</h2>
            <p style={sectionSub}>Or head straight to a crate.</p>
            <div style={{ ...grid, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", marginBottom: 30 }}>
              {(
                [
                  ["music", "🎵", "Music", `${songs.length} songs`],
                  ["videos", "🎬", "Music Videos", `${videos.length} YouTube videos`],
                  ["playlists", "🎶", "Playlists", `${playlists.length} Apple Music playlists`],
                  ["podcasts", "🎙️", "Podcasts", `${podcasts.length} shows`],
                  ["sermons", "✝️", "Sermons", `${sermons.length} messages`],
                ] as [Tab, string, string, string][]
              ).map(([id, emoji, label, count]) => (
                <button key={id} onClick={() => goTab(id)} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "18px 14px", cursor: "pointer", textAlign: "center" }}>
                  <span aria-hidden style={{ fontSize: 28, display: "block", marginBottom: 6 }}>{emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: text, display: "block" }}>{label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: sub }}>{count}</span>
                </button>
              ))}
            </div>

            <h2 style={sectionH}>Trusted ministries</h2>
            <p style={sectionSub}>Every sermon comes from these official ministries — nothing is pulled from an algorithm.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 30 }}>
              {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0).map((m) => (
                <button key={m.key} onClick={() => goTab("ministries")} style={pill(false)}>
                  {m.speaker}
                </button>
              ))}
            </div>

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
              <button onClick={() => { setCategory("music"); const p = spinPool({ category: "music", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={bigButton}>
                🔀 Spin music
              </button>
            </div>
            <p style={sectionSub}>Hand-picked songs from official artist channels. Tap one and it plays right here.</p>
            <VibeChips />
            <div style={{ ...grid, marginBottom: 24 }}>
              {vibeFiltered(songs).map((i) => (
                <MediaCard key={i.id} item={i} />
              ))}
            </div>
            <button onClick={() => goTab("playlists")} className="pop" style={{ width: "100%", background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "16px 20px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Want a whole playlist instead?</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: accent, flexShrink: 0 }}>🎶 Playlists →</span>
            </button>
          </>
        )}

        {tab === "playlists" && (
          <>
            <h2 style={sectionH}>Playlists</h2>
            <p style={sectionSub}>
              The DJ&apos;s own Apple Music playlists — whole mixes, reviewed song by song. They stream right here with an
              Apple Music account (Spotify twins linked where they exist).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {playlists.map((p) => (
                <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
                      {p.summary && <p style={{ fontSize: 13, color: sub, margin: "3px 0 0" }}>{p.summary}</p>}
                    </div>
                    {!openPlaylists[p.id] && (
                      <button onClick={() => { setOpenPlaylists((o) => ({ ...o, [p.id]: true })); track("playlist_open", { content_title: p.title }); }} style={quietButton}>
                        ▶ Show player
                      </button>
                    )}
                  </div>
                  {openPlaylists[p.id] && p.appleEmbed && (
                    <iframe
                      src={p.appleEmbed}
                      title={p.title}
                      loading="lazy"
                      allow="autoplay *; encrypted-media *;"
                      sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
                      style={{ width: "100%", height: 430, border: 0, borderRadius: 12, marginTop: 12, background: "transparent" }}
                    />
                  )}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                      Open in Apple Music ↗
                    </a>
                    {p.spotifyAlt && (
                      <a href={p.spotifyAlt} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
                        Prefer Spotify? ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "videos" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={sectionH}>Music Videos</h2>
              <button onClick={() => { setCategory("videos"); const p = spinPool({ category: "videos", vibe }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={bigButton}>
                🔀 Spin videos
              </button>
            </div>
            <p style={sectionSub}>Official YouTube music videos, straight from the artists&apos; own channels.</p>
            <VibeChips />
            <div style={grid}>
              {vibeFiltered(videos).map((i) => (
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
                <div key={p.id} className="pop" style={{ background: card, border: `2px solid ${current?.id === p.id && started ? activeBorder : border}`, borderRadius: 16, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 900, color: text, margin: 0 }}>{p.title}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "2px 0 0" }}>
                        {p.author}
                        {p.ministry ? ` · ${ministryByKey(p.ministry)?.name}` : ""}
                      </p>
                      {p.summary && <p style={{ fontSize: 13, color: sub, margin: "4px 0 0", lineHeight: 1.5 }}>{p.summary}</p>}
                    </div>
                    {p.spotifyEmbed ? (
                      <button onClick={() => startItem(p)} style={bigButton}>▶ Play here</button>
                    ) : (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ ...quietButton, textDecoration: "none", display: "inline-block" }}>
                        Listen at the official home ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "sermons" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h2 style={sectionH}>Sermons</h2>
              <button onClick={() => { setCategory("sermon"); const p = spinPool({ category: "sermon", vibe, ministry: sermonMinistry }).filter((i) => !unavailable.has(i.id)); const n = pickNext(p, historyRef.current); if (n) startItem(n, true); }} style={bigButton}>
                🔀 Spin a sermon
              </button>
            </div>
            <p style={sectionSub}>Approved ministers, official channels, Christ at the center. Pick one, or let The DJ spin.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <button onClick={() => setSermonMinistry(null)} aria-pressed={sermonMinistry === null} style={pill(sermonMinistry === null)}>
                All ministries
              </button>
              {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0).map((m) => (
                <button key={m.key} onClick={() => setSermonMinistry(sermonMinistry === m.key ? null : m.key)} aria-pressed={sermonMinistry === m.key} style={pill(sermonMinistry === m.key)}>
                  {m.speaker}
                </button>
              ))}
            </div>
            {MINISTRIES.filter((m) => ministryCounts(m).sermons > 0 && (sermonMinistry === null || sermonMinistry === m.key)).map((m) => (
              <section key={m.key} style={{ marginBottom: 30 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: text, margin: "0 0 2px" }}>{m.speaker}</h3>
                <p style={{ fontSize: 13, color: sub, margin: "0 0 12px" }}>{m.name}</p>
                <div style={grid}>
                  {sermons.filter((s) => s.ministry === m.key).map((s) => (
                    <MediaCard key={s.id} item={s} />
                  ))}
                </div>
              </section>
            ))}
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
                  <div key={m.key} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
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
                  <div key={c.id} className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, padding: "18px 20px" }}>
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
    </main>
  );
}
