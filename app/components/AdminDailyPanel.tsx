"use client";

// ============================================================================
// OPEN MIRROR DAILY SOCIAL ENGINE — admin panel (brand-agnostic, client)
// Canonical copy: open-mirror/packages/daily-social-engine/
// Synced into each site's components — NEVER edit the site copies directly.
// ============================================================================

import { useState } from "react";

type AdminDailyPanelProps = {
  adminKey: string;
  date: string;
  caption: string;
  imagePath: string;
  imageFileName: string;
  // Extra query params for "choose another eligible item" style controls,
  // e.g. { offset: "1" }. Merged into publish-endpoint calls and image src.
  extraParams?: Record<string, string>;
};

type ActionState = {
  running: boolean;
  label: string;
  result: unknown;
};

export default function AdminDailyPanel({
  adminKey,
  date,
  caption,
  imagePath,
  imageFileName,
  extraParams = {},
}: AdminDailyPanelProps) {
  const [imageVersion, setImageVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [action, setAction] = useState<ActionState>({
    running: false,
    label: "",
    result: null,
  });

  const extraQuery = new URLSearchParams(extraParams).toString();
  const imageSrc = [
    imagePath,
    [extraQuery, imageVersion ? `v=${imageVersion}` : ""]
      .filter(Boolean)
      .join("&"),
  ]
    .filter(Boolean)
    .join("?");

  async function callPublishEndpoint(label: string, query: string) {
    setAction({ running: true, label, result: null });
    try {
      const params = new URLSearchParams(extraParams);
      params.set("date", date);
      const response = await fetch(
        `/api/social/instagram/publish?${params}&${query}`,
        { method: "POST", headers: { "x-admin-key": adminKey } },
      );
      const data = await response.json();
      setAction({ running: false, label, result: data });
    } catch (error) {
      setAction({
        running: false,
        label,
        result: { error: error instanceof Error ? error.message : "request failed" },
      });
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked.
    }
  }

  function publishNow() {
    if (
      window.confirm(
        `Publish ${date} to Instagram right now? This posts publicly to the connected account.`,
      )
    ) {
      callPublishEndpoint("Publish now", "force=1");
    }
  }

  const buttonClass =
    "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="mt-4">
      {/* Regenerate re-renders the image from the SAME deterministic data —
          it can never change which content was selected. */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => setImageVersion((v) => v + 1)}
        >
          Regenerate image
        </button>
        <button type="button" className={buttonClass} onClick={copyCaption}>
          {copied ? "Caption copied" : "Copy caption"}
        </button>
        <a href={imageSrc} download={imageFileName} className={buttonClass}>
          Download image
        </a>
        <button
          type="button"
          className={buttonClass}
          disabled={action.running}
          onClick={() => callPublishEndpoint("Status", "mode=status")}
        >
          Check status
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={action.running}
          onClick={() => callPublishEndpoint("Dry run", "dryRun=1")}
        >
          Dry run
        </button>
        <button
          type="button"
          className={`${buttonClass} border-emerald-200/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15`}
          disabled={action.running}
          onClick={publishNow}
        >
          Publish now / Retry
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={`Daily card for ${date}`}
          className="block w-full max-w-md"
        />
      </div>

      <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-slate-200">
        {caption}
      </pre>

      {action.label ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
            {action.label} {action.running ? "— running…" : "— result"}
          </p>
          {action.result != null ? (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-slate-300">
              {JSON.stringify(action.result, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
