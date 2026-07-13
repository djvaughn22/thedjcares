"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/analytics";

type EncouragementActionsProps = {
  contentId: string;
  label: string;
  title: string;
  pageUrl: string;
  sourceUrl: string;
  cardPath: string;
  cardFileName: string;
};

// Share / open controls for the Daily Encouragement pages, with GA events.
export default function EncouragementActions({
  contentId,
  label,
  title,
  pageUrl,
  sourceUrl,
  cardPath,
  cardFileName,
}: EncouragementActionsProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    track("djc_today_viewed", { content_id: contentId, label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    track("djc_shared", { content_id: contentId });
    const text = `${label}: ${title} — on TheDJCares.com/today`;
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
