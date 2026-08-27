// Shared four-mode media switcher (owner, 2026-08-26): Music, Videos,
// Podcasts, and Sermons must feel like ONE player app with four obvious
// modes, not four separate page sections that happen to share a nav bar —
// so there is exactly one MediaSwitcher component, mounted once, in the
// same position and style on Home and all four browse tabs. Home,
// Ministries, and Churches are deliberately NOT part of it (a return
// destination and two off-site discovery sections, not playback modes).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const app = join(__dirname, "../..");
const homeClient = readFileSync(join(app, "HomeClient.tsx"), "utf8");
const mediaSwitcher = readFileSync(join(app, "components/MediaSwitcher.tsx"), "utf8");

describe("MediaSwitcher: the four modes, exactly", () => {
  it("MEDIA_MODES is exactly Music, Videos, Podcasts, Sermons, in that order — nothing else", () => {
    const start = mediaSwitcher.indexOf("export const MEDIA_MODES");
    const end = mediaSwitcher.indexOf("];", start);
    const src = mediaSwitcher.slice(start, end);
    const ids = [...src.matchAll(/id:\s*"(\w+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["music", "videos", "podcasts", "sermons"]);
  });

  it("never references Home, Ministries, Churches, About, or Digital DJ — those stay out of the four-way control entirely", () => {
    for (const banned of ['"spin"', '"ministries"', '"churches"', '"about"', "digital-dj", "Digital DJ"]) {
      expect(mediaSwitcher).not.toContain(banned);
    }
  });
});

describe("MediaSwitcher: real ARIA tabs, not styled buttons pretending to be tabs", () => {
  it("the tablist container and each tab carry the required roles/attributes", () => {
    expect(mediaSwitcher).toContain('role="tablist"');
    expect(mediaSwitcher).toContain('aria-label="Browse media"');
    expect(mediaSwitcher).toContain('role="tab"');
    expect(mediaSwitcher).toContain("aria-selected={selected}");
    expect(mediaSwitcher).toContain("aria-controls={mediaPanelId(m.id)}");
    expect(mediaSwitcher).toContain('id={mediaTabId(m.id)}');
  });

  it("tabs are real <button type=\"button\"> elements, so Enter/Space activation is native — no custom keydown-to-activate handler needed", () => {
    expect(mediaSwitcher).toContain('type="button"');
    expect(mediaSwitcher).toContain('role="tab"');
    // The click handler is the one and only activation path.
    expect(mediaSwitcher).toContain("onClick={() => onSelect(m.id)}");
  });

  it("roving tabindex: only the selected tab (or the first, when none is selected) is a Tab stop — the rest are -1", () => {
    expect(mediaSwitcher).toContain("tabIndex={isRovingStop ? 0 : -1}");
    expect(mediaSwitcher).toContain("active === null ? m.id === MEDIA_MODES[0].id : selected");
  });

  it("ArrowLeft/ArrowRight/Home/End move focus among the tabs without activating them (manual-activation APG pattern)", () => {
    const start = mediaSwitcher.indexOf("const onKeyDown");
    const end = mediaSwitcher.indexOf("\n  };", start);
    const fn = mediaSwitcher.slice(start, end);
    expect(fn).toContain('"ArrowLeft"');
    expect(fn).toContain('"ArrowRight"');
    expect(fn).toContain('"Home"');
    expect(fn).toContain('"End"');
    expect(fn).toContain(".focus()");
    // Moving focus must never call onSelect — activation stays on the user's
    // own Enter/Space/click, per the manual-activation pattern.
    expect(fn).not.toContain("onSelect(");
  });

  it("visible focus is never suppressed (no outline:none anywhere in the component)", () => {
    expect(mediaSwitcher).not.toMatch(/outline:\s*["']?none["']?/);
  });
});

describe("HomeClient: exactly one shared switcher instance, same component everywhere", () => {
  it("MediaSwitcher is imported and mounted exactly once — not duplicated per tab", () => {
    expect(homeClient).toContain('import MediaSwitcher, { mediaPanelId, mediaTabId, type MediaTab } from "./components/MediaSwitcher"');
    expect(homeClient.match(/<MediaSwitcher\b/g)?.length).toBe(1);
  });

  it("the one instance lives inside the shared category nav — the same fixed JSX position (governed by CSS `order`, see homepageOrder.test.ts) that already paints identically on Home and every browse tab", () => {
    const navStart = homeClient.indexOf('aria-label="Category tabs"');
    const navEnd = homeClient.indexOf("</nav>", navStart);
    const switcherIdx = homeClient.indexOf("<MediaSwitcher");
    expect(switcherIdx).toBeGreaterThan(navStart);
    expect(switcherIdx).toBeLessThan(navEnd);
  });

  it("selection is wired straight to the bare goTab reference — no wrapper that could also touch playback state", () => {
    expect(homeClient).toContain("onSelect={goTab}");
  });

  it("active mode is derived from `tab`, null on Home/secondary sections — never a second, independent selection state", () => {
    expect(homeClient).toContain("const mediaTabActive = PRIMARY_TAB_IDS.includes(tab) ? (tab as MediaTab) : null;");
    expect(homeClient).toContain("active={mediaTabActive}");
  });
});

describe("HomeClient: each of the four browse tabs is a real, associated tab panel", () => {
  for (const id of ["music", "videos", "podcasts", "sermons"]) {
    it(`"${id}" tab's heading block declares role="tabpanel" with matching id/aria-labelledby`, () => {
      const idx = homeClient.indexOf(`{tab === "${id}" && (`);
      expect(idx, `tab "${id}"`).toBeGreaterThan(-1);
      const section = homeClient.slice(idx, idx + 400);
      expect(section).toContain('role="tabpanel"');
      expect(section).toContain(`id={mediaPanelId("${id}")}`);
      expect(section).toContain(`aria-labelledby={mediaTabId("${id}")}`);
    });
  }

  it("each panel's heading/description/filter/spin-button shell appears in the same relative order — title, then description, then filter (when one exists), then the Spin action — so no category's controls drift out of the shared shape", () => {
    for (const id of ["music", "videos", "podcasts", "sermons"]) {
      const idx = homeClient.indexOf(`{tab === "${id}" && (`);
      const section = homeClient.slice(idx, idx + 2200);
      const h2Idx = section.indexOf("<h2 style={sectionH}>");
      const descIdx = section.indexOf("<p style={sectionSub}>");
      const spinIdx = section.search(/🔀 Spin/);
      expect(h2Idx, `${id} heading`).toBeGreaterThan(-1);
      expect(descIdx, `${id} description`).toBeGreaterThan(h2Idx);
      expect(spinIdx, `${id} spin action`).toBeGreaterThan(descIdx);
    }
  });

  it("Music, Videos, and Podcasts now each carry a Spin action, same as Sermons already did — no category is missing the shared action", () => {
    expect(homeClient).toContain("🔀 Spin music");
    expect(homeClient).toContain("🔀 Spin videos");
    expect(homeClient).toContain("🔀 Spin a podcast");
    expect(homeClient).toContain("🔀 Spin a sermon");
  });

  it("Podcast cards now show the same \"Now Spinning\" language as MediaCard/PlaylistCard when current — no more silent podcast card with no now-playing state", () => {
    const idx = homeClient.indexOf('{tab === "podcasts" && (');
    const section = homeClient.slice(idx, homeClient.indexOf('{tab === "sermons"', idx));
    expect(section).toContain("Now Spinning");
    expect(section).toContain("isCurrent &&");
  });
});

describe("Home, Ministries, and Churches: accessible, but visually and semantically secondary", () => {
  it("none of the three appear inside MediaSwitcher's MEDIA_MODES (already asserted above) — they're rendered by HomeClient itself, in a distinctly labeled 'Explore' row, not the tablist", () => {
    expect(homeClient).toContain("Explore");
    const exploreIdx = homeClient.indexOf("Explore");
    const rowStart = homeClient.indexOf("SECONDARY_TAB_IDS.includes(t.id)", exploreIdx);
    expect(rowStart).toBeGreaterThan(-1);
  });

  it("the secondary row uses plain nav buttons (aria-current, not role=\"tab\"/aria-selected) — distinct semantics from the tablist above it", () => {
    const idx = homeClient.indexOf("SECONDARY_TAB_IDS.includes(t.id)");
    const section = homeClient.slice(idx, idx + 700);
    expect(section).toContain('aria-current={tab === t.id ? "page" : undefined}');
    expect(section).not.toContain('role="tab"');
  });

  it("the secondary chips are visually lighter than the primary switcher's tabs — smaller type, pill shape, thinner border, still a real 44px touch target", () => {
    const idx = homeClient.indexOf("SECONDARY_TAB_IDS.includes(t.id)");
    const section = homeClient.slice(idx, idx + 700);
    expect(section).toContain("borderRadius: 999");
    expect(section).toContain("fontSize: 12.5");
    expect(section).toContain("minHeight: 44");
  });

  it("all three destinations remain reachable via the exact same goTab/history path as before — nothing was removed from TABS", () => {
    for (const id of ["spin", "ministries", "churches"]) {
      expect(homeClient).toContain(`{ id: "${id}"`);
    }
    expect(homeClient).toContain('SECONDARY_TAB_IDS: readonly Tab[] = ["spin", "ministries", "churches"]');
  });
});

describe("REGRESSION: goTab is still the only category-transition path, still pushState-based (unchanged by the switcher rework)", () => {
  it("goTab only ever touches tab/history/scroll — never playback state", () => {
    const fn = homeClient.slice(homeClient.indexOf("const goTab = "), homeClient.indexOf("const goTab = ") + 400);
    expect(fn).toContain("setTab(t)");
    expect(fn).toContain("window.history.pushState(");
    expect(fn).not.toMatch(/setCurrent\(|setStarted\(|setPlaying\(|setProgress\(|setMainQueue\(|setMoodQueue\(/);
  });

  it("MediaSwitcher itself never imports or calls goTab directly — it only ever receives it as the onSelect prop, so there is exactly one implementation of category transition in the whole app", () => {
    expect(mediaSwitcher).not.toContain("goTab");
    expect(mediaSwitcher).not.toContain("pushState");
    expect(mediaSwitcher).not.toContain("window.history");
  });
});

describe("REGRESSION: switching among the four modes never touches playback — same guarantees as before, reconfirmed against the new switcher", () => {
  it("exactly one mounted playback provider of each kind still exists — the switcher adds a new selector UI, not a new player", () => {
    expect(homeClient.match(/<DJPlayer[\s>]/g)?.length).toBe(1);
    expect(homeClient.match(/<SyncedAudio/g)?.length).toBe(1);
    expect(homeClient.match(/<iframe/g)?.length).toBe(1);
  });

  it("the persistent player's insertion point is still unconditional on `tab` — playback survives every one of the four transitions", () => {
    const idx = homeClient.indexOf("{started && activePlayerNode}");
    expect(idx).toBeGreaterThan(-1);
    const before = homeClient.slice(Math.max(0, idx - 60), idx);
    expect(before).not.toMatch(/tab === "/);
  });

  it("full-vs-mini natural-tab mapping is unchanged — a matching item still gets the full player only in its own mode, everything else collapses to mini", () => {
    expect(homeClient).toContain('? ["spin", "videos"]');
    expect(homeClient).toContain('? ["spin", "sermons"]');
    expect(homeClient).toContain('? ["spin", "podcasts"]');
    expect(homeClient).toContain('? ["spin", "music"]');
  });
});
