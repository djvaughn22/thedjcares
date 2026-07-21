"use client";

// The one Share control used beside every playable item on the site.
//
// ShareTrigger is the stateless "📤 Share" button; the page keeps which item
// is being shared and renders a single ShareSheet at its root. (The page's
// cards are defined inline and remount on player-state renders, so a sheet
// living inside a card would close itself mid-share.)
//
// The sheet offers exactly four options: Text, Email, Copy link, and More…
// (the device's native share sheet, shown only where it exists).
// Links only — nothing is generated or uploaded.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "../lib/analytics";
import {
  emailHref,
  shareMessage,
  shareUrl,
  smsHref,
  type ShareTarget,
} from "../lib/shareLinks";

export type SharePalette = {
  card: string;
  border: string;
  text: string;
  sub: string;
  accent: string;
};

// Where a trigger lives ("card", "deck", "hero") — keeps DOM ids unique when
// the same item has a Share button in two places, so focus returns correctly.
export const shareTriggerId = (target: ShareTarget, scope = "card") => `djc-share-${scope}-${target.id}`;

export function ShareTrigger({
  target,
  palette,
  onOpen,
  scope = "card",
}: {
  target: ShareTarget;
  palette: SharePalette;
  onOpen: (target: ShareTarget, triggerId: string) => void;
  scope?: string;
}) {
  const id = shareTriggerId(target, scope);
  return (
    <button
      id={id}
      onClick={() => onOpen(target, id)}
      aria-label={`Share ${target.contentType.toLowerCase()}: ${target.title}`}
      aria-haspopup="dialog"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 44,
        minWidth: 44,
        padding: "0 14px",
        background: "none",
        border: `2px solid ${palette.border}`,
        borderRadius: 50,
        color: palette.sub,
        fontSize: 13,
        fontWeight: 800,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>📤</span> Share
    </button>
  );
}

export default function ShareSheet({
  target,
  triggerId,
  palette,
  onClose,
}: {
  target: ShareTarget | null;
  triggerId: string | null;
  palette: SharePalette;
  onClose: () => void;
}) {
  const { card, border, text, sub, accent } = palette;
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Hide More… entirely where navigator.share doesn't exist — an
  // unsupported button must never fail silently.
  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const close = () => {
    setCopied(false);
    onClose();
    // Return focus to the Share button that opened the sheet (looked up by
    // id — the button element itself may have remounted meanwhile).
    if (triggerId) window.setTimeout(() => document.getElementById(triggerId)?.focus(), 0);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Focus the sheet's first option on open; trap Tab inside; Escape closes.
  useEffect(() => {
    if (!target) return;
    setCopied(false);
    const focusables = () =>
      Array.from(sheetRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
    // Land on the first option (Text), not the ✕ that sits first in the DOM.
    const items = focusables();
    (items.find((el) => el.tagName === "A") ?? items[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !sheetRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [target]);

  if (!target) return null;

  const url = shareUrl(target);
  const done = (method: string) => {
    track("share", { method, content_type: target.contentType, content_title: target.title });
  };

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Older browsers / non-secure contexts: hidden-textarea fallback.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      done("copy");
    }
  };

  const native = async () => {
    try {
      await navigator.share({ title: target.title, text: shareMessage(target, url), url });
      done("native");
      close();
    } catch {
      // Canceling the native sheet is normal — stay quiet.
    }
  };

  const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    minHeight: 48,
    padding: "0 14px",
    background: "none",
    border: `2px solid ${border}`,
    borderRadius: 14,
    color: text,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return createPortal(
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5, 9, 18, 0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${target.title}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: card,
          border: `2px solid ${border}`,
          borderRadius: 20,
          width: "min(100%, 340px)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "16px 16px 14px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, margin: 0 }}>
              Share
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: text, margin: "4px 0 0", overflowWrap: "anywhere" }}>
              {target.title}
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: sub, margin: "2px 0 0" }}>{target.contentType}</p>
          </div>
          <button
            onClick={close}
            aria-label="Close share options"
            style={{ background: "none", border: "none", color: sub, fontSize: 18, fontWeight: 800, cursor: "pointer", width: 44, height: 44, flexShrink: 0, marginTop: -8, marginRight: -8 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href={smsHref(target, url)} onClick={() => { done("sms"); close(); }} style={row}>
            <span aria-hidden>💬</span> Text
          </a>
          <a href={emailHref(target, url)} onClick={() => { done("email"); close(); }} style={row}>
            <span aria-hidden>✉️</span> Email
          </a>
          <button onClick={copy} style={{ ...row, color: copied ? accent : text, fontFamily: "inherit", fontSize: 15 }}>
            <span aria-hidden>🔗</span> {copied ? "Link copied" : "Copy link"}
          </button>
          {canNative && (
            <button onClick={native} style={{ ...row, fontFamily: "inherit", fontSize: 15 }}>
              <span aria-hidden>📤</span> More…
            </button>
          )}
        </div>

        <div aria-live="polite" className="djc-sr-only">{copied ? "Link copied" : ""}</div>
      </div>
    </div>,
    document.body,
  );
}
