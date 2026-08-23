"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/analytics";

type EncouragementActionsProps = {
  contentId: string;
  label: string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
  // A direct playable audio file for the item, when one is known — takes
  // priority over embedUrl since a native <audio> element is simpler and
  // more accessible than embedding a whole provider page.
  audioUrl?: string | null;
  // The item's own embeddable player (Spotify/Apple show embed), when the
  // source has one — lets "compact" play it inline instead of linking out.
  embedUrl?: string | null;
  cardPath: string;
  cardFileName: string;
  // "default" (unchanged) is what /today and the dated archive use — a big
  // pill CTA to the source. "compact" is for the homepage: Listen expands
  // the card into an inline player (audioUrl or embedUrl) in place; the
  // source link only ever appears as a visible secondary escape hatch.
  variant?: "default" | "compact";
  // Homepage wants to hide the summary paragraph it renders above this
  // component while the player is open, to keep the expanded card compact.
  onExpandedChange?: (expanded: boolean) => void;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the source";
  }
}

// Share / open controls for the Daily Encouragement pages, with GA events.
export default function EncouragementActions({
  contentId,
  label,
  title,
  pageUrl,
  sourceUrl,
  audioUrl = null,
  embedUrl = null,
  cardPath,
  cardFileName,
  variant = "default",
  onExpandedChange,
}: EncouragementActionsProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const setExpandedAndNotify = (next: boolean) => {
    setExpanded(next);
    onExpandedChange?.(next);
  };

  useEffect(() => {
    track("djc_today_viewed", { content_id: contentId, label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    track("djc_shared", { content_id: contentId });
    const text = `${label}: ${title} — on TheDJCares.com`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: pageUrl });
        return;
      } catch {
        // Cancelled — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${pageUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked.
    }
  }

  const btn =
    "inline-flex items-center justify-center rounded-full border border-[#26324c] bg-[#141d2e] px-5 py-2.5 text-sm font-bold text-[#e8edf5] transition hover:border-[#A78BFA]";

  if (variant === "compact") {
    const quietBtn =
      "inline-flex items-center justify-center gap-1 rounded-full border border-[#26324c] bg-transparent px-3.5 py-1.5 text-xs font-bold text-[#94a3b8] transition hover:border-[#A78BFA] hover:text-[#e8edf5]";
    const listenBtn =
      "inline-flex items-center justify-center rounded-full bg-[#A78BFA] px-6 py-2.5 text-sm font-black text-[#0b1220] transition hover:opacity-90";
    const sourceLink = (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("djc_source_opened", { content_id: contentId })}
        className="text-xs font-bold text-[#94a3b8] underline decoration-dotted underline-offset-2 hover:text-[#e8edf5]"
      >
        Original source ↗ ({hostnameOf(sourceUrl)})
      </a>
    );
    const playable = Boolean(audioUrl || embedUrl);

    // Expanded: the card becomes the player. Same interaction as the hero's
    // record ⇄ video toggle — Back just closes it, doesn't lose anything.
    if (playable && expanded) {
      return (
        <div className="flex flex-col items-center gap-3">
          {audioUrl ? (
            <audio controls preload="none" src={audioUrl} style={{ width: "100%", maxWidth: 420 }}>
              Your browser doesn&apos;t support inline audio — {sourceLink}
            </audio>
          ) : (
            <iframe
              src={embedUrl!}
              title={title}
              allow="autoplay *; encrypted-media *; clipboard-write"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              style={{ width: "100%", maxWidth: 420, height: 180, border: 0, borderRadius: 14, overflow: "hidden", background: "transparent" }}
            />
          )}
          <button type="button" onClick={() => setExpandedAndNotify(false)} className={quietBtn}>
            ← Back
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" onClick={share} className={quietBtn}>
              {copied ? "Link copied" : "Share"}
            </button>
          </div>
          {sourceLink}
        </div>
      );
    }

    // Collapsed: Listen is the primary action whenever something can
    // actually play inline; Share/Download/Browse stay quiet and secondary,
    // and the source link is always visible (never sr-only) as an honest
    // fallback — it's the only way to hear items with no inline source.
    return (
      <div className="flex flex-col items-center gap-3">
        {playable && (
          <button type="button" onClick={() => setExpandedAndNotify(true)} className={listenBtn}>
            ▶ Listen
          </button>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={share} className={quietBtn}>
            {copied ? "Link copied" : "Share"}
          </button>
          <a
            href={cardPath}
            download={cardFileName}
            onClick={() => track("djc_card_downloaded", { content_id: contentId })}
            className={quietBtn}
          >
            Download card
          </a>
          <a
            href="/"
            onClick={() => track("djc_library_opened", { from: "today" })}
            className={quietBtn}
          >
            Browse the library
          </a>
        </div>
        {sourceLink}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("djc_source_opened", { content_id: contentId })}
        className="inline-flex items-center justify-center rounded-full bg-[#A78BFA] px-6 py-2.5 text-sm font-black text-[#0b1220] transition hover:opacity-90"
      >
        Open the original source →
      </a>
      <button type="button" onClick={share} className={btn}>
        {copied ? "Link copied" : "Share"}
      </button>
      <a
        href={cardPath}
        download={cardFileName}
        onClick={() => track("djc_card_downloaded", { content_id: contentId })}
        className={btn}
      >
        Download card
      </a>
      <a
        href="/"
        onClick={() => track("djc_library_opened", { from: "today" })}
        className={btn}
      >
        Browse the library
      </a>
    </div>
  );
}
