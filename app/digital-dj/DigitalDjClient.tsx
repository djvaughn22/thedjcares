"use client";

import { useEffect, useState } from "react";
import ShareSheet, { ShareTrigger } from "../components/ShareMenu";
import {
  artworkUrl,
  getWatchUrl,
  type MediaItem,
} from "../lib/djCaresLibrary";
import {
  mediaShareTarget,
  type ShareTarget,
} from "../lib/shareLinks";
import {
  selectMediaForDj,
  resultToShareableIds,
  shareableIdsToItems,
  type DjNeed,
  type DigitalDjRequest,
  type DigitalDjResult,
} from "../lib/digitalDjSelector";
import { track } from "../lib/analytics";

const DURATIONS = [5, 10, 20, 30, 60] as const;
const MEDIA_TYPES: Array<{ id: string; label: string; type: "music" | "music_video" | "sermon" | "podcast" }> = [
  { id: "music", label: "Music", type: "music" },
  { id: "music_video", label: "Music Videos", type: "music_video" },
  { id: "sermon", label: "Sermons", type: "sermon" },
  { id: "podcast", label: "Podcasts", type: "podcast" },
];
const NEEDS: Array<{ id: DjNeed; label: string; icon: string }> = [
  { id: "encouragement", label: "Encouragement", icon: "💪" },
  { id: "joy", label: "Joy", icon: "😄" },
  { id: "peace", label: "Peace", icon: "🕊️" },
  { id: "hope", label: "Hope", icon: "✨" },
  { id: "faith", label: "Faith", icon: "✝️" },
  { id: "family", label: "Family", icon: "👨‍👩‍👧" },
  { id: "morning", label: "Morning", icon: "🌅" },
  { id: "evening", label: "Evening", icon: "🌙" },
  { id: "surprise", label: "Surprise Me", icon: "🎲" },
];

export default function DigitalDjClient() {
  const [dark, setDark] = useState(true);

  // UI state.
  const [duration, setDuration] = useState(10);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<Set<string>>(new Set());
  const [selectedNeeds, setSelectedNeeds] = useState<Set<DjNeed>>(new Set());
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  // Result state.
  const [result, setResult] = useState<DigitalDjResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Share state.
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTriggerId, setShareTriggerId] = useState<string | null>(null);

  // Follow the family theme toggle.
  useEffect(() => {
    const follow = () => setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // Load shared session from URL params if present.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get("ids");
    if (ids) {
      const items = shareableIdsToItems(ids);
      if (items.length > 0) {
        setResult({
          items,
          durationMinutes: Math.round(items.reduce((sum, i) => sum + (parseInt(i.duration || "0") || 60), 0) / 60),
          requestedMinutes: 0,
          truncated: false,
        });
        track("digital_dj_shared_session_opened", { itemCount: items.length });
      }
    }
  }, []);

  const handleMediaTypeToggle = (type: string) => {
    const next = new Set(selectedMediaTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelectedMediaTypes(next);
  };

  const handleNeedToggle = (need: DjNeed) => {
    const next = new Set(selectedNeeds);
    if (next.has(need)) {
      next.delete(need);
    } else {
      next.add(need);
    }
    setSelectedNeeds(next);
  };

  const generateSelection = () => {
    setLoading(true);
    try {
      const request: DigitalDjRequest = {
        durationMinutes: duration,
        mediaTypes:
          selectedMediaTypes.size > 0
            ? Array.from(selectedMediaTypes).map((t) => {
                const found = MEDIA_TYPES.find((m) => m.id === t);
                return found ? found.type : undefined;
              })
            : undefined,
        needs: selectedNeeds.size > 0 ? Array.from(selectedNeeds) : undefined,
      };

      const djResult = selectMediaForDj(request);
      setResult(djResult);
      setCurrentIndex(0);
      setPlaying(false);

      track("digital_dj_selection_generated", {
        duration,
        itemCount: djResult.items.length,
        hadMediaTypeFilter: selectedMediaTypes.size > 0,
        hadNeedFilter: selectedNeeds.size > 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!userText.trim()) return;

    setLoadingAi(true);
    try {
      const response = await fetch("/api/digital-dj/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText }),
      });

      if (!response.ok) {
        console.error("AI parsing failed:", response.status);
        // Fall back to deterministic selection.
        generateSelection();
        return;
      }

      const data = await response.json();
      if (data.intent) {
        // Apply AI-parsed intent to current selections.
        if (data.intent.durationMinutes) {
          setDuration(data.intent.durationMinutes);
        }
        if (data.intent.mediaTypes && data.intent.mediaTypes.length > 0) {
          const typeIds = new Set(
            data.intent.mediaTypes
              .map((t: string) => {
                const found = MEDIA_TYPES.find((m) => m.type === t);
                return found?.id;
              })
              .filter((id) => id !== undefined) as string[],
          );
          setSelectedMediaTypes(typeIds);
        }
        if (data.intent.needs && data.intent.needs.length > 0) {
          setSelectedNeeds(new Set(data.intent.needs));
        }

        track("digital_dj_ai_parsing_success", {
          extractedDuration: data.intent.durationMinutes,
          extractedMediaTypes: data.intent.mediaTypes?.length || 0,
          extractedNeeds: data.intent.needs?.length || 0,
        });
      }

      // Generate with applied filters.
      setUserText("");
      generateSelection();
    } catch (error) {
      console.error("AI enhance error:", error);
      // Fall back to deterministic.
      generateSelection();
    } finally {
      setLoadingAi(false);
    }
  };

  const handlePlayCurrent = () => {
    if (result && result.items.length > 0) {
      setPlaying(true);
      track("digital_dj_play_current", { itemId: result.items[currentIndex].id });
    }
  };

  const handleNextItem = () => {
    if (result && currentIndex < result.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPlaying(true);
    }
  };

  const handlePrevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setPlaying(true);
    }
  };

  const handleAnotherLikeThis = () => {
    if (result && result.items.length > 0) {
      const current = result.items[currentIndex];
      const request: DigitalDjRequest = {
        durationMinutes: 10,
        mediaTypes: [current.type as any],
        needs:
          current.vibes && current.vibes.length > 0
            ? (current.vibes.filter((v) => Object.keys(NEEDS).includes(v)) as any)
            : undefined,
      };

      const djResult = selectMediaForDj(request);
      if (djResult.items.length > 0) {
        setResult(djResult);
        setCurrentIndex(0);
        setPlaying(true);
        track("digital_dj_another_like_this", { originalItemId: current.id });
      }
    }
  };

  const handleShareCurrent = () => {
    if (result && result.items.length > 0) {
      const target = mediaShareTarget(result.items[currentIndex]);
      setShareTarget(target);
      setShareTriggerId(`dj-${result.items[currentIndex].id}`);
    }
  };

  const handleShareSession = () => {
    if (result && result.items.length > 0) {
      const ids = resultToShareableIds(result);
      const url = `${window.location.origin}/digital-dj?ids=${encodeURIComponent(ids)}`;
      // Copy to clipboard and show feedback.
      navigator.clipboard.writeText(url);
      alert("Session link copied!");
      track("digital_dj_session_shared", { itemCount: result.items.length });
    }
  };

  const currentItem = result && result.items[currentIndex];
  const hasResult = result && result.items.length > 0;

  // Palette for share menu.
  const shareBg = dark ? "#141d2e" : "#ffffff";
  const shareBorder = dark ? "#26324c" : "#dbe2ea";
  const shareText = dark ? "#e8edf5" : "#0f172a";
  const shareSub = dark ? "#94a3b8" : "#475569";
  const shareAccent = "#A78BFA";

  const sharePalette = {
    card: shareBg,
    border: shareBorder,
    text: shareText,
    sub: shareSub,
    accent: shareAccent,
  };

  return (
    <div className={`min-h-screen ${dark ? "bg-black text-white" : "bg-white text-black"}`}>
      {/* Player overlay (if playing) */}
      {playing && currentItem && (
        <div className="fixed inset-0 z-40 flex flex-col bg-black bg-opacity-95">
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-4 right-4 text-2xl leading-none hover:opacity-70"
          >
            ✕
          </button>
          <div className="flex-1 flex flex-col justify-center items-center p-4 text-center">
            {artworkUrl(currentItem) && (
              <img
                src={artworkUrl(currentItem)!}
                alt={currentItem.title}
                className="max-w-sm max-h-60 rounded-lg mb-4 object-cover"
              />
            )}
            <h2 className="text-2xl font-bold mb-2">{currentItem.title}</h2>
            <p className="text-lg opacity-75 mb-4">{currentItem.author}</p>
            {currentItem.summary && (
              <p className="text-sm opacity-60 mb-6 max-w-md">{currentItem.summary}</p>
            )}
            <a
              href={getWatchUrl(currentItem)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded mb-4"
            >
              Open at Official Source
            </a>
          </div>
          <div className="p-4 flex gap-2 justify-center flex-wrap">
            <button
              onClick={handlePrevItem}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
            >
              ← Previous
            </button>
            <button
              onClick={handleNextItem}
              disabled={currentIndex >= (result?.items.length ?? 0) - 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
            >
              Next →
            </button>
            <button
              onClick={handleAnotherLikeThis}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded"
            >
              Another like this
            </button>
            <button
              onClick={handleShareCurrent}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* Share sheet */}
      {shareTarget && (
        <ShareSheet
          target={shareTarget}
          triggerId={shareTriggerId ?? ""}
          palette={sharePalette}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Main page */}
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Digital DJ</h1>
          <p className="text-lg opacity-90">
            Tell the DJ how much time you have and what you need. Get an approved song, sermon, podcast, video, or complete session.
          </p>
        </header>

        {!hasResult ? (
          <div className="space-y-6">
            {/* Duration selector */}
            <section>
              <h2 className="text-xl font-semibold mb-3">How much time do you have?</h2>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`p-3 rounded font-semibold transition ${
                      duration === d
                        ? "bg-purple-600 text-white"
                        : `${dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"}`
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </section>

            {/* Media type selector */}
            <section>
              <h2 className="text-xl font-semibold mb-3">What kind of media?</h2>
              <div className="grid grid-cols-2 gap-2">
                {MEDIA_TYPES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleMediaTypeToggle(m.id)}
                    className={`p-3 rounded transition text-sm font-semibold ${
                      selectedMediaTypes.has(m.id)
                        ? "bg-purple-600 text-white"
                        : `${dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"}`
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Needs selector */}
            <section>
              <h2 className="text-xl font-semibold mb-3">What do you need right now?</h2>
              <div className="grid grid-cols-3 gap-2">
                {NEEDS.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNeedToggle(n.id)}
                    className={`p-3 rounded transition text-sm font-semibold ${
                      selectedNeeds.has(n.id)
                        ? "bg-purple-600 text-white"
                        : `${dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"}`
                    }`}
                  >
                    {n.icon} {n.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Optional: Natural language enhancement */}
            <section>
              <h2 className="text-xl font-semibold mb-3">Tell the DJ what you need</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g., 'I have 30 minutes before bed and need peace'"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  maxLength={300}
                  className={`flex-1 p-3 rounded border ${
                    dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && userText.trim()) {
                      handleAiEnhance();
                    }
                  }}
                />
                <button
                  onClick={handleAiEnhance}
                  disabled={!userText.trim() || loadingAi}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-semibold"
                >
                  {loadingAi ? "..." : "Ask"}
                </button>
              </div>
            </section>

            {/* Generate button */}
            <button
              onClick={generateSelection}
              disabled={loading}
              className="w-full p-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-lg font-bold"
            >
              {loading ? "Spinning..." : "Spin something for me"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Result summary */}
            <div className={`p-4 rounded-lg ${dark ? "bg-gray-900" : "bg-gray-100"}`}>
              <p className="text-sm opacity-75">
                {result.items.length} item{result.items.length !== 1 ? "s" : ""} • {result.durationMinutes} minutes
                {result.truncated && " (rounded up)"}
              </p>
              <h2 className="text-2xl font-bold mt-2">Your Session</h2>
            </div>

            {/* Session playlist */}
            <div className="space-y-2">
              {result.items.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setPlaying(true);
                  }}
                  className={`w-full p-3 rounded text-left transition ${
                    idx === currentIndex
                      ? "bg-purple-600 text-white"
                      : `${dark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"}`
                  }`}
                >
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-sm opacity-75">
                    {item.author} • {item.type}
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handlePlayCurrent}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold flex-1"
              >
                ▶ Play
              </button>
              <button
                onClick={handleShareSession}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold flex-1"
              >
                📤 Share Session
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedMediaTypes(new Set());
                  setSelectedNeeds(new Set());
                  setUserText("");
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-semibold flex-1"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
