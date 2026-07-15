"use client";
import { useState, useEffect, useRef } from "react";
import {
  DJ_CARES_LIBRARY,
  getEmbedUrl,
  getWatchUrl,
  isAppleItem,
  isSpotifyItem,
  type LibraryItem,
} from "./lib/djCaresLibrary";
import {
  getAdjacentPlayablePrinciple,
  getGeneGetzPrinciplesForVerse,
  type LifeEssentialsPrinciple,
} from "./lib/geneGetzLifeEssentials";
import { FAITH_THEMES } from "./lib/faithYouTube";
import { track } from "./lib/analytics";

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

// Every faith video in site order — the clicked video plays first, then the
// rest follow in order and wrap back to the start, like one big playlist.
const ALL_FAITH_VIDEO_IDS = FAITH_THEMES.flatMap(t => t.videos.map(v => v.youtubeId));
const FLAT_FAITH_VIDS = FAITH_THEMES.flatMap(t =>
  t.videos.map(v => ({ youtubeId: v.youtubeId, title: `${v.title} — ${v.artist}` }))
);
const faithPlaylistFrom = (id: string, order: string[] = ALL_FAITH_VIDEO_IDS) => {
  const i = order.indexOf(id);
  if (i < 0) return "";
  return [...order.slice(i + 1), ...order.slice(0, i)].join(",");
};

// Fisher–Yates — a fair shuffle for shuffle mode.
const shuffleIds = (ids: string[]) => {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const faithTitleOf = (id: string) =>
  FLAT_FAITH_VIDS.find(v => v.youtubeId === id)?.title ?? "";

const bibleVerseUrl = (v: { code: string; chapter: string; verse: string }) =>
  `https://www.bible.com/bible/206/${v.code}.${v.chapter}.${v.verse}.WEBUS`;
const bibleChapterUrl = (v: { code: string; chapter: string }) =>
  `https://www.bible.com/bible/206/${v.code}.${v.chapter}.WEBUS`;

type Tab = "faith" | "library" | "encourage" | "request";

// Shared "blocked / sign-in" help row for both video modals. Buttons wrap and
// center on narrow screens so nothing gets pushed off the edge.
function PlayerHelp({ watchUrl, onReload }: { watchUrl: string; onReload: () => void }) {
  const pill: React.CSSProperties = {
    borderRadius: 50, padding: "9px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer",
    textDecoration: "none", whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)", color: "#fff",
  };
  return (
    <>
      <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "12px 0 0", lineHeight: 1.5 }}>
        Blocked or asked to sign in? Sign in on YouTube, then reload — you stay right here.
      </p>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <a href="https://accounts.google.com/ServiceLogin?service=youtube" target="_blank" rel="noopener noreferrer" style={pill}>Sign in on YouTube</a>
        <button onClick={onReload} style={pill}>↻ Reload player</button>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer" style={{ ...pill, background: "#dc2626", color: "#fff", border: "none" }}>▶ Watch on YouTube</a>
      </div>
    </>
  );
}

// A branded cover emoji for link-only cards (ministries, resources) that have
// no player art to show — keeps every card looking finished.
function coverEmoji(item: LibraryItem): string {
  const c = item.category;
  if (c === "Message" || c === "Pastor") return "🎙️";
  if (c === "Book") return "📚";
  if (c === "Lesson") return "📖";
  if (c === "Resource") return "✝️";
  return "🎧";
}

// Cover for link-only cards: the org's real logo (Google favicon service),
// falling back to a branded tile if the logo can't load.
function LinkCover({ item, dark, border }: { item: LibraryItem; dark: boolean; border: string }) {
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(item.logo) && !failed;
  return (
    <div style={{ width: "100%", height: 100, borderRadius: 14, margin: "12px 0 14px", overflow: "hidden", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", background: showLogo ? "#ffffff" : `linear-gradient(135deg, ${dark ? "#2a2350" : "#e9e2ff"}, ${dark ? "#141d2e" : "#f6f2ff"})` }}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?domain=${item.logo}&sz=128`}
          alt={item.author ?? item.title}
          onError={() => setFailed(true)}
          style={{ height: 56, width: 56, objectFit: "contain" }}
        />
      ) : (
        <span style={{ fontSize: 46 }}>{coverEmoji(item)}</span>
      )}
    </div>
  );
}

// Same title on both services so a non-subscriber can still find it. Skip
// "theDJcares" (DJ's own label, not an artist) so the search stays useful.
const searchTerm = (item: LibraryItem) => {
  const a = item.author && item.author !== "theDJcares" ? item.author : "";
  return `${item.title} ${a}`.trim();
};
const spotifySearch = (item: LibraryItem) =>
  `https://open.spotify.com/search/${encodeURIComponent(searchTerm(item))}`;
const appleSearch = (item: LibraryItem) =>
  `https://music.apple.com/us/search?term=${encodeURIComponent(searchTerm(item))}`;

// Pre-filled request email — the dynamic pipeline. Everything is reviewed
// Gospel-first (the CrossHeartPray rule) before it's added.
const REQUEST_MAILTO =
  "mailto:ask@openmirrorllc.com?subject=" +
  encodeURIComponent("TheDJCares Request") +
  "&body=" +
  encodeURIComponent(
    "What I'd love on TheDJCares:\n\n" +
      "Title / name:\n" +
      "Artist or speaker:\n" +
      "Link (Apple Music, Spotify, or YouTube):\n" +
      "Why it encourages:\n\n" +
      "— I understand every request is reviewed Gospel-first before it's added. Thank you!"
  );

export default function TheDJCaresPage() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("faith");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [playerSyncVersion, setPlayerSyncVersion] = useState(0);
  // Re-keying every music embed reloads it — the only reliable way to stop
  // Apple/Spotify/YouTube iframes when a video starts. One sound at a time.
  const stopMusic = () => setPlayerSyncVersion(v => v + 1);
  const [openPlaylists, setOpenPlaylists] = useState<Record<string, boolean>>({});
  const [playerReload, setPlayerReload] = useState(0);
  const [libFilter, setLibFilter] = useState("All");
  const [getzVideo, setGetzVideo] = useState<LifeEssentialsPrinciple | null>(null);
  const [faithVid, setFaithVid] = useState<{ youtubeId: string; title: string } | null>(null);
  // When set, the faith player follows this shuffled order instead of page order.
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);
  // The open modal's video box — only one modal shows at a time, so one ref
  // serves both the Getz and faith players' ⛶ Fullscreen buttons.
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const goFullscreen = () => playerBoxRef.current?.requestFullscreen?.();

  // Follow the family ☀️/🌙 toggle in the Open Mirror bar.
  useEffect(() => {
    const follow = () =>
      setDark(document.documentElement.dataset.omTheme !== "light");
    follow();
    window.addEventListener("om-theme", follow);
    return () => window.removeEventListener("om-theme", follow);
  }, []);

  // Modal behavior — Escape closes, ←/→ step through the series, background
  // scroll locked — matches the CrossHeartPray player so the Gene Getz / faith
  // videos feel the same in both.
  useEffect(() => {
    if (!getzVideo && !faithVid) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setGetzVideo(null); setFaithVid(null); setShuffleOrder(null); }
      if (e.key === "ArrowLeft") { if (getzVideo) stepGetz(-1); else stepFaith(-1); }
      if (e.key === "ArrowRight") { if (getzVideo) stepGetz(1); else stepFaith(1); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  });

  // ⏮ / ⏭ walk the Gene Getz principles (wrapping) in canon order, so the
  // series plays like one long study without closing the player.
  const stepGetz = (dir: 1 | -1) => {
    if (!getzVideo) return;
    const next = getAdjacentPlayablePrinciple(getzVideo, dir);
    if (next) {
      setGetzVideo(next);
      track("media_play", { content_type: "getz_video", content_title: next.principleTitle, via: "prev_next" });
    }
  };

  // ⏮ / ⏭ walk the faith videos (wrapping) in page order — or shuffled order
  // when shuffle is on; 🔁 replays.
  const stepFaith = (dir: 1 | -1) => {
    if (!faithVid) return;
    const order = shuffleOrder ?? ALL_FAITH_VIDEO_IDS;
    const i = order.indexOf(faithVid.youtubeId);
    const nextId = order[(i + dir + order.length) % order.length];
    setFaithVid({ youtubeId: nextId, title: faithTitleOf(nextId) });
    track("media_play", { content_type: "faith_video", content_title: faithTitleOf(nextId), via: "prev_next" });
  };

  // Closing the player also turns shuffle off, so the next open starts fresh.
  const closeFaith = () => { setFaithVid(null); setShuffleOrder(null); };

  // 🔀 Shuffle all: every song once, in a new random order, starting now.
  const shuffleAll = () => {
    stopMusic();
    const order = shuffleIds(ALL_FAITH_VIDEO_IDS);
    setShuffleOrder(order);
    setFaithVid({ youtubeId: order[0], title: faithTitleOf(order[0]) });
    track("media_play", { content_type: "faith_video", content_title: faithTitleOf(order[0]), via: "shuffle_all" });
  };

  // In-player toggle: on = current song first, the rest reshuffled; off = page order.
  const toggleShuffle = () => {
    if (!faithVid) return;
    if (shuffleOrder) { setShuffleOrder(null); return; }
    setShuffleOrder([faithVid.youtubeId, ...shuffleIds(ALL_FAITH_VIDEO_IDS.filter(id => id !== faithVid.youtubeId))]);
  };

  const copyLine = (text: string, source: string, i: number) => {
    track("share", { method: "copy", content_type: "verse", item_id: source });
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
  const itemsIn = (c: string) => DJ_CARES_LIBRARY.filter(i => i.collection === c);
  // Music collections live on the Music & Videos tab; everything else on Library.
  const MUSIC_COLLECTIONS = ["Playlists"];
  const musicCollections = collections.filter(c => MUSIC_COLLECTIONS.includes(c));
  const libraryCollections = collections.filter(c => !MUSIC_COLLECTIONS.includes(c));
  const libraryCount = DJ_CARES_LIBRARY.filter(i => i.collection && !MUSIC_COLLECTIONS.includes(i.collection)).length;
  const chips = ["All", ...libraryCollections];

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "faith", label: "Music & Videos", emoji: "🎬" },
    { id: "library", label: "Library", emoji: "📚" },
    { id: "encourage", label: "Daily Hope", emoji: "📖" },
    { id: "request", label: "Request", emoji: "💌" },
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

        {/* Cover for link-only items (ministries, resources): real logo, else branded tile */}
        {!embed && !item.search && <LinkCover item={item} dark={dark} border={border} />}

        {/* Apple Music */}
        {embed && apple && (
          <iframe
            key={`am-${item.title}-${playerSyncVersion}`}
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
            key={`sp-${item.title}-${playerSyncVersion}`}
            src={embed}
            title={item.title}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: spotifyHeight, border: 0, borderRadius: 14, overflow: "hidden", margin: "12px 0 14px" }}
          />
        )}

        {/* Not a subscriber? Offer the other service so everyone can listen. */}
        {apple && (
          <a href={item.spotifyAlt ?? spotifySearch(item)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "#1DB954", textDecoration: "none" }}>
            {item.spotifyAlt ? "🟢 Prefer Spotify? Open the Spotify playlist →" : "🟢 No Apple Music? Find it on Spotify →"}
          </a>
        )}
        {spotify && (
          <a href={appleSearch(item)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: "#FA57C1", textDecoration: "none" }}>
            🍎 No Spotify? Find it on Apple Music →
          </a>
        )}

        {/* YouTube video / playlist (responsive 16:9) */}
        {embed && !apple && !spotify && (
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 14, overflow: "hidden", margin: "12px 0 14px", background: "#000" }}>
            <iframe
              key={`yt-${item.title}-${playerSyncVersion}`}
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
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(1.9rem, 9vw, 2.5rem)", fontWeight: 900, color: text, margin: "0 0 10px" }}>theDJcares<span style={{ color: "#A78BFA" }}>.com</span></h1>
          <p style={{ fontSize: 15, color: sub, lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
            Curated music, sermons, and encouragement — Gospel first. Hand-picked. No algorithm.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); track("tab_view", { tab: t.id }); }} style={{
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
              <h2 style={{ fontSize: 26, fontWeight: 900, color: text, margin: "0 0 8px" }}>Encouragement Library</h2>
              <p style={{ fontSize: 15, color: sub, lineHeight: 1.6, margin: 0 }}>
                Messages, songs, playlists, and links to keep close and share.
              </p>
            </div>

            {/* Category chips */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {chips.map(label => {
                const count = label === "All" ? libraryCount : itemsIn(label).length;
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
            {(libFilter === "All" ? libraryCollections : [libFilter]).map(c => (
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
                          onClick={() => { stopMusic(); setGetzVideo(getz); track("media_play", { content_type: "getz_video", content_title: getz.principleTitle }); }}
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

            <button onClick={() => setTab("request")} className="pop" style={{ width: "100%", marginTop: 32, background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "18px 22px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Have a song, sermon, or playlist to share?</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#A78BFA", flexShrink: 0 }}>💌 Request →</span>
            </button>
          </>
        )}

        {/* Faith Videos tab — the Faith Playlist as watchable videos, by mood */}
        {tab === "faith" && (
          <>
            {/* Music playlists — TheDJCares-reviewed, streaming right here */}
            <h3 style={{ fontSize: 22, fontWeight: 900, color: text, margin: "0 0 4px" }}>🎵 The Music</h3>
            <p style={{ fontSize: 14, color: sub, margin: "0 0 10px" }}>
              TheDJCares-reviewed playlists — press play, they stream right here.
            </p>
            <p style={{ fontSize: 13, color: sub, margin: "0 0 16px" }}>
              Apple Music member? Sign in on any one player, then{" "}
              <button
                type="button"
                onClick={() => setPlayerSyncVersion(v => v + 1)}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 800, color: "#A78BFA", cursor: "pointer", textDecoration: "underline" }}
              >
                sync the rest ↻
              </button>{" "}
              — no need to sign in seven times.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 44 }}>
              {musicCollections.flatMap(itemsIn).map(Card)}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "0 0 4px" }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: text, margin: 0 }}>🎬 The Videos</h3>
              <button onClick={shuffleAll} className="pop" style={{ background: "#A78BFA", border: "none", color: "#0C0C0C", borderRadius: 50, padding: "10px 20px", fontSize: 14, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
                🔀 Shuffle all
              </button>
            </div>
            <p style={{ fontSize: 14, color: sub, marginBottom: 6 }}>
              The Faith Playlist as watchable videos — sorted by mood. Tap any song to play it right here, or hit Shuffle to play every song in a random order.
            </p>
            <p style={{ fontSize: 13, color: sub, marginBottom: 24 }}>
              Prefer the full mix?{" "}
              <a href="https://music.apple.com/us/playlist/faith-playlist/pl.u-2aoqXjzsNqgmY7" target="_blank" rel="noopener noreferrer" style={{ color: "#A78BFA", fontWeight: 800, textDecoration: "none" }}>
                Open the Faith Playlist on Apple Music →
              </a>
            </p>

            {FAITH_THEMES.map(theme => (
              <section key={theme.key} style={{ marginBottom: 40 }}>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: text, margin: "0 0 4px" }}>
                  {theme.emoji} {theme.label}
                </h3>
                <p style={{ fontSize: 14, color: sub, margin: "0 0 16px" }}>{theme.blurb}</p>

                {theme.playlistId && (
                  <div style={{ marginBottom: 16 }}>
                    {openPlaylists[theme.key] ? (
                      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
                        <iframe
                          key={`tpl-${theme.key}-${playerSyncVersion}`}
                          src={`https://www.youtube.com/embed/videoseries?list=${theme.playlistId}&modestbranding=1&rel=0&cc_load_policy=1&cc_lang_pref=en`}
                          title={`${theme.label} playlist`}
                          allow="encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => { stopMusic(); setOpenPlaylists(o => ({ ...o, [theme.key]: true })); track("playlist_open", { content_title: theme.key }); }}
                        className="pop"
                        style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", aspectRatio: "16 / 9", background: "#000", border: `2px solid ${border}`, borderRadius: 14, cursor: "pointer" }}
                        aria-label={`Play the ${theme.label} playlist`}
                      >
                        <span style={{ fontSize: 44 }}>▶️</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Play the {theme.label} playlist</span>
                      </button>
                    )}
                    <p style={{ fontSize: 12, color: sub, margin: "8px 0 0", textAlign: "right" }}>
                      If YouTube blocks playback here,{" "}
                      <a href={`https://www.youtube.com/playlist?list=${theme.playlistId}`} target="_blank" rel="noopener noreferrer" style={{ color: "#A78BFA", fontWeight: 800, textDecoration: "none" }}>
                        watch on YouTube →
                      </a>
                    </p>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                  {theme.videos.map(v => (
                    <button
                      key={v.youtubeId}
                      onClick={() => { stopMusic(); setFaithVid({ youtubeId: v.youtubeId, title: `${v.title} — ${v.artist}` }); track("media_play", { content_type: "faith_video", content_title: `${v.title} — ${v.artist}` }); }}
                      className="pop"
                      style={{ background: card, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", textAlign: "left", padding: 0 }}
                    >
                      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`} alt={v.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>▶️</span>
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: 0 }}>{v.title}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA", margin: "2px 0 0" }}>{v.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}

            <button onClick={() => setTab("request")} className="pop" style={{ width: "100%", marginTop: 8, background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "18px 22px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: text }}>Have a playlist, song, or mood to add?</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#A78BFA", flexShrink: 0 }}>💌 Request →</span>
            </button>
          </>
        )}

        {/* Request tab — the dynamic pipeline: people send, DJ reviews Gospel-first, adds */}
        {tab === "request" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: text, margin: "0 0 10px" }}>Request a song, sermon, or playlist</h2>
              <p style={{ fontSize: 16, color: sub, lineHeight: 1.7, margin: 0 }}>
                TheDJCares grows from what people share. Send a song, sermon, concert, podcast, or a whole playlist link — Apple Music, Spotify, or YouTube — and if it points people to Jesus, I&apos;ll add it here.
              </p>
            </div>

            <div style={{ background: dark ? "#1a1440" : "#f3f0ff", border: `2px solid ${dark ? "#33285c" : "#d9ccf5"}`, borderRadius: 18, padding: "18px 22px", marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A78BFA", margin: "0 0 8px" }}>✝️ The one rule — Gospel first</p>
              <p style={{ fontSize: 14.5, color: sub, margin: 0, lineHeight: 1.65 }}>
                Every request is reviewed against Scripture, the same way{" "}
                <a href="https://crossheartpray.com" target="_blank" rel="noopener noreferrer" style={{ color: "#A78BFA", fontWeight: 800, textDecoration: "none" }}>CrossHeartPray</a>{" "}
                is built. Jesus is first, Scripture is the test. If it points people to Him, it goes in.
              </p>
            </div>

            <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px" }}>
              <p style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#A78BFA", margin: "0 0 14px" }}>What to send</p>
              {([
                ["🎵", "A song or artist", "Christian music that lifts people up."],
                ["🎬", "A sermon or concert", "A message or worship night on YouTube."],
                ["🎧", "A podcast", "Bible-first teaching worth sharing."],
                ["📃", "A playlist link", "Apple Music, Spotify, or YouTube — I can embed the whole thing."],
                ["⛪", "Your church or ministry", "Want to be featured? Send it along."],
              ] as [string, string, string][]).map(([e, t, d]) => (
                <div key={t} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{e}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: text, margin: 0 }}>{t}</p>
                    <p style={{ fontSize: 13.5, color: sub, margin: "2px 0 0", lineHeight: 1.5 }}>{d}</p>
                  </div>
                </div>
              ))}
              <a href={REQUEST_MAILTO} style={{ display: "inline-block", marginTop: 6, background: "#A78BFA", color: "#0C0C0C", borderRadius: 50, padding: "13px 28px", fontSize: 15, fontWeight: 900, textDecoration: "none" }}>
                💌 Send your request
              </a>
              <p style={{ fontSize: 12.5, color: sub, margin: "12px 0 0", lineHeight: 1.5 }}>Opens your email to ask@openmirrorllc.com with a ready-to-fill template.</p>
            </div>
          </>
        )}

        {/* About TheDJCares — quiet card, every tab */}
        <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", marginTop: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em", color: "#A78BFA", margin: "0 0 8px" }}>
            About TheDJCares
          </p>
          <p style={{ fontSize: 14, color: sub, margin: 0, lineHeight: 1.7 }}>
            TheDJCares is part of the Open Mirror family. It supports the heart behind{" "}
            <a href="https://crossheartpray.com" target="_blank" rel="noopener noreferrer" style={{ color: "#A78BFA", fontWeight: 800, textDecoration: "none" }}>CrossHeartPray</a>{" "}
            by gathering trusted Christian encouragement in one place: messages, music, prayer,
            teaching, and resources that point people toward Jesus. It is a companion project —
            simple, curated, and built to encourage.
          </p>
        </div>

      </div>

      {getzVideo?.youtubeId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setGetzVideo(null)}
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 16 }}
        >
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 960, maxHeight: "calc(100dvh - 32px)", overflowY: "auto", background: "#0f1523", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#A78BFA", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Dr. Gene Getz · Principle {getzVideo.principleNumber} · {getzVideo.principleTitle}
              </p>
              <button onClick={() => setGetzVideo(null)} style={{ flexShrink: 0, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "6px 16px", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                Close ✕
              </button>
            </div>
            <div ref={playerBoxRef} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
              <iframe
                key={`${getzVideo.youtubeId}-${playerReload}`}
                src={`https://www.youtube.com/embed/${getzVideo.youtubeId}?autoplay=1&rel=0&controls=1&playsinline=1&fs=1&cc_load_policy=1&cc_lang_pref=en`}
                title={getzVideo.principleTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => stepGetz(-1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                ⏮ Previous
              </button>
              <button onClick={goFullscreen} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                ⛶ Fullscreen
              </button>
              <button onClick={() => stepGetz(1)} style={{ background: "#A78BFA", border: "none", color: "#0C0C0C", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                Next ⏭
              </button>
            </div>
            <PlayerHelp watchUrl={`https://www.youtube.com/watch?v=${getzVideo.youtubeId}`} onReload={() => setPlayerReload(v => v + 1)} />
          </div>
        </div>
      )}

      {faithVid && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeFaith}
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", padding: 16 }}
        >
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 960, maxHeight: "calc(100dvh - 32px)", overflowY: "auto", background: "#0f1523", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#A78BFA", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {faithVid.title}
              </p>
              <button onClick={closeFaith} style={{ flexShrink: 0, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50, padding: "6px 16px", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                Close ✕
              </button>
            </div>
            <div ref={playerBoxRef} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 14, overflow: "hidden" }}>
              <iframe
                key={`${faithVid.youtubeId}-${playerReload}-${shuffleOrder ? "shuffle" : "order"}`}
                src={`https://www.youtube.com/embed/${faithVid.youtubeId}?autoplay=1&rel=0&controls=1&playsinline=1&fs=1&cc_load_policy=1&cc_lang_pref=en&loop=1&playlist=${faithPlaylistFrom(faithVid.youtubeId, shuffleOrder ?? undefined)}`}
                title={faithVid.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              />
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0 0" }}>
              {shuffleOrder
                ? "Shuffle is on — every song plays once, in a random order."
                : "Videos keep playing in order, all the way around — like one big playlist."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => stepFaith(-1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                ⏮ Previous
              </button>
              <button onClick={toggleShuffle} style={{ background: shuffleOrder ? "#A78BFA" : "rgba(255,255,255,0.1)", border: shuffleOrder ? "none" : "1px solid rgba(255,255,255,0.25)", color: shuffleOrder ? "#0C0C0C" : "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                {shuffleOrder ? "🔀 Shuffle on" : "🔀 Shuffle"}
              </button>
              <button onClick={() => setPlayerReload(v => v + 1)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                🔁 Replay
              </button>
              <button onClick={goFullscreen} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                ⛶ Fullscreen
              </button>
              <button onClick={() => stepFaith(1)} style={{ background: "#A78BFA", border: "none", color: "#0C0C0C", borderRadius: 50, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                Next ⏭
              </button>
            </div>
            <PlayerHelp watchUrl={`https://www.youtube.com/watch?v=${faithVid.youtubeId}`} onReload={() => setPlayerReload(v => v + 1)} />
          </div>
        </div>
      )}
    </main>
  );
}
