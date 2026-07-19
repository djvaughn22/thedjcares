"use client";

// Submit Your Church — honest no-cost delivery. The site has no server-side
// form backend, so this prepares a structured submission and sends it through
// the site's existing public contact address (the visitor's own email app).
// Nothing is published automatically; every church is reviewed by hand first.

import { useMemo, useState } from "react";
import { track } from "../lib/analytics";

const CONTACT = "ask@openmirrorllc.com";

type Field = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "url" | "textarea";
  placeholder?: string;
};

const FIELDS: Field[] = [
  { key: "church", label: "Church name", required: true },
  { key: "city", label: "City", required: true },
  { key: "region", label: "State / province / region", required: true },
  { key: "country", label: "Country", required: true },
  { key: "website", label: "Official website", type: "url", placeholder: "https://…" },
  { key: "channel", label: "Official YouTube channel URL", required: true, type: "url", placeholder: "https://www.youtube.com/@…" },
  { key: "live", label: "Direct YouTube live link (if you have one)", type: "url", placeholder: "https://www.youtube.com/@…/live" },
  { key: "times", label: "Normal service days and times", placeholder: "Sundays 9:00 & 11:00 AM" },
  { key: "timezone", label: "Time zone", placeholder: "Central Time (US)" },
  { key: "contactName", label: "Contact name", required: true },
  { key: "contactEmail", label: "Contact email", required: true, type: "email" },
  { key: "description", label: "A short description of your church", type: "textarea" },
];

const isUrl = (v: string) => /^https?:\/\/\S+\.\S+/.test(v.trim());
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isYouTube = (v: string) => isUrl(v) && /youtube\.com|youtu\.be/.test(v);

export default function ChurchSubmitForm({
  card,
  border,
  text,
  sub,
}: {
  card: string;
  border: string;
  text: string;
  sub: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [authorized, setAuthorized] = useState(false);
  const [noGuarantee, setNoGuarantee] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const body = useMemo(() => {
    const lines = FIELDS.map((f) => `${f.label}: ${values[f.key]?.trim() || "—"}`);
    return [
      "Church submission for The DJ Cares",
      "",
      ...lines,
      "",
      "I confirm I'm authorized to share this information, and I understand",
      "every church is reviewed by hand and submission does not guarantee inclusion.",
    ].join("\n");
  }, [values]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = values[f.key]?.trim() ?? "";
      if (f.required && !v) next[f.key] = "Required";
      else if (v && f.type === "email" && !isEmail(v)) next[f.key] = "That doesn't look like an email address";
      else if (v && f.type === "url" && !isUrl(v)) next[f.key] = "Please paste a full link (starting with https://)";
      else if (v && (f.key === "channel" || f.key === "live") && !isYouTube(v)) next[f.key] = "Please paste a YouTube link";
    }
    if (!authorized) next.authorized = "Please confirm you're authorized to share this";
    if (!noGuarantee) next.noGuarantee = "Please confirm you understand";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    track("church_submission_prepared", { country: values.country ?? "" });
    setPrepared(true);
    window.location.href = `mailto:${CONTACT}?subject=${encodeURIComponent(
      `Church submission: ${values.church?.trim() ?? ""}`,
    )}&body=${encodeURIComponent(body)}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${CONTACT}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked — the mailto path still works.
    }
  };

  const inputStyle = (key: string): React.CSSProperties => ({
    width: "100%",
    background: "none",
    border: `2px solid ${errors[key] ? "#f0a35e" : border}`,
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 15,
    color: text,
    fontFamily: "inherit",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 800,
    color: sub,
    margin: "0 0 6px",
  };

  return (
    <form onSubmit={submit} noValidate style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {FIELDS.map((f) => (
          <div key={f.key} style={f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
            <label htmlFor={`church-${f.key}`} style={labelStyle}>
              {f.label}
              {f.required ? " *" : ""}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={`church-${f.key}`}
                rows={3}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                style={{ ...inputStyle(f.key), resize: "vertical" }}
              />
            ) : (
              <input
                id={`church-${f.key}`}
                type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                value={values[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                aria-invalid={Boolean(errors[f.key])}
                style={inputStyle(f.key)}
              />
            )}
            {errors[f.key] && (
              <p role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "#f0a35e", margin: "4px 0 0" }}>
                {errors[f.key]}
              </p>
            )}
          </div>
        ))}
      </div>

      {[
        {
          checked: authorized,
          setter: setAuthorized,
          key: "authorized",
          label: "I'm authorized to share this church's information.",
        },
        {
          checked: noGuarantee,
          setter: setNoGuarantee,
          key: "noGuarantee",
          label: "I understand every church is reviewed by hand and submission doesn't guarantee inclusion.",
        },
      ].map((c) => (
        <div key={c.key} style={{ marginTop: 14 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14, color: text, fontWeight: 600, lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={c.checked}
              onChange={(e) => c.setter(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: "#A78BFA", flexShrink: 0 }}
            />
            {c.label}
          </label>
          {errors[c.key] && (
            <p role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "#f0a35e", margin: "4px 0 0 28px" }}>
              {errors[c.key]}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        style={{ marginTop: 18, background: "#A78BFA", color: "#0b1220", border: "none", borderRadius: 50, padding: "14px 28px", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
      >
        ⛪ Prepare my submission
      </button>

      <p style={{ fontSize: 13, color: sub, margin: "12px 0 0", lineHeight: 1.6 }}>
        What happens next: this opens your email app with everything filled in,
        addressed to {CONTACT}. Your submission is sent when you press Send
        there — nothing is sent from this page by itself. Every church is
        reviewed by hand before it appears anywhere on The DJ Cares.
      </p>

      {prepared && (
        <div role="status" style={{ marginTop: 14, border: `2px solid ${border}`, borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: text, margin: 0 }}>
            Your email app should have opened with the submission ready to send.
          </p>
          <p style={{ fontSize: 13, color: sub, margin: "6px 0 10px", lineHeight: 1.5 }}>
            Didn&apos;t open? Copy the submission below and email it to {CONTACT} from anywhere.
          </p>
          <button
            type="button"
            onClick={copy}
            style={{ background: "none", border: `2px solid ${border}`, borderRadius: 50, padding: "10px 20px", fontSize: 13.5, fontWeight: 800, color: text, cursor: "pointer" }}
          >
            {copied ? "✓ Copied" : "📋 Copy my submission"}
          </button>
        </div>
      )}
    </form>
  );
}
