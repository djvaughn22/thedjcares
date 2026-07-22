"use client";

// Digital DJ — a conversational selector for the approved catalog.
//
// The visitor answers "how long / what kind / what do you need," and the
// deterministic selector (app/lib/digitalDjSelector.ts) builds a session
// from the same approved library the rest of the site plays. The optional
// "Tell the DJ" field asks the server to translate free text into those
// same filters — it can never add media. Nothing autoplays on load; the
// player mounts only after a tap.

import { useEffect, useRef, useState } from "react";
import ShareSheet, { ShareTrigger } from "../components/ShareMenu";
import { getEmbedUrl, getWatchUrl, type MediaItem } from "../lib/djCaresLibrary";
import { mediaShareTarget, type ShareTarget } from "../lib/shareLinks";
import {
  estimateDuration,
  NEED_TO_VIBES,
  resultToShareableIds,
  selectMediaForDj,
  shareableIdsToItems,
  type DigitalDjRequest,
  type DigitalDjResult,
  type DjNeed,
} from "../lib/digitalDjSelector";
import { track } from "../lib/analytics";

const DURATIONS = [5, 10, 20, 30, 60] as const;

const MEDIA_TYPES: { id: "music" | "music_video" | "sermon" | "podcast"; label: string; emoji: string }[] = [
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "music_video", label: "Music Videos", emoji: "🎬" },
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

type MediaTypeId = (typeof MEDIA_TYPES)[number]["id"];

// Reverse of NEED_TO_VIBES — lets "Another like this" reuse an item's vibes.
const needsForItem = (item: MediaItem): DjNeed[] => {
  const needs = new Set<DjNeed>();
  for (const [need, vibes] of Object.entries(NEED_TO_VIBES) as [DjNeed, string[]][]) {
    if (need === "surprise") continue;
    if (item.vibes.some((v) => vibes.includes(v))) needs.add(need);
  }
  return [...needs];
};

const sessionMinutes = (items: MediaItem[]) =>
  Math.max(1, Math.round(items.reduce((sum, i) => sum + estimateDuration(i), 0) / 60));

export default function DigitalDjClient({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const [dark, setDark] = useState(true);

  // --- selection state ---
  const [duration, setDuration] = useState<number>(10);
  const [mediaTypes, setMediaTypes] = useState<ReadonlySet<MediaTypeId>>(new Set());
  const [needs, setNeeds] = useState<ReadonlySet<DjNeed>>(new Set());
  const [userText, setUserText] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiNote, setAiNote] = useState("");

  // --- session state ---
  const [result, setResult] = useState<DigitalDjResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false); // only ever true after a tap
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTriggerId, setShareTriggerId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Follow the family ☀️/🌙 toggle.
  useEffect(() => {
    const follow = () => setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // A shared session (?ids=…) cues up — it never autoplays. Unknown ids are
  // ignored by shareableIdsToItems, so tampered links just come up shorter
  // (or fall through to the picker when nothing survives).
  useEffect(() => {
    const ids = new URLSearchParams(window.location.search).get("ids");
    if (!ids) return;
    const items = shareableIdsToItems(ids);
    if (items.length === 0) return;
    setResult({ items, durationMinutes: sessionMinutes(items), requestedMinutes: 0, truncated: false });
    track("digital_dj_shared_session_opened", { itemCount: items.length });
  }, []);

  const toggle = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  // Build + run a request. `overrides` lets the AI path apply parsed intent
  // immediately instead of racing setState.
  const generate = (overrides: Partial<DigitalDjRequest> = {}) => {
    const request: DigitalDjRequest = {
      durationMinutes: duration,
      mediaTypes: mediaTypes.size > 0 ? [...mediaTypes] : undefined,
      needs: needs.size > 0 ? [...needs] : undefined,
      ...overrides,
    };
    const djResult = selectMediaForDj(request);
    setResult(djResult);
    setCurrentIndex(0);
    setPlayerOpen(false);
    setCopied(false);
    setAnnounce(
      djResult.items.length === 0
        ? "Nothing matches that combination yet."
        : `Session ready: ${djResult.items.length} picks, about ${djResult.durationMinutes} minutes.`,
    );
    track("digital_dj_selection_generated", {
      duration: request.durationMinutes,
      itemCount: djResult.items.length,
      usedAi: Boolean(overrides.durationMinutes || overrides.mediaTypes || overrides.needs),
    });
  };

  // "Tell the DJ" → server intent parse → same deterministic selector.
  // Every failure path quietly runs the deterministic selection instead.
  const askTheDj = async () => {
    const text = userText.trim();
    if (!text) return;
    setLoadingAi(true);
    setAiNote("");
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
        if (intent.mediaTypes?.length) setMediaTypes(new Set(intent.mediaTypes));
        if (intent.needs?.length) setNeeds(new Set(intent.needs));
        generate({
          durationMinutes: intent.durationMinutes ?? duration,
          mediaTypes: intent.mediaTypes?.length ? intent.mediaTypes : undefined,
          needs: intent.needs?.length ? intent.needs : undefined,
          requestedCreator: intent.requestedCreator ?? undefined,
        });
        setAiNote("The DJ read your note and set the dials.");
        track("digital_dj_ai_parsing_success", {});
      } else {
        generate();
        setAiNote(res.status === 429 ? "The DJ needs a breather — picks made from your dials instead." : "");
      }
    } catch {
      generate();
    } finally {
      setLoadingAi(false);
      setUserText("");
    }
  };

  const openItem = (idx: number) => {
    setCurrentIndex(idx);
    setPlayerOpen(true);
    const item = result?.items[idx];
    if (item) {
      setAnnounce(`Now playing: ${item.title} — ${item.author}`);
      track("digital_dj_play_current", { itemId: item.id });
    }
    window.setTimeout(() => playerRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
  };

  const anotherLikeThis = () => {
    const item = result?.items[currentIndex];
    if (!item) return;
    const likeType: MediaTypeId =
      item.type === "music" ? (item.musicVideo ? "music_video" : "music")
      : item.type === "sermon" ? "sermon"
      : item.type === "podcast" ? "podcast"
      : "music";
    const likeNeeds = needsForItem(item);
    generate({
      durationMinutes: 10,
      mediaTypes: [likeType],
      needs: likeNeeds.length > 0 ? likeNeeds : undefined,
    });
    track("digital_dj_another_like_this", { originalItemId: item.id });
  };

  const shareSession = async () => {
    if (!result || result.items.length === 0) return;
    const url = `${window.location.origin}/digital-dj?ids=${encodeURIComponent(resultToShareableIds(result))}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "A session from The DJ Cares", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
      track("digital_dj_session_shared", { itemCount: result.items.length });
    } catch {
      // Visitor cancelled the native sheet — that's fine, stay quiet.
    }
  };

  // --- palette: identical to the home page ---
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
    padding: "10px 8px",
    fontSize: 13.5,
    fontWeight: 800,
    cursor: "pointer",
    color: selected ? accent : sub,
    textAlign: "center",
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
    fontSize: 14,
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

  const sharePalette = { card, border, text, sub, accent };
  const openShare = (target: ShareTarget, triggerId: string) => {
    setShareTarget(target);
    setShareTriggerId(triggerId);
  };

  const current = result?.items[currentIndex] ?? null;
  const embed = current ? getEmbedUrl(current) : null;
  // Autoplay only ever follows the visitor's own tap (playerOpen), and only
  // for the YouTube player; page load never makes a sound.
  const embedSrc = embed && current?.videoId ? `${embed}&autoplay=1` : embed;

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
            Tell the DJ how much time you have and what you need. Every pick comes from the same
            hand-approved library as the rest of the site.
          </p>
        </div>

        {/* ---- the dials ---- */}
        <section aria-label="Build a session" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px", marginBottom: 20 }}>
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
            {MEDIA_TYPES.map((m) => (
              <button key={m.id} onClick={() => setMediaTypes(toggle(mediaTypes, m.id))} aria-pressed={mediaTypes.has(m.id)} style={pill(mediaTypes.has(m.id))}>
                <span aria-hidden>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>

          <p style={heading}>What do you need right now?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 18 }}>
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
                  placeholder="“Ten minutes of peace before work”"
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
              {aiNote && <p style={{ fontSize: 13, color: sub, margin: "0 0 6px" }}>{aiNote}</p>}
            </>
          )}

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => generate()} style={bigButton}>
              🎛️ Spin something for me
            </button>
          </div>
        </section>

        {/* ---- empty state ---- */}
        {result && result.items.length === 0 && (
          <section style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <p style={{ fontSize: 15, color: text, fontWeight: 800, margin: "0 0 6px" }}>Nothing matches that combination yet.</p>
            <p style={{ fontSize: 13.5, color: sub, margin: "0 0 14px" }}>Try fewer filters, or let the DJ surprise you.</p>
            <button
              onClick={() => {
                setMediaTypes(new Set());
                setNeeds(new Set());
                generate({ mediaTypes: undefined, needs: undefined });
              }}
              style={quietButton}
            >
              Clear filters and spin again
            </button>
          </section>
        )}

        {/* ---- the session ---- */}
        {result && result.items.length > 0 && (
          <section aria-label="Your session" style={{ background: card, border: `2px solid ${border}`, borderRadius: 22, padding: "20px 20px 22px" }}>
            <p style={{ ...heading, color: accent }}>
              Your session · {result.items.length} pick{result.items.length === 1 ? "" : "s"} · about {result.durationMinutes} min
            </p>

            {/* now playing (mounts only after a tap) */}
            {playerOpen && current && (
              <div ref={playerRef} style={{ marginBottom: 16 }}>
                {embedSrc ? (
                  <iframe
                    key={current.id}
                    src={embedSrc}
                    title={`${current.title} — ${current.author}`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    style={{ width: "100%", aspectRatio: "16 / 9", border: 0, borderRadius: 14, background: "#000" }}
                  />
                ) : null}
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: 0 }}>{current.title}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: accent, margin: 0 }}>{current.author}</p>
                  </div>
                  <a href={getWatchUrl(current)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 800, color: sub, textDecoration: "none", whiteSpace: "nowrap" }}>
                    {current.videoId ? "Open on YouTube ↗" : "Open the official source ↗"}
                  </a>
                </div>
              </div>
            )}

            {/* the list — current highlighted, the rest are up next */}
            <ol style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {result.items.map((item, idx) => {
                const isCurrent = idx === currentIndex && playerOpen;
                const isUpNext = playerOpen && idx === currentIndex + 1;
                return (
                  <li key={`${item.id}-${idx}`}>
                    <button
                      onClick={() => openItem(idx)}
                      aria-label={`Play ${item.title} by ${item.author}`}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        background: isCurrent ? active : "none",
                        border: `2px solid ${isCurrent ? activeBorder : border}`,
                        borderRadius: 14,
                        padding: "10px 14px",
                        cursor: "pointer",
                        color: "inherit",
                        font: "inherit",
                      }}
                    >
                      <span style={{ display: "block", fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: isCurrent ? accent : sub }}>
                        {isCurrent ? "Now playing" : isUpNext ? "Up next" : `${idx + 1}.`}
                      </span>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: sub }}>
                        {item.author}
                        {item.duration ? ` · ${item.duration}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {!playerOpen && (
                <button onClick={() => openItem(0)} style={bigButton}>
                  ▶ Play
                </button>
              )}
              {playerOpen && (
                <>
                  <button onClick={() => currentIndex > 0 && openItem(currentIndex - 1)} disabled={currentIndex === 0} style={{ ...quietButton, opacity: currentIndex === 0 ? 0.5 : 1 }}>
                    ⏮ Previous
                  </button>
                  <button
                    onClick={() => currentIndex < result.items.length - 1 && openItem(currentIndex + 1)}
                    disabled={currentIndex >= result.items.length - 1}
                    style={{ ...quietButton, opacity: currentIndex >= result.items.length - 1 ? 0.5 : 1 }}
                  >
                    ⏭ Next
                  </button>
                  <button onClick={anotherLikeThis} style={quietButton}>
                    🔁 Another like this
                  </button>
                  {current && <ShareTrigger target={mediaShareTarget(current)} scope="dj" palette={sharePalette} onOpen={openShare} />}
                </>
              )}
              <button onClick={shareSession} style={quietButton}>
                {copied ? "✓ Link copied" : "📤 Share session"}
              </button>
            </div>
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
