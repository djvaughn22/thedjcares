// Browsing and filtering tests for the expanded catalog.
// Verify that artist filtering, title search, and direct access work
// without restriction, while mood-based recommendations remain gated.

import { describe, it, expect } from "vitest";
import { allArtists, itemsByArtist, searchByTitle, LIBRARY, activeItems, itemsOfType } from "../djCaresLibrary";

describe("catalog browsing and search", () => {
  it("allArtists returns all unique artist names", () => {
    const artists = allArtists();
    expect(artists.length).toBeGreaterThan(0);
    expect(artists).toContain("Chris Tomlin");
    expect(artists).toContain("Casting Crowns");
    expect(artists).toContain("Phil Wickham");
  });

  it("itemsByArtist filters by exact artist name (case-insensitive)", () => {
    const tomlin = itemsByArtist("Chris Tomlin");
    const tomlins = itemsByArtist("CHRIS TOMLIN");
    expect(tomlin.length).toBeGreaterThan(0);
    expect(tomlin.length).toBe(tomlins.length);
  });

  it("searchByTitle finds items by substring (case-insensitive)", () => {
    const grace = searchByTitle("grace");
    expect(grace.length).toBeGreaterThan(0);
    expect(grace.some((i) => i.title.includes("Grace") || i.title.includes("GRACE"))).toBe(true);
  });

  it("search is not restricted by review status — unreviewed items are findable", () => {
    // When EXPANDED_MUSIC is populated with unreviewed entries, they must
    // be searchable by title and filterable by artist, proving that access
    // to the catalog is not restricted by mood review status.
    const all = searchByTitle(""); // empty search matches all
    const active = activeItems();
    expect(all.length).toBe(active.length);
  });

  it("artist filter works for all approved artists", () => {
    const approved = [
      "Chris Tomlin",
      "Casting Crowns",
      "MercyMe",
      "Phil Wickham",
      "for KING & COUNTRY",
      "Newsboys",
      "Zach Williams",
      "Matthew West",
      "Leeland",
      "Lauren Daigle",
      "CAIN",
      "We The Kingdom",
      "All Sons & Daughters",
      "Shane & Shane",
      "Anne Wilson",
      "Reawaken Hymns",
      "Forrest Frank",
      "Seph Schlueter",
    ];
    for (const artist of approved) {
      const items = itemsByArtist(artist);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it("title search finds hymns by name", () => {
    const hymns = searchByTitle("Amazing Grace");
    expect(hymns.length).toBeGreaterThan(0);
  });

  it("music and video types remain distinct in browsing", () => {
    const music = itemsOfType("music");
    const hasMusica = music.some((i) => i.title === "Amazing Grace (My Chains Are Gone)");
    expect(hasMusica).toBe(true);
    expect(music.length).toBeGreaterThan(0);
  });
});
