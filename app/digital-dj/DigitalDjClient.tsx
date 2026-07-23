"use client";

// Digital DJ — a visual, curated session over the approved catalog.
//
// The console (time / media / need dials + optional "tell the DJ") feeds the
// deterministic selector. The result renders as real media: a NOW PLAYING
// card with artwork or a tap-started player, and an UP NEXT queue of rich
// cards. All artwork derives from stored, validated catalog videoIds; other
// media get honest local placeholders. Nothing autoplays on page load and no
// iframe mounts until the visitor chooses to play.

import { useEffect, useRef, useState } from "react";
import ShareSheet, { ShareTrigger } from "../components/ShareMenu";
import { getEmbedUrl, getWatchUrl, type MediaItem } from "../lib/djCaresLibrary";
import { mediaShareTarget, type ShareTarget } from "../lib/shareLinks";
import {
  resultToShareableIds,
  selectMediaForDj,
  shareableIdsToItems,
  type DigitalDjRequest,
  type DjNeed,
} from "../lib/digitalDjSelector";
import {
  attribution,
  describeIntent,
  getItemArtwork,
  hasType,
  longerOf,
  mediaLook,
  parsePrefill,
  sessionDuration,
  shorterOf,
  swapItem,
  thumbUrl,
  typeFirst,
} from "../lib/digitalDjSession";
import { track } from "../lib/analytics";

const DURATIONS = [5, 10, 20, 30, 60] as const;

const PLAYBACK_EXPERIENCES: { id: "listen" | "watch" | "sermon" | "podcast"; label: string; emoji: string }[] = [
  { id: "listen", label: "Listen", emoji: "🎵" },
  { id: "watch", label: "Watch", emoji: "🎬" },
  { id: "sermon", label: "Sermons", emoji: "✝️" },
  { id: "podcast", label: "Podcasts", emoji: "🎙️" },
];

const NEEDS: { id: DjNeed; label: string; emoji: string }[] = [
  { id: "encouragement", label: "Encouragement", emoji: "💪" },
  { id: "joy", label: "Joy", emoji: "😄" },
  { id: "peace", label: "Peace", emoji: "🕊️" },
  { id: "hope", label: "Hope", emoji: "✨" },
  { id: "faith", label: "Faith", emoji: "✝️" },
  { id: "family", label: "Family", emoji: "👪" },
  { id: "morning", label: "Morning", emoji: "🌅" },
  { id: "evening", label: "Evening", emoji: "🌙" },
  { id: "surprise", label: "Surprise me", emoji: "🎲" },
];

type PlaybackExperienceId = (typeof PLAYBACK_EXPERIENCES)[number]["id"];

export default function DigitalDjClient({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const [dark, setDark] = useState(true);

  // --- console state ---
  const [duration, setDuration] = useState<number>(10);
  const [playbackExperiences, setPlaybackExperiences] = useState<ReadonlySet<PlaybackExperienceId>>(new Set());
  const [needs, setNeeds] = useState<ReadonlySet<DjNeed>>(new Set());
  const [userText, setUserText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // --- session state ---
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [requested, setRequested] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false); // only ever true after a tap
  const [copied, setCopied] = useState(false);
  const [shareUrlFallback, setShareUrlFallback] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTriggerId, setShareTriggerId] = useState<string | null>(null);
  const nowPlayingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const follow = () => setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // Shared sessions (?ids=…) cue up without autoplay; homepage console
  // prefills (?t/?need/?media) are whitelist-validated in parsePrefill.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids");
    if (ids) {
      const shared = shareableIdsToItems(ids);
      if (shared.length > 0) {
        setItems(shared);
        setRequested(0);
        track("digital_dj_shared_session_opened", { itemCount: shared.length });
        return;
      }
    }
    const pre = parsePrefill(params);
    if (pre.duration) setDuration(pre.duration);
    if (pre.need) setNeeds(new Set([pre.need as DjNeed]));
    if (pre.media) setPlaybackExperiences(new Set([pre.media as PlaybackExperienceId]));
  }, []);

  const toggle = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const cue = (overrides: Partial<DigitalDjRequest> = {}) => {
    const request: DigitalDjRequest = {
      durationMinutes: duration,
      playbackExperiences: playbackExperiences.size > 0 ? [...playbackExperiences] : undefined,
      needs: needs.size > 0 ? [...needs] : undefined,
      ...overrides,
    };
    const djResult = selectMediaForDj(request);
    setItems(djResult.items);
    setRequested(request.durationMinutes);
    setCurrentIndex(0);
    setPlayerOpen(false);
    setCopied(false);
    setShareUrlFallback(null);
    setAnnounce(
      djResult.items.length === 0
        ? "Nothing matches that combination yet."
        : `Session ready: ${djResult.items.length} picks, about ${djResult.durationMinutes} minutes.`,
    );
    track("digital_dj_selection_generated", {
      duration: request.durationMinutes,
      itemCount: djResult.items.length,
    });
  };

  const askTheDj = async () => {
    const text = userText.trim();
    if (!text) return;
    setLoadingAi(true);
    setAiSummary("");
    try {
      const res = await fetch("/api/digital-dj/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text }),
      });
      const data = res.ok ? await res.json() : { intent: null };
      const intent = data?.intent ?? null;
      if (intent) {
        if (intent.durationMinutes) setDuration(intent.durationMinutes);
        if (intent.playbackExperiences?.length) setPlaybackExperiences(new Set(intent.playbackExperiences));
        if (intent.needs?.length) setNeeds(new Set(intent.needs));
        cue({
          durationMinutes: intent.durationMinutes ?? duration,
          playbackExperiences: intent.playbackExperiences?.length ? intent.playbackExperiences : undefined,
          needs: intent.needs?.length ? intent.needs : undefined,
          requestedCreator: intent.requestedCreator ?? undefined,
        });
        setAiSummary(describeIntent(intent));
        track("digital_dj_ai_parsing_success", {});
      } else {
        cue();
        setAiSummary(res.status === 429 ? "The DJ needs a breather — cued from your dials instead." : "");
      }
    } catch {
      cue();
    } finally {
      setLoadingAi(false);
      setUserText("");
    }
  };

  const playIndex = (idx: number) => {
    setCurrentIndex(idx);
    setPlayerOpen(true);
    const item = items?.[idx];
    if (item) {
      setAnnounce(`Now playing: ${item.title} — ${item.author}`);
      track("digital_dj_play_current", { itemId: item.id });
    }
    window.setTimeout(() => nowPlayingRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };

  const swapAt = (idx: number) => {
    if (!items) return;
    const next = swapItem(items, idx);
    if (!next) {
      setAnnounce("The catalog has nothing else like that right now.");
      return;
    }
    setItems(next);
    if (idx === currentIndex) setPlayerOpen(false); // don't hot-swap a playing embed
    setAnnounce(`Swapped in: ${next[idx].title} — ${next[idx].author}`);
    track("digital_dj_swap", { itemId: next[idx].id });
  };

  const bringTypeFirst = (kind: "music" | "sermon") => {
    if (!items) return;
    setItems(typeFirst(items, kind));
    setCurrentIndex(0);
    setPlayerOpen(false);
    setAnnounce(kind === "music" ? "Music moved to the front." : "Sermon moved to the front.");
  };

  const shareSession = async () => {
    if (!items || items.length === 0) return;
    const url = `${window.location.origin}/digital-dj?ids=${encodeURIComponent(
      resultToShareableIds({ items, durationMinutes: 0, requestedMinutes: 0, truncated: false }),
    )}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "A session from The DJ Cares", url });
        track("digital_dj_session_shared", { itemCount: items.length });
      } catch {
        // Visitor closed the native sheet — stay quiet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable — show the link itself so it can be copied.
      setShareUrlFallback(url);
    }
    track("digital_dj_session_shared", { itemCount: items.length });
  };

  // --- family palette ---
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
    padding: "8px 12px",
    fontSize: "clamp(12px, 2.5vw, 13.5px)",
    fontWeight: 800,
    cursor: "pointer",
    color: selected ? accent : sub,
    textAlign: "center",
    minWidth: 0,
    whiteSpace: "normal",
    lineHeight: 1.2,
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
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
    padding: "10px 16px",
    fontSize: 13.5,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const heading: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: sub,
    margin: "0 0 10px",
  };

  const badgeChip = (look: { badge: string; emoji: string }): React.CSSProperties => ({
    position: "absolute",
    left: 8,
    top: 8,
    background: "rgba(0,0,0,0.72)",
    color: "#fff",
    borderRadius: 8,
    padding: "2px 8px",
    fontSize: 11.5,
    fontWeight: 800,
  });

  const durationChip: React.CSSProperties = {
    position: "absolute",
    right: 8,
    bottom: 8,
    background: "rgba(0,0,0,0.72)",
    color: "#fff",
    borderRadius: 8,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 800,
  };

  const sharePalette = { card, border, text, sub, accent };
  const openShare = (target: ShareTarget, triggerId: string) => {
    setShareTarget(target);
    setShareTriggerId(triggerId);
  };

  // Artwork or an honest local placeholder — square for Listen (playlists), 16:9 for Watch (videos).
  const Artwork = ({ item, size }: { item: MediaItem; size: "small" | "large" }) => {
    const look = mediaLook(item);
    const src = getItemArtwork(item, size);
    const isListen = item.playbackExperience === "listen";
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: isListen ? "1" : "16 / 9", background: "#000", overflow: "hidden" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: `linear-gradient(135deg, ${look.tint}, #1c2740)`,
              color: "#fff",
            }}
          >
            <span style={{ fontSize: size === "small" ? 22 : 40 }}>{look.emoji}</span>
            {size === "large" && <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}>{look.badge}</span>}
          </div>
        )}
        {size === "large" && (
          <span style={badgeChip(look)}>
            {look.emoji} {look.badge}
          </span>
        )}
        {size === "large" && item.duration && <span style={durationChip}>{item.duration}</span>}
      </div>
    );
  };

  const current = items?.[currentIndex] ?? null;
  const embed = current ? getEmbedUrl(current) : null;
  // Autoplay only ever follows the visitor's own tap; page load never sounds.
  const embedSrc = embed && current?.videoId ? `${embed}&autoplay=1` : embed;
  const timing = items ? sessionDuration(items) : null;
  const upNext = items ? items.map((item, idx) => ({ item, idx })).filter(({ idx }) => idx !== currentIndex) : [];

  return (
    <main style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        <p aria-live="polite" role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {announce}
        </p>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1 style={{ fontSize: "clamp(1.7rem, 7vw, 2.3rem)", fontWeight: 900, color: text, margin: "0 0 8px" }}>
            Digital <span style={{ color: accent }}>DJ</span> <span aria-hidden>🎛️</span>
          </h1>
          <p style={{ fontSize: 15, color: sub, lineHeight: 1.55, maxWidth: 480, margin: "0 auto" }}>
            Choose your time and mood. The DJ cues a session from the same hand-approved library as the rest of the site.
          </p>
        </div>

        {/* ---- the console ---- */}
        <section aria-label="DJ console" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20 }}>
          <p style={heading}>How much time do you have?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => setDuration(d)} aria-pressed={duration === d} style={pill(duration === d)}>
                {d}m
              </button>
            ))}
          </div>

          <p style={heading}>
            What kind? <span style={{ fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>(none selected = a mix)</span>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
            {PLAYBACK_EXPERIENCES.map((m) => (
              <button key={m.id} onClick={() => setPlaybackExperiences(toggle(playbackExperiences, m.id))} aria-pressed={playbackExperiences.has(m.id)} style={pill(playbackExperiences.has(m.id))}>
                <span aria-hidden>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>

          <p style={heading}>What do you need right now?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 18 }}>
            {NEEDS.map((n) => (
              <button key={n.id} onClick={() => setNeeds(toggle(needs, n.id))} aria-pressed={needs.has(n.id)} style={pill(needs.has(n.id))}>
                <span aria-hidden>{n.emoji}</span> {n.label}
              </button>
            ))}
          </div>

          {aiEnabled && (
            <>
              <p style={heading}>
                Or tell the DJ <span style={{ fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>(optional)</span>
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") askTheDj();
                  }}
                  maxLength={300}
                  placeholder="“Ten minutes of encouragement before work”"
                  aria-label="Tell the DJ what you need"
                  style={{
                    flex: "1 1 200px",
                    minWidth: 0,
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: 14,
                    color: text,
                    fontSize: 15,
                    padding: "12px 14px",
                  }}
                />
                <button onClick={askTheDj} disabled={loadingAi || !userText.trim()} style={{ ...quietButton, opacity: loadingAi || !userText.trim() ? 0.55 : 1 }}>
                  {loadingAi ? "Listening…" : "Ask the DJ"}
                </button>
              </div>
            </>
          )}
          {aiSummary && (
            <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: "0 0 6px" }}>
              <span aria-hidden>🎧 </span>The DJ heard: {aiSummary}
            </p>
          )}

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => cue()} style={bigButton}>
              🎛️ Cue my session
            </button>
          </div>
        </section>

        {/* ---- empty state ---- */}
        {items && items.length === 0 && (
          <section style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <p style={{ fontSize: 15, color: text, fontWeight: 800, margin: "0 0 6px" }}>Nothing matches that combination yet.</p>
            <p style={{ fontSize: 13.5, color: sub, margin: "0 0 14px" }}>Try fewer filters, or let the DJ surprise you.</p>
            <button
              onClick={() => {
                setPlaybackExperiences(new Set());
                setNeeds(new Set());
                cue({ playbackExperiences: undefined, needs: undefined });
              }}
              style={quietButton}
            >
              Clear filters and cue again
            </button>
          </section>
        )}

        {/* ---- the session ---- */}
        {items && items.length > 0 && current && timing && (
          <section aria-label="Your session" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <p style={{ ...heading, color: accent, margin: 0 }}>
                Your session · {items.length} pick{items.length === 1 ? "" : "s"} · {timing.allKnown ? "" : "about "}
                {timing.minutes} min
              </p>
            </div>
            {requested > 0 && timing.minutes > requested && (
              <p style={{ fontSize: 12.5, color: sub, margin: "0 0 12px" }}>
                Runs past your {requested} minutes — the closest full-length match in the library.
              </p>
            )}

            {/* NOW PLAYING */}
            <div ref={nowPlayingRef} style={{ border: `2px solid ${activeBorder}`, borderRadius: 16, overflow: "hidden", marginBottom: 8 }}>
              {/* For Listen items: always show square cover as main visual; embed below if playing. */}
              {/* For Watch items: show embed when playing, cover otherwise. */}
              {current.playbackExperience === "listen" ? (
                <>
                  <button
                    onClick={() => playIndex(currentIndex)}
                    aria-label={`Listen to ${current.title} from ${current.author}`}
                    style={{ display: "block", width: "100%", position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <Artwork item={current} size="large" />
                    {!playerOpen && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 46,
                          textShadow: "0 2px 18px rgba(0,0,0,0.65)",
                        }}
                      >
                        ▶️
                      </span>
                    )}
                  </button>
                  {playerOpen && embedSrc && (
                    <iframe
                      key={current.id}
                      src={embedSrc}
                      title={`${current.title} from ${current.author}`}
                      allow="encrypted-media; picture-in-picture"
                      style={{
                        width: "100%",
                        height: 352,
                        border: 0,
                        display: "block",
                        background: "#000",
                      }}
                    />
                  )}
                </>
              ) : playerOpen && embedSrc ? (
                <iframe
                  key={current.id}
                  src={embedSrc}
                  title={`${current.title} — ${current.author}`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{
                    width: "100%",
                    aspectRatio: current.videoId ? "16 / 9" : undefined,
                    height: current.videoId ? undefined : 352,
                    border: 0,
                    display: "block",
                    background: "#000",
                  }}
                />
              ) : (
                <button
                  onClick={() => playIndex(currentIndex)}
                  aria-label={`Play ${current.title} by ${current.author}`}
                  style={{ display: "block", width: "100%", position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <Artwork item={current} size="large" />
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 46,
                      textShadow: "0 2px 18px rgba(0,0,0,0.65)",
                    }}
                  >
                    ▶️
                  </span>
                </button>
              )}
              <div style={{ padding: "12px 14px", background: active }}>
                <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: accent, margin: "0 0 4px" }}>
                  {playerOpen && (
                    <span className="djc-eq" aria-hidden>
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  {current.playbackExperience === "listen" ? "Now listening" : "Now playing"}
                </p>
                <p style={{ fontSize: 16, fontWeight: 800, color: text, margin: 0 }}>{current.title}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: sub, margin: "2px 0 0" }}>
                  {attribution(current)}
                  {current.duration ? ` · ${current.duration}` : ""}
                </p>
                {current.summary && <p style={{ fontSize: 13, color: sub, margin: "6px 0 0", lineHeight: 1.5 }}>{current.summary}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {!playerOpen && (
                    <button onClick={() => playIndex(currentIndex)} style={{ ...bigButton, padding: "10px 20px", fontSize: 14 }}>
                      ▶ {currentIndex === 0 && !playerOpen ? "Start session" : "Play"}
                    </button>
                  )}
                  <button onClick={() => swapAt(currentIndex)} style={quietButton}>
                    🔁 Swap this
                  </button>
                  <ShareTrigger target={mediaShareTarget(current)} scope="dj" palette={sharePalette} onOpen={openShare} />
                  <a
                    href={getWatchUrl(current)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    {current.playbackExperience === "listen"
                      ? "Listen in Apple Music ↗"
                      : current.videoId
                        ? "Open on YouTube ↗"
                        : "Open the official source ↗"}
                  </a>
                </div>
              </div>
            </div>

            {/* UP NEXT */}
            {upNext.length > 0 && (
              <>
                <p style={{ ...heading, margin: "14px 0 8px" }}>Up next</p>
                <ol style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {upNext.map(({ item, idx }) => (
                    <li key={`${item.id}-${idx}`} style={{ display: "flex", gap: 0, border: `2px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
                      <button
                        onClick={() => playIndex(idx)}
                        aria-label={`Play ${item.title} by ${item.author}`}
                        style={{
                          display: "flex",
                          alignItems: "stretch",
                          gap: 12,
                          flex: 1,
                          minWidth: 0,
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          textAlign: "left",
                          color: "inherit",
                          font: "inherit",
                        }}
                      >
                        <span style={{ position: "relative", width: 112, flexShrink: 0, alignSelf: "stretch", minHeight: 63 }}>
                          <span style={{ position: "absolute", inset: 0, display: "block" }}>
                            <Artwork item={item} size="small" />
                          </span>
                        </span>
                        <span style={{ minWidth: 0, padding: "8px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.title}
                          </span>
                          <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {attribution(item)}
                            {item.duration ? ` · ${item.duration}` : ""}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => swapAt(idx)}
                        aria-label={`Swap out ${item.title}`}
                        style={{ background: "none", border: "none", borderLeft: `2px solid ${border}`, color: sub, fontSize: 15, padding: "0 12px", cursor: "pointer" }}
                      >
                        🔁
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* session controls */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => cue()} style={quietButton}>
                🎛️ Cue another
              </button>
              {duration > 5 && (
                <button
                  onClick={() => {
                    const d = shorterOf(duration);
                    setDuration(d);
                    cue({ durationMinutes: d });
                  }}
                  style={quietButton}
                >
                  − Shorter
                </button>
              )}
              {duration < 60 && (
                <button
                  onClick={() => {
                    const d = longerOf(duration);
                    setDuration(d);
                    cue({ durationMinutes: d });
                  }}
                  style={quietButton}
                >
                  + Longer
                </button>
              )}
              {items.length > 1 && hasType(items, "music") && items[0].type !== "music" && (
                <button onClick={() => bringTypeFirst("music")} style={quietButton}>
                  🎵 Music first
                </button>
              )}
              {items.length > 1 && hasType(items, "sermon") && items[0].type !== "sermon" && (
                <button onClick={() => bringTypeFirst("sermon")} style={quietButton}>
                  ✝️ Sermon first
                </button>
              )}
              <button onClick={shareSession} style={quietButton}>
                {copied ? "✓ Link copied" : "📤 Share session"}
              </button>
            </div>
            {shareUrlFallback && (
              <div style={{ marginTop: 10 }}>
                <label htmlFor="djc-share-url" style={{ display: "block", fontSize: 12, fontWeight: 800, color: sub, marginBottom: 4 }}>
                  Copy this session link:
                </label>
                <input
                  id="djc-share-url"
                  type="text"
                  readOnly
                  value={shareUrlFallback}
                  onFocus={(e) => e.currentTarget.select()}
                  style={{ width: "100%", background: bg, border: `2px solid ${border}`, borderRadius: 12, color: text, fontSize: 13, padding: "10px 12px" }}
                />
              </div>
            )}
          </section>
        )}

        <p style={{ textAlign: "center", marginTop: 22 }}>
          <a href="/" style={{ fontSize: 13.5, fontWeight: 800, color: sub, textDecoration: "none" }}>
            ← Back to The DJ Cares
          </a>
        </p>
      </div>

      <ShareSheet target={shareTarget} triggerId={shareTriggerId} palette={sharePalette} onClose={() => setShareTarget(null)} />
    </main>
  );
}
