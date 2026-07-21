import { describe, expect, it } from "vitest";
import { activeItems, MINISTRIES, type MediaItem } from "../djCaresLibrary";
import {
  churchShareTarget,
  emailBody,
  emailHref,
  emailSubject,
  findShareMedia,
  findShareMinistry,
  mediaShareTarget,
  mediaTypeLabel,
  ministryShareTarget,
  PRODUCTION_ORIGIN,
  shareMessage,
  shareOrigin,
  shareUrl,
  smsHref,
} from "../shareLinks";

const fakeItem = (extra: Partial<MediaItem> = {}): MediaItem => ({
  id: "song-test",
  type: "music",
  title: "Test Song",
  author: "Test Artist",
  vibes: ["Joy"],
  url: "https://www.youtube.com/watch?v=xxxxxxxxxxx",
  videoId: "xxxxxxxxxxx",
  verified: "2026-07-18",
  ...extra,
});

describe("share URLs", () => {
  it("falls back to the production origin off-site (never localhost/previews)", () => {
    expect(shareOrigin()).toBe(PRODUCTION_ORIGIN);
    expect(shareUrl(mediaShareTarget(fakeItem()))).toBe("https://thedjcares.com/?play=song-test");
  });

  it("gives every active library item a deep link that resolves back to it", () => {
    for (const item of activeItems()) {
      const target = mediaShareTarget(item);
      const url = new URL(shareUrl(target));
      expect(url.origin).toBe(PRODUCTION_ORIGIN);
      expect(url.pathname).toBe("/");
      const id = url.searchParams.get("play");
      expect(id).toBe(item.id);
      expect(findShareMedia(id!)).toBe(item);
    }
  });

  it("does not resolve benched or unknown ids", () => {
    expect(findShareMedia("no-such-item")).toBeUndefined();
  });

  it("builds ministry and church deep links", () => {
    const m = MINISTRIES[0];
    expect(shareUrl(ministryShareTarget(m))).toBe(`https://thedjcares.com/?ministry=${m.key}`);
    expect(findShareMinistry(m.key)).toBe(m);
    const church = churchShareTarget({
      id: "church-test",
      name: "Test Church",
      city: "St. Louis",
      region: "MO",
      country: "USA",
      websiteUrl: "https://example.com",
      youtubeUrl: "https://youtube.com/@test",
      approved: true,
      verified: "2026-07-18",
    });
    expect(shareUrl(church)).toBe("https://thedjcares.com/?church=church-test");
  });
});

describe("type labels and messages", () => {
  it("labels every media type", () => {
    expect(mediaTypeLabel(fakeItem())).toBe("Song");
    expect(mediaTypeLabel(fakeItem({ musicVideo: true }))).toBe("Music Video");
    expect(mediaTypeLabel(fakeItem({ type: "sermon" }))).toBe("Sermon");
    expect(mediaTypeLabel(fakeItem({ type: "podcast" }))).toBe("Podcast");
    expect(mediaTypeLabel(fakeItem({ type: "playlist" }))).toBe("Playlist");
  });

  it("writes a short message with the title and the direct link", () => {
    const msg = shareMessage(mediaShareTarget(fakeItem()));
    expect(msg).toBe("Listen to “Test Song” on The DJ Cares:\nhttps://thedjcares.com/?play=song-test");
  });

  it("says what non-song items are", () => {
    const msg = shareMessage(mediaShareTarget(fakeItem({ type: "sermon", id: "sermon-x", title: "A Message" })));
    expect(msg).toContain("Watch “A Message” (sermon) on The DJ Cares:");
  });
});

describe("sms: and mailto: construction", () => {
  const tricky = mediaShareTarget(
    fakeItem({ id: "song-tricky", title: `Bob's "Great" Song & More? #1 100%` }),
  );

  it("builds a standards-compatible sms link with a fully encoded body", () => {
    const href = smsHref(tricky);
    expect(href.startsWith("sms:?&body=")).toBe(true);
    const body = href.slice("sms:?&body=".length);
    // Nothing that could break the URL survives unencoded.
    expect(body).not.toMatch(/[&?#'" ]/);
    expect(decodeURIComponent(body)).toBe(shareMessage(tricky));
    expect(decodeURIComponent(body)).toContain("https://thedjcares.com/?play=song-tricky");
  });

  it("builds a mailto link whose subject and body decode exactly", () => {
    const href = emailHref(tricky);
    expect(href.startsWith("mailto:?subject=")).toBe(true);
    const [subject, body] = href.slice("mailto:?subject=".length).split("&body=");
    expect(body).toBeTruthy();
    expect(subject).not.toMatch(/[&?#'" ]/);
    expect(body).not.toMatch(/[&?#'" ]/);
    expect(decodeURIComponent(subject)).toBe(emailSubject(tricky));
    expect(decodeURIComponent(body)).toBe(emailBody(tricky));
    expect(decodeURIComponent(body)).toContain(`Bob's "Great" Song & More? #1 100%`);
    expect(decodeURIComponent(body)).toContain("https://thedjcares.com/?play=song-tricky");
  });

  it("keeps the email body plain and short", () => {
    const body = emailBody(tricky);
    expect(body.startsWith("I thought you might like this:\n\n")).toBe(true);
    expect(body.split("\n").length).toBeLessThanOrEqual(5);
  });
});
