"use client";
import { useState, useEffect } from "react";
import OpenMirrorNav from "./OpenMirrorNav";
import {
  DJ_CARES_LIBRARY,
  LIBRARY_FILTERS,
  getEmbedUrl,
  getWatchUrl,
  parseYouTube,
  userVideoItem,
  userPlaylistItem,
  type LibraryItem,
} from "./lib/djCaresLibrary";

// Reliable links: search resolves the right video/show and never 404s on a dead ID.
const ytSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

type Resource = { title: string; artist?: string; desc: string; url: string; tag: string };

const MUSIC: Resource[] = [
  { title: "Graves Into Gardens", artist: "Elevation Worship", desc: "One of the most powerful modern worship songs — turn it up.", url: "https://www.youtube.com/watch?v=oDEO2N7EgZI", tag: "Worship" },
  { title: "Gratitude", artist: "Brandon Lake", desc: "Simple, honest, and hits every time.", url: "https://www.youtube.com/watch?v=OSTzXwJYxkU", tag: "Gratitude" },
  { title: "Way Maker", artist: "Sinach", desc: "A declaration of faith over any hard season.", url: "https://www.youtube.com/watch?v=iJCV_2H9xD0", tag: "Faith" },
  { title: "King of Kings", artist: "Hillsong Worship", desc: "A sweeping reminder of the whole gospel story.", url: "https://www.youtube.com/watch?v=BpFubBhIRe4", tag: "Worship" },
  { title: "Goodness of God", artist: "Bethel Music / Jenn Johnson", desc: "For when you need to remember He has been faithful.", url: "https://www.youtube.com/watch?v=XEatn9OiASc", tag: "Healing" },
  { title: "Greater Things", artist: "Shawn McDonald", desc: "Quiet, prayerful, honest.", url: "https://www.youtube.com/watch?v=RhH5ew4kfD8", tag: "Prayer" },
  { title: "Even If", artist: "MercyMe", desc: "Written from real pain. For the hard days.", url: "https://www.youtube.com/watch?v=blSAJXFNnnc", tag: "Healing" },
  { title: "Same God", artist: "Elevation Worship", desc: "He was faithful then. He is faithful now.", url: "https://www.youtube.com/watch?v=xLlNqhRpHk4", tag: "Faith" },
  { title: "Christ Be All Around Me", artist: "All Sons & Daughters", desc: "Slow, quiet, prayerful — good for morning.", url: "https://www.youtube.com/watch?v=BxLvfylP2UA", tag: "Morning" },
  { title: "Holy Water", artist: "We The Kingdom", desc: "About grace, honesty, and needing Jesus.", url: "https://www.youtube.com/watch?v=b7A5x_bLo1s", tag: "Grace" },
  { title: "I Can Only Imagine", artist: "MercyMe", desc: "A classic. If you don't know the story behind it, look it up.", url: "https://www.youtube.com/watch?v=Q5NUqCjY0BA", tag: "Eternal" },
  { title: "What a Beautiful Name", artist: "Hillsong Worship", desc: "One of the best modern hymns written in a generation.", url: "https://www.youtube.com/watch?v=nQWFzMvCfLE", tag: "Worship" },
];

const SERMONS: Resource[] = [
  { title: "Louie Giglio – Don't Give the Enemy a Seat at Your Table", desc: "Powerful teaching on spiritual warfare and identity.", url: "https://www.youtube.com/watch?v=RkqPbOh5NfI", tag: "Identity" },
  { title: "Tim Keller – The Prodigal Sons", desc: "The best sermon ever preached on Luke 15. Period.", url: "https://www.youtube.com/watch?v=H-UAmXBpNXo", tag: "Grace" },
  { title: "Francis Chan – Forgotten God", desc: "A sobering look at how the church often ignores the Holy Spirit.", url: "https://www.youtube.com/watch?v=H8mENj5Lj-A", tag: "Spirit" },
  { title: "Tony Evans – Kingdom Man", desc: "On identity, purpose, and being who God called you to be.", url: "https://www.youtube.com/watch?v=BQXR7IlkL2U", tag: "Purpose" },
  { title: "Steven Furtick – You're Not Who They Say You Are", desc: "For anyone carrying someone else's label.", url: "https://www.youtube.com/watch?v=TIQFH1Jq1JM", tag: "Identity" },
  { title: "Voddie Baucham – Why I Choose to Believe the Bible", desc: "Thoughtful, direct, apologetics for real questions.", url: "https://www.youtube.com/watch?v=KgDEiGEoExM", tag: "Truth" },
];

const PODCASTS: Resource[] = [
  { title: "The Bible Project Podcast", desc: "Deep, thoughtful, and makes Scripture come alive. Start anywhere.", url: "https://bibleproject.com/podcasts/", tag: "Bible" },
  { title: "Carey Nieuwhof Leadership Podcast", desc: "Faith, leadership, culture, and what it means to live with purpose.", url: "https://careynieuwhof.com/podcast/", tag: "Growth" },
  { title: "Ask Pastor John (Desiring God)", desc: "Honest answers to hard questions from John Piper.", url: "https://www.desiringgod.org/ask-pastor-john", tag: "Answers" },
  { title: "Elevation with Steven Furtick", desc: "Weekly sermons from Elevation Church — practical and biblical.", url: "https://www.google.com/search?q=Elevation+with+Steven+Furtick+podcast", tag: "Sermons" },
  { title: "Knowing Faith", desc: "Theology for regular people. Warm, accessible, real.", url: "https://www.google.com/search?q=Knowing+Faith+podcast", tag: "Theology" },
  { title: "The RobCast (Rob Bell)", desc: "Contemplative, wide-ranging conversations about faith and meaning.", url: "https://robbell.com/portfolio/robcast/", tag: "Contemplative" },
];

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

type Tab = "library" | "music" | "sermons" | "podcasts" | "encourage";

export default function TheDJCaresPage() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState<Tab>("library");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [musicTag, setMusicTag] = useState("All");
  const [libFilter, setLibFilter] = useState("All");
  const [dropText, setDropText] = useState("");
  const [userItems, setUserItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("djc-theme");
    if (saved) setDark(saved === "dark");
    try {
      const raw = localStorage.getItem("djc-playlist");
      if (raw) setUserItems(JSON.parse(raw) as LibraryItem[]);
    } catch {}
  }, []);

  const persistUserItems = (items: LibraryItem[]) => {
    setUserItems(items);
    try { localStorage.setItem("djc-playlist", JSON.stringify(items)); } catch {}
  };

  const addFromDrop = () => {
    const { playlistId, videoIds } = parseYouTube(dropText);
    const next = [...userItems];
    const has = (id: string) => next.some(i => i.id === id);
    if (playlistId) {
      const item = userPlaylistItem(playlistId);
      if (!has(item.id)) next.unshift(item);
    }
    for (const vid of videoIds) {
      const item = userVideoItem(vid);
      if (!has(item.id)) next.push(item);
    }
    persistUserItems(next);
    setDropText("");
  };

  const removeUserItem = (id: string) => persistUserItems(userItems.filter(i => i.id !== id));
  const clearUserItems = () => persistUserItems([]);


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

  const musicTags = ["All", ...Array.from(new Set(MUSIC.map(m => m.tag)))];
  const filteredMusic = musicTag === "All" ? MUSIC : MUSIC.filter(m => m.tag === musicTag);

  // Combined library = curated items + the user's dropped playlist videos.
  const allLibrary = [...DJ_CARES_LIBRARY, ...userItems];
  const catsFor = (label: string) => LIBRARY_FILTERS.find(f => f.label === label)?.categories ?? [];
  const countFor = (label: string) =>
    label === "All" ? allLibrary.length : allLibrary.filter(i => catsFor(label).includes(i.category)).length;
  const libChips = ["All", ...LIBRARY_FILTERS.map(f => f.label)];
  const filteredLibrary =
    libFilter === "All" ? allLibrary : allLibrary.filter(i => catsFor(libFilter).includes(i.category));

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "library", label: "Library", emoji: "📚" },
    { id: "music", label: "Music", emoji: "🎵" },
    { id: "sermons", label: "Sermons", emoji: "🎙️" },
    { id: "podcasts", label: "Podcasts", emoji: "🎧" },
    { id: "encourage", label: "Encouragement", emoji: "❤️" },
  ];

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
              borderRadius: 50, padding: "10px 20px",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              color: tab === t.id ? "#0C0C0C" : sub,
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Library tab — curated Encouragement Library, videos play in-app */}
        {tab === "library" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: text, margin: "0 0 10px" }}>Encouragement Library</h2>
              <p style={{ fontSize: 15, color: sub, lineHeight: 1.7, margin: "0 0 12px" }}>
                A growing place for the messages, songs, books, lessons, and links I want to keep close and share with people who need encouragement.
              </p>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#FB7185", letterSpacing: "0.02em", margin: 0 }}>
                Curated for encouragement. Always test every message against Scripture.
              </p>
            </div>

            {/* Drop your playlist — plays in-app, saved to this browser */}
            <div style={{ marginBottom: 28, background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px" }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: text, margin: "0 0 4px" }}>🎧 Drop your playlist</p>
              <p style={{ fontSize: 13, color: sub, margin: "0 0 12px", lineHeight: 1.55 }}>
                Paste a YouTube <strong>playlist link</strong> (plays every video in-app) or <strong>video links / IDs</strong>, one per line. They save to this browser and show up below as playable cards.
              </p>
              <textarea
                value={dropText}
                onChange={e => setDropText(e.target.value)}
                placeholder={"https://www.youtube.com/playlist?list=...\nhttps://youtu.be/JW6fd-ZWavs"}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", background: bg, color: text, border: `2px solid ${border}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical", marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={addFromDrop} disabled={!dropText.trim()} style={{
                  background: dropText.trim() ? "#FB7185" : border, color: dropText.trim() ? "#0C0C0C" : sub,
                  border: "none", borderRadius: 50, padding: "10px 22px", fontSize: 14, fontWeight: 800,
                  cursor: dropText.trim() ? "pointer" : "default",
                }}>Add to my library</button>
                {userItems.length > 0 && (
                  <button onClick={clearUserItems} style={{ background: "none", border: `2px solid ${border}`, color: sub, borderRadius: 50, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                    Clear my {userItems.length} item{userItems.length === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            </div>

            {/* Category filter chips (with counts) */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {libChips.map(label => {
                const count = countFor(label);
                const selected = libFilter === label;
                const empty = count === 0;
                return (
                  <button key={label} onClick={() => !empty && setLibFilter(label)} disabled={empty} style={{
                    background: selected ? active : "none",
                    border: `2px solid ${selected ? activeBorder : border}`,
                    borderRadius: 50, padding: "7px 16px",
                    fontSize: 12, fontWeight: 800, cursor: empty ? "default" : "pointer",
                    color: selected ? "#FB7185" : sub, opacity: empty ? 0.4 : 1,
                  }}>{label} <span style={{ opacity: 0.7 }}>{count}</span></button>
                );
              })}
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredLibrary.length === 0 && (
                <p style={{ fontSize: 14, color: sub, margin: 0 }}>Nothing here yet — check back soon.</p>
              )}
              {filteredLibrary.map(item => {
                const embed = getEmbedUrl(item);
                const isUser = item.id.startsWith("user-");
                return (
                  <div key={item.id} className="pop" style={{ background: card, border: `2px solid ${item.featured ? activeBorder : border}`, borderRadius: 18, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <div>
                        {item.featured && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#FB7185", textTransform: "uppercase", letterSpacing: "0.1em" }}>★ Featured</span>
                        )}
                        <p style={{ fontSize: 18, fontWeight: 800, color: text, margin: "2px 0 2px" }}>{item.title}</p>
                        {item.author && <p style={{ fontSize: 13, fontWeight: 700, color: "#FB7185", margin: 0 }}>{item.author}</p>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, paddingTop: 3 }}>
                        {item.category === "Message" ? "Message · Encouragement" : item.category}
                      </span>
                    </div>

                    {/* In-app responsive video / playlist player */}
                    {embed && (
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
                      <p style={{ fontSize: 14, color: sub, margin: "0 0 12px", lineHeight: 1.6 }}>{item.summary}</p>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {item.tags.map(t => (
                          <span key={t} style={{ fontSize: 11, fontWeight: 700, color: sub, background: dark ? "#1A1A1A" : "#F5F5F4", border: `1px solid ${border}`, borderRadius: 50, padding: "4px 10px" }}>#{t}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                      {embed ? (
                        <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 800, color: sub, textDecoration: "none", letterSpacing: "0.04em" }}>
                          ↗ Open on YouTube
                        </a>
                      ) : item.search ? (
                        <a href={getWatchUrl(item)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 800, color: "#FB7185", textDecoration: "none", letterSpacing: "0.04em" }}>
                          ▶ Watch on YouTube
                        </a>
                      ) : null}
                      {isUser && (
                        <button onClick={() => removeUserItem(item.id)} style={{ background: "none", border: "none", color: sub, fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0, letterSpacing: "0.04em" }}>
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coming next — no fake content, just a roadmap */}
            <div style={{ marginTop: 32, background: dark ? "#111" : "#FAFAF9", border: `2px dashed ${border}`, borderRadius: 18, padding: "20px 22px" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>Coming next</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Pastors", "Books", "Songs", "Lessons"].map(label => (
                  <span key={label} style={{ fontSize: 13, fontWeight: 800, color: sub, background: card, border: `2px solid ${border}`, borderRadius: 50, padding: "8px 16px" }}>{label}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Music tab */}
        {tab === "music" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {musicTags.map(t => (
                <button key={t} onClick={() => setMusicTag(t)} style={{
                  background: musicTag === t ? active : "none",
                  border: `2px solid ${musicTag === t ? activeBorder : border}`,
                  borderRadius: 50, padding: "7px 16px",
                  fontSize: 12, fontWeight: 800, cursor: "pointer",
                  color: musicTag === t ? "#FB7185" : sub,
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredMusic.map(r => (
                <a key={r.title} href={ytSearch(`${r.title} ${r.artist ?? ""}`)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <div className="pop" style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>▶️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ fontSize: 17, fontWeight: 800, color: text, margin: "0 0 2px" }}>{r.title}</p>
                          {r.artist && <p style={{ fontSize: 13, fontWeight: 700, color: "#FB7185", margin: "0 0 6px" }}>{r.artist}</p>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, paddingTop: 3 }}>{r.tag}</span>
                      </div>
                      <p style={{ fontSize: 14, color: sub, margin: 0, lineHeight: 1.55 }}>{r.desc}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Sermons tab */}
        {tab === "sermons" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SERMONS.map(r => (
              <a key={r.title} href={ytSearch(r.title)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>🎙️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 17, fontWeight: 800, color: text, margin: "0 0 6px" }}>{r.title}</p>
                      <span style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{r.tag}</span>
                    </div>
                    <p style={{ fontSize: 14, color: sub, margin: 0, lineHeight: 1.55 }}>{r.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Podcasts tab */}
        {tab === "podcasts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PODCASTS.map(r => (
              <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <div style={{ background: card, border: `2px solid ${border}`, borderRadius: 18, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>🎧</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 17, fontWeight: 800, color: text, margin: "0 0 6px" }}>{r.title}</p>
                      <span style={{ fontSize: 11, fontWeight: 800, color: sub, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{r.tag}</span>
                    </div>
                    <p style={{ fontSize: 14, color: sub, margin: 0, lineHeight: 1.55 }}>{r.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Encouragement tab */}
        {tab === "encourage" && (
          <>
            <p style={{ fontSize: 15, color: sub, marginBottom: 20 }}>Tap any card to copy and send to someone who needs it.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ENCOURAGE.map((e, i) => {
                const isVerse = e.source !== "theDJcares";
                return (
                  <div key={i} className="pop" style={{ background: copiedIdx === i ? active : card, border: `2px solid ${copiedIdx === i ? activeBorder : border}`, borderRadius: 18, overflow: "hidden" }}>
                    <button onClick={() => copyLine(e.text, e.source, i)} style={{ width: "100%", background: "none", border: "none", padding: "22px 24px", cursor: "pointer", textAlign: "left" }}>
                      <p style={{ fontSize: 17, fontWeight: 700, color: text, lineHeight: 1.65, margin: "0 0 8px" }}>"{e.text}"</p>
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
