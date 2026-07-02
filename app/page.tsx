"use client";
import { useState, useEffect } from "react";
import OpenMirrorNav from "./OpenMirrorNav";
import {
  DJ_CARES_LIBRARY,
  getEmbedUrl,
  getWatchUrl,
  isAppleItem,
  isSpotifyItem,
  type LibraryItem,
} from "./lib/djCaresLibrary";

const ENCOURAGE: { text: string; source: string }[] = [
  { text: "You are not what you have done. You are not what has been done to you. You are who God says you are.", source: "theDJcares" },
  { text: "The same power that raised Jesus from the dead lives in you. That is not a metaphor.", source: "Romans 8:11" },
  { text: "You don't have to have it figured out. You just have to take the next faithful step.", source: "theDJcares" },
  { text: "Cast all your anxiety on him because he cares for you.", source: "1 Peter 5:7" },
  { text: "Your worst day is not the end of your story.", source: "theDJcares" },
  { text: "The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you.", source: "Zephaniah 3:17" },
  { text: "Someone out there needs exactly the thing you've been through. Don't waste it.", source: "theDJcares" },
  { text: "For I know the plans I have for you — plans to prosper you and not to harm you.", source: "Jeremiah 29:11" },
];

type Tab = "library" | "encourage";

export default function TheDJCaresPage() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("library");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [libFilter, setLibFilter] = useState("All");

  useEffect(() => {
    const saved = localStorage.getItem("djc-theme");
    if (saved) setDark(saved === "dark");
  }, []);

  const copyLine = (text: string, source: string, i: number) => {
    navigator.clipboard.writeText(`"${text}" — ${source}`).then(() => {
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const bg = dark ? "#0C0C0C" : "#FEFCF9";
  const text = dark ? "#F5F0E8" : "#1C1917";
  const sub = dark ? "#8A8078" : "#57534E";
  const card = dark ? "#141414" : "#FFFFFF";
  const border = dark ? "#222" : "#E7E5E4";
  const active = dark ? "#1F0A10" : "#FFF1F2";
  const activeBorder = dark ? "#3A1520" : "#FECDD3";

  // Categories in first-appearance order — drives the section headings and chips.
  const collections = Array.from(
    new Set(DJ_CARES_LIBRARY.map(i => i.collection).filter(Boolean))
  ) as string[];
  const chips = ["All", ...collections];
  const itemsIn = (c: string) => DJ_CARES_LIBRARY.filter(i => i.collection === c);

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "library", label: "Library", emoji: "📚" },
    { id: "encourage", label: "Encouragement", emoji: "❤️" },
  ];

  // One card, same look for playlists, videos, sermons, and links.
  const Card = (item: LibraryItem) => {
    const embed = getEmbedUrl(item);
    const apple = isAppleItem(item);
    const spotify = isSpotifyItem(item);
    const appleHeight = item.appleEmbed && /\/song\//.test(item.appleEmbed) ? 175 : 450;
    const spotifyHeight = item.spotifyEmbed && /\/embed\/(track|episode)\//.test(item.spotifyEmbed) ? 152 : 352;
    const kind = apple ? "Apple Music" : spotify ? "Spotify" : item.playlistId ? "Playlist" : item.isVideo ? "Video" : item.search ? "Music" : "Listen";
    return (
      <div key={item.id} className="pop" style={{ background: card, border: `2px solid ${item.featured ? activeBorder : border}`, borderRadius: 18, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div>
            {item.featured && (
              <span style={{ fontSize: 11, fontWeight: 800, color: "#FB7185", textTransform: "uppercase", letterSpacing: "0.1em" }}>★ Featured</span>
            )}
            <p style={{ fontSize: 20, fontWeight: 800, color: text, margin: "2px 0 2px" }}>{item.title}</p>
            {item.author && <p style={{ fontSize: 14, fontWeight: 700, color: "#FB7185", margin: 0 }}>{item.author}</p>}
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, paddingTop: 3 }}>{kind}</span>
        </div>

        {/* Apple Music */}
        {embed && apple && (
          <iframe
            src={embed}
            title={item.title}
            loading="lazy"
            allow="autoplay *; encrypted-media *;"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
            style={{ width: "100%", height: appleHeight, border: 0, borderRadius: 14, overflow: "hidden", background: "transparent", margin: "12px 0 14px" }}
          />
        )}

        {/* Spotify */}
        {embed && spotify && (
          <iframe
            src={embed}
            title={item.title}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: spotifyHeight, border: 0, borderRadius: 14, overflow: "hidden", margin: "12px 0 14px" }}
          />
        )}

        {/* YouTube video / playlist (responsive 16:9) */}
        {embed && !apple && !spotify && (
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 14, overflow: "hidden", margin: "12px 0 14px", background: "#000" }}>
            <iframe
              src={embed}
              title={item.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        )}

        {item.summary && (
          <p style={{ fontSize: 15, color: sub, margin: "0 0 12px", lineHeight: 1.6 }}>{item.summary}</p>
        )}

        {item.verse && (
          <a
            href={`https://www.bible.com/search/bible?q=${encodeURIComponent(item.verse)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", marginBottom: 12, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: "#FB7185", textDecoration: "none" }}
          >
            📖 Read {item.verse} in the Bible →
          </a>
        )}

        {item.tags && item.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {item.tags.map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 700, color: sub, background: dark ? "#1A1A1A" : "#F5F5F4", border: `1px solid ${border}`, borderRadius: 50, padding: "4px 10px" }}>#{t}</span>
            ))}
          </div>
        )}

        {embed ? (
          <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 800, color: sub, textDecoration: "none", letterSpacing: "0.04em" }}>
            {apple ? "↗ Open in Apple Music" : spotify ? "↗ Open in Spotify" : "↗ Open on YouTube"}
          </a>
        ) : item.search ? (
          <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 800, color: "#FB7185", textDecoration: "none", letterSpacing: "0.04em" }}>
            ▶ Watch on YouTube
          </a>
        ) : item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 800, color: "#FB7185", textDecoration: "none", letterSpacing: "0.04em" }}>
            🎧 Open →
          </a>
        ) : null}
      </div>
    );
  };

  return (
    <main style={{ background: bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <OpenMirrorNav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎵</div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: text, margin: "0 0 12px" }}>theDJcares</h1>
          <p style={{ fontSize: 18, color: sub, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            Curated music, sermons, podcasts, and encouragement — Gospel first. Hand-picked. No algorithm.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#FB7185" : card,
              border: `2px solid ${tab === t.id ? "#FB7185" : border}`,
              borderRadius: 50, padding: "12px 22px",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              color: tab === t.id ? "#0C0C0C" : sub,
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Library tab — everything plays in-app, grouped by category */}
        {tab === "library" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: text, margin: "0 0 10px" }}>Encouragement Library</h2>
              <p style={{ fontSize: 16, color: sub, lineHeight: 1.7, margin: "0 0 12px" }}>
                A growing place for the messages, songs, playlists, and links I want to keep close and share with people who need encouragement.
              </p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#FB7185", letterSpacing: "0.02em", margin: 0 }}>
                Curated for encouragement. Always test every message against Scripture.
              </p>
            </div>

            {/* Category chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {chips.map(label => {
                const count = label === "All" ? DJ_CARES_LIBRARY.length : itemsIn(label).length;
                const selected = libFilter === label;
                return (
                  <button key={label} onClick={() => setLibFilter(label)} style={{
                    background: selected ? active : "none",
                    border: `2px solid ${selected ? activeBorder : border}`,
                    borderRadius: 50, padding: "9px 18px",
                    fontSize: 13, fontWeight: 800, cursor: "pointer",
                    color: selected ? "#FB7185" : sub,
                  }}>{label} <span style={{ opacity: 0.7 }}>{count}</span></button>
                );
              })}
            </div>

            {/* Sections (All) or a single category */}
            {(libFilter === "All" ? collections : [libFilter]).map(c => (
              <section key={c} style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: text, margin: "0 0 16px" }}>{c}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {itemsIn(c).map(Card)}
                </div>
              </section>
            ))}
          </>
        )}

        {/* Encouragement tab */}
        {tab === "encourage" && (
          <>
            <p style={{ fontSize: 16, color: sub, marginBottom: 20 }}>Tap any card to copy and send to someone who needs it.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ENCOURAGE.map((e, i) => {
                const isVerse = e.source !== "theDJcares";
                return (
                  <div key={i} className="pop" style={{ background: copiedIdx === i ? active : card, border: `2px solid ${copiedIdx === i ? activeBorder : border}`, borderRadius: 18, overflow: "hidden" }}>
                    <button onClick={() => copyLine(e.text, e.source, i)} style={{ width: "100%", background: "none", border: "none", padding: "22px 24px", cursor: "pointer", textAlign: "left" }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: text, lineHeight: 1.65, margin: "0 0 8px" }}>&ldquo;{e.text}&rdquo;</p>
                      <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: copiedIdx === i ? "#FB7185" : sub, margin: 0 }}>
                        {copiedIdx === i ? "✓ Copied!" : `— ${e.source}${isVerse ? "  ·  tap to copy" : ""}`}
                      </p>
                    </button>
                    {isVerse && (
                      <a
                        href={`https://www.bible.com/search/bible?q=${encodeURIComponent(e.source)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "block", borderTop: `1px solid ${border}`, padding: "11px 24px", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#FB7185", textDecoration: "none" }}
                      >
                        📖 Read {e.source} in the Bible →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 36, background: dark ? "#0A1F12" : "#F0FDF4", border: `2px solid ${dark ? "#1A3A22" : "#BBF7D0"}`, borderRadius: 20, padding: "24px 28px" }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#4ADE80", margin: "0 0 10px" }}>Want TheDJCares to feature your church or ministry?</p>
              <p style={{ fontSize: 14, color: sub, margin: "0 0 16px", lineHeight: 1.65 }}>If your church, ministry, or Christian organization wants to be featured, reach out.</p>
              <a href="mailto:ask@openmirrorllc.com?subject=TheDJCares%20Feature%20Request" style={{ background: "#4ADE80", color: "#0C0C0C", borderRadius: 50, padding: "11px 24px", fontSize: 14, fontWeight: 800, textDecoration: "none", display: "inline-block" }}>Get In Touch</a>
            </div>
          </>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", borderTop: `1px solid ${border}`, paddingTop: 28 }}>
          <p style={{ fontSize: 13, color: sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
            © 2026 Open Mirror LLC · Follow Jesus. Love God. Pray.
          </p>
        </footer>
      </div>
    </main>
  );
}
