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
import {
  getGeneGetzPrinciplesForVerse,
  type LifeEssentialsPrinciple,
} from "./lib/geneGetzLifeEssentials";

// Daily Hope verses (mirrored from Cross Heart Pray, in day order). Each links to the
// bible.com app for the verse and its full chapter. Version 206 = World English Bible.
const ENCOURAGE: { day: string; label: string; code: string; chapter: string; verse: string; text: string }[] = [
  { day: "Sunday", label: "Romans 5:3-5", code: "ROM", chapter: "5", verse: "3", text: `Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance; and perseverance, proven character; and proven character, hope: and hope doesn’t disappoint us, because God’s love has been poured into our hearts through the Holy Spirit who was given to us.` },
  { day: "Sunday", label: "Psalm 39:7", code: "PSA", chapter: "39", verse: "7", text: `Now, Lord, what do I wait for? My hope is in you.` },
  { day: "Monday", label: "1 Peter 3:15", code: "1PE", chapter: "3", verse: "15", text: `But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear,` },
  { day: "Monday", label: "Deuteronomy 31:6", code: "DEU", chapter: "31", verse: "6", text: `Be strong and courageous. Don’t be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.”` },
  { day: "Tuesday", label: "1 Peter 1:3", code: "1PE", chapter: "1", verse: "3", text: `Blessed be the God and Father of our Lord Jesus Christ, who according to his great mercy caused us to be born again to a living hope through the resurrection of Jesus Christ from the dead,` },
  { day: "Tuesday", label: "Romans 15:4", code: "ROM", chapter: "15", verse: "4", text: `For whatever things were written before were written for our learning, that through perseverance and through encouragement of the Scriptures we might have hope.` },
  { day: "Wednesday", label: "Proverbs 23:18", code: "PRO", chapter: "23", verse: "18", text: `Indeed surely there is a future hope, and your hope will not be cut off.` },
  { day: "Wednesday", label: "1 Corinthians 13:13", code: "1CO", chapter: "13", verse: "13", text: `But now faith, hope, and love remain—these three. The greatest of these is love.` },
  { day: "Thursday", label: "Psalm 31:24", code: "PSA", chapter: "31", verse: "24", text: `Be strong, and let your heart take courage, all you who hope in the LORD.` },
  { day: "Thursday", label: "Jeremiah 17:7", code: "JER", chapter: "17", verse: "7", text: `“Blessed is the man who trusts in Yahweh, and whose confidence is in Yahweh.` },
  { day: "Thursday", label: "Hebrews 11:1", code: "HEB", chapter: "11", verse: "1", text: `Now faith is assurance of things hoped for, proof of things not seen.` },
  { day: "Friday", label: "Mark 9:23", code: "MRK", chapter: "9", verse: "23", text: `Jesus said to him, “If you can believe, all things are possible to him who believes.”` },
  { day: "Friday", label: "Romans 8:25", code: "ROM", chapter: "8", verse: "25", text: `But if we hope for that which we don’t see, we wait for it with patience.` },
  { day: "Friday", label: "Isaiah 41:10", code: "ISA", chapter: "41", verse: "10", text: `Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.` },
  { day: "Saturday", label: "Romans 8:24-25", code: "ROM", chapter: "8", verse: "24", text: `For we were saved in hope, but hope that is seen is not hope. For who hopes for that which he sees? But if we hope for that which we don’t see, we wait for it with patience.` },
  { day: "Saturday", label: "Proverbs 13:12", code: "PRO", chapter: "13", verse: "12", text: `Hope deferred makes the heart sick, but when longing is fulfilled, it is a tree of life.` },
];

const bibleVerseUrl = (v: { code: string; chapter: string; verse: string }) =>
  `https://www.bible.com/bible/206/${v.code}.${v.chapter}.${v.verse}.WEBUS`;
const bibleChapterUrl = (v: { code: string; chapter: string }) =>
  `https://www.bible.com/bible/206/${v.code}.${v.chapter}.WEBUS`;

type Tab = "library" | "encourage";

export default function TheDJCaresPage() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("library");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [libFilter, setLibFilter] = useState("All");
  const [getzVideo, setGetzVideo] = useState<LifeEssentialsPrinciple | null>(null);

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

  // Cool, flat palette — matched to CrossHeartPray / Open Mirror so the sites feel connected.
  const bg = dark ? "#0b1220" : "#eef2f7";
  const text = dark ? "#e8edf5" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#475569";
  const card = dark ? "#141d2e" : "#ffffff";
  const border = dark ? "#26324c" : "#dbe2ea";
  const active = dark ? "#1c2740" : "#eef4ff";
  const activeBorder = dark ? "#33507e" : "#c7d7f5";

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
              <span style={{ fontSize: 11, fontWeight: 800, color: "#A78BFA", textTransform: "uppercase", letterSpacing: "0.1em" }}>★ Featured</span>
            )}
            <p style={{ fontSize: 20, fontWeight: 800, color: text, margin: "2px 0 2px" }}>{item.title}</p>
            {item.author && <p style={{ fontSize: 14, fontWeight: 700, color: "#A78BFA", margin: 0 }}>{item.author}</p>}
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
            style={{ display: "inline-block", marginBottom: 12, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: "#A78BFA", textDecoration: "none" }}
          >
            📖 Read {item.verse} in the Bible →
          </a>
        )}

        {item.tags && item.tags.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {item.tags.map(t => (
              <span key={t} style={{ fontSize: 11, fontWeight: 700, color: sub, letterSpacing: "0.03em" }}>#{t}</span>
            ))}
          </div>
        )}

        {embed ? (
          <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 800, color: sub, textDecoration: "none", letterSpacing: "0.04em" }}>
            {apple ? "↗ Open in Apple Music" : spotify ? "↗ Open in Spotify" : "↗ Open on YouTube"}
          </a>
        ) : item.search ? (
          <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 800, color: "#A78BFA", textDecoration: "none", letterSpacing: "0.04em" }}>
            ▶ Watch on YouTube
          </a>
        ) : item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 800, color: "#A78BFA", textDecoration: "none", letterSpacing: "0.04em" }}>
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
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#A78BFA" : card,
              border: `2px solid ${tab === t.id ? "#A78BFA" : border}`,
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
              <p style={{ fontSize: 13, fontWeight: 800, color: "#A78BFA", letterSpacing: "0.02em", margin: 0 }}>
                Curated for encouragement. Always test every message against Scripture.
              </p>
            </div>

            {/* Category chips */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {chips.map(label => {
                const count = label === "All" ? DJ_CARES_LIBRARY.length : itemsIn(label).length;
                const selected = libFilter === label;
                return (
                  <button key={label} onClick={() => setLibFilter(label)} style={{
                    background: selected ? active : "none",
                    border: `2px solid ${selected ? activeBorder : border}`,
                    borderRadius: 50, padding: "9px 18px",
                    fontSize: 13, fontWeight: 800, cursor: "pointer",
                    color: selected ? "#A78BFA" : sub,
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
            <p style={{ fontSize: 16, color: sub, marginBottom: 20 }}>Scripture on hope — the Daily Hope verses, one set for each day. Tap a card to copy and send it, or open the verse or full chapter in the Bible.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ENCOURAGE.map((e, i) => {
                const showDay = i === 0 || ENCOURAGE[i - 1].day !== e.day;
                const getz = getGeneGetzPrinciplesForVerse(e.code, e.chapter, e.verse).find(p => p.youtubeId);
                return (
                  <div key={i}>
                    {showDay && (
                      <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.16em", color: "#A78BFA", margin: i === 0 ? "0 0 10px" : "22px 0 10px" }}>
                        {e.day}
                      </p>
                    )}
                    <div className="pop" style={{ background: copiedIdx === i ? active : card, border: `2px solid ${copiedIdx === i ? activeBorder : border}`, borderRadius: 18, overflow: "hidden" }}>
                      <button onClick={() => copyLine(e.text, e.label, i)} style={{ width: "100%", background: "none", border: "none", padding: "22px 24px", cursor: "pointer", textAlign: "left" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: text, lineHeight: 1.65, margin: "0 0 8px" }}>&ldquo;{e.text}&rdquo;</p>
                        <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: copiedIdx === i ? "#A78BFA" : sub, margin: 0 }}>
                          {copiedIdx === i ? "✓ Copied!" : `— ${e.label}  ·  tap to copy`}
                        </p>
                      </button>
                      <div style={{ display: "flex", borderTop: `1px solid ${border}` }}>
                        <a
                          href={bibleVerseUrl(e)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, textAlign: "center", padding: "11px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#A78BFA", textDecoration: "none" }}
                        >
                          📖 Verse
                        </a>
                        <a
                          href={bibleChapterUrl(e)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flex: 1, textAlign: "center", padding: "11px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#A78BFA", textDecoration: "none", borderLeft: `1px solid ${border}` }}
                        >
                          📖 Chapter
                        </a>
                      </div>
                      {getz && (
                        <button
                          onClick={() => setGetzVideo(getz)}
                          style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${border}`, padding: "11px 16px", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", color: "#A78BFA", cursor: "pointer", textAlign: "center" }}
                        >
                          🎬 Watch Gene Getz
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 36, background: dark ? "#1a1440" : "#f3f0ff", border: `2px solid ${dark ? "#33285c" : "#d9ccf5"}`, borderRadius: 20, padding: "24px 28px" }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#A78BFA", margin: "0 0 10px" }}>Want TheDJCares to feature your church or ministry?</p>
              <p style={{ fontSize: 14, color: sub, margin: "0 0 16px", lineHeight: 1.65 }}>If your church, ministry, or Christian organization wants to be featured, reach out.</p>
              <a href="mailto:ask@openmirrorllc.com?subject=TheDJCares%20Feature%20Request" style={{ background: "#A78BFA", color: "#0C0C0C", borderRadius: 50, padding: "11px 24px", fontSize: 14, fontWeight: 800, textDecoration: "none", display: "inline-block" }}>Get In Touch</a>
            </div>
          </>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", borderTop: `1px solid ${border}`, paddingTop: 28 }}>
          <p style={{ fontSize: 13, color: sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
            © 2026 Open Mirror LLC · Follow Jesus. Love God. Pray.
          </p>
        </footer>
      </div>

      {getzVideo?.youtubeId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setGetzVideo(null)}
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 16 }}
        >
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#A78BFA", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Dr. Gene Getz · {getzVideo.principleTitle}
              </p>
              <button onClick={() => setGetzVideo(null)} style={{ flexShrink: 0, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "6px 16px", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                Close ✕
              </button>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${getzVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={getzVideo.principleTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
