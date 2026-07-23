// Mood-eligibility review layer for Digital DJ recommendations.
//
// WHY THIS EXISTS (P0, Jul 22 2026): a visitor asked for Joy and was served
// "My Jesus" — a grief-born testimony song that carried a hand-typed "Joy"
// vibe. Catalog vibes describe genre and message; a mood request describes
// the DOMINANT LISTENING EXPERIENCE the visitor asked to feel. Those are not
// the same thing, so mood-specific recommendations no longer trust vibes
// alone.
//
// THE RULE
// - An item with a review entry here is EXCLUDED from every mood-specific
//   recommendation until the owner has reviewed it (ownerReviewed: true).
//   `eligibleMoods` before that point is only a screening proposal.
// - Once owner-reviewed, the item serves exactly `eligibleMoods` minus
//   `excludedMoods` — nothing else.
// - Items with no entry keep vibe-based behavior. Screening's job is to make
//   sure everything substantially centered on death, bereavement, tragedy,
//   severe illness, trauma, abuse, despair, or frightening testimony HAS an
//   entry.
// - Hope after grief is not Joy. Encouragement is not Joy. Faith is not Joy.
//   Gospel is not Joy. For Joy, qualifying media is predominantly
//   celebratory, uplifting, warmly happy, gratitude- or praise-centered.
// - Flagged items stay fully available everywhere else on the site (tabs,
//   deck, direct links, shared sessions, no-mood mixes). This layer only
//   governs what the DJ RECOMMENDS for a requested feeling.
//
// Owner workflow: review an entry, correct eligibleMoods, set
// ownerReviewed: true. One line per decision. See docs/DIGITAL-DJ-STATUS.md.

export type Mood =
  | "joy"
  | "peace"
  | "hope"
  | "encouragement"
  | "faith"
  | "family"
  | "morning"
  | "evening"
  | "comfort"
  | "grief";

export type SensitiveTheme =
  | "death"
  | "grief"
  | "illness"
  | "trauma"
  | "abuse"
  | "fear"
  | "addiction"
  | "war"
  | "violence";

export type EmotionalWeight = "light" | "moderate" | "heavy";

export type CatalogMoodReview = {
  eligibleMoods: Mood[]; // proposal until ownerReviewed; contract after
  excludedMoods?: Mood[];
  emotionalWeight?: EmotionalWeight;
  sensitiveThemes?: SensitiveTheme[];
  ownerReviewed: boolean;
  note?: string; // why it was flagged — for the owner's review pass
};

// ---------------------------------------------------------------------------
// Screened entries (ownerReviewed: false — every one of these is OUT of
// mood-specific recommendations until the owner signs off). Derived from the
// catalog's own titles/summaries and the songs' widely-known content.
// ---------------------------------------------------------------------------
export const MOOD_REVIEWS: Record<string, CatalogMoodReview> = {
  // --- music ---
  "song-my-jesus": {
    eligibleMoods: ["encouragement", "hope", "faith"],
    excludedMoods: ["joy"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["death", "grief"],
    ownerReviewed: false,
    note: "Anne Wilson's testimony born from her brother's death. The P0 item — was hand-tagged Joy.",
  },
  "song-scars-in-heaven": {
    eligibleMoods: ["comfort", "grief", "hope"],
    excludedMoods: ["joy", "family", "morning"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["death", "grief"],
    ownerReviewed: false,
    note: "Explicitly for the bereaved ('for anyone missing someone'). Was tagged Family.",
  },
  "song-i-can-only-imagine": {
    eligibleMoods: ["hope", "faith", "comfort"],
    excludedMoods: ["joy"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["death"],
    ownerReviewed: false,
    note: "Longing for heaven; a generation's funeral song. Worship vibe put it in the Joy pool.",
  },
  "song-praise-you-in-this-storm": {
    eligibleMoods: ["faith", "comfort", "encouragement"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["illness", "grief"],
    ownerReviewed: false,
    note: "Worship from inside suffering (written around a child's cancer). Was in the Peace pool.",
  },
  "song-even-if": {
    eligibleMoods: ["faith", "comfort", "encouragement"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["illness"],
    ownerReviewed: false,
    note: "Hope when the healing doesn't come — illness-centered. Was in the Peace pool.",
  },
  "song-there-was-jesus": {
    eligibleMoods: ["hope", "encouragement", "faith"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["grief"],
    ownerReviewed: false,
    note: "Looking back through the hardest roads — hardship testimony.",
  },
  "song-fear-is-a-liar": {
    eligibleMoods: ["encouragement", "faith"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["fear"],
    ownerReviewed: false,
    note: "Names and confronts fear throughout; empowering but fear-centered imagery. Was in the Peace pool.",
  },

  // --- sermons reachable through mood → vibe mapping ---
  "bg-P5LmDBoKyvs": {
    eligibleMoods: ["faith", "hope"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["trauma"],
    ownerReviewed: false,
    note: "'Couple's Home Explodes While They're Inside' — disaster testimony in the encouragement pool.",
  },
  "bg--aDAHvPfBIc": {
    eligibleMoods: ["hope", "faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["violence"],
    ownerReviewed: false,
    note: "'He Committed Murder at Age 16' — redemption story, but violent testimony.",
  },
  "bg-vlnMW2FiEjc": {
    eligibleMoods: ["faith", "hope"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["war", "trauma"],
    ownerReviewed: false,
    note: "'Combat Veteran Saved by Falling Bible' — war testimony.",
  },
  "bg-sBRylWJeHHE": {
    eligibleMoods: ["comfort", "encouragement"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["grief"],
    ownerReviewed: false,
    note: "'Loneliness' — ministers to loneliness; not a pick-me-up.",
  },
  "bg-GGQACnwkWmc": {
    eligibleMoods: ["hope", "faith"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["death"],
    ownerReviewed: false,
    note: "'Life After Death'.",
  },
  "bg-E_5PsxxD3PE": {
    eligibleMoods: ["faith"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["death"],
    ownerReviewed: false,
    note: "'Dead Men Tell No Tales'.",
  },
  "bg-KNgoD5Ekpjg": {
    eligibleMoods: ["faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["fear"],
    ownerReviewed: false,
    note: "'Is There A Hell?' — sobering, not encouraging in the mood sense.",
  },
  "cs-ptYKozbfQ50": {
    eligibleMoods: ["hope", "faith"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["death"],
    ownerReviewed: false,
    note: "'Right Thinking About Death and Resurrection'.",
  },
  "dj-SgtZPmxzgF4": {
    eligibleMoods: ["comfort", "grief"],
    excludedMoods: ["joy", "family", "morning", "evening"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["death", "grief"],
    ownerReviewed: false,
    note: "'If a Child Dies… Where Do They Go?' — child loss; comfort for the grieving only.",
  },
  "dj-vmhdV_GjvRw": {
    eligibleMoods: ["hope", "comfort"],
    emotionalWeight: "moderate",
    sensitiveThemes: ["death", "grief"],
    ownerReviewed: false,
    note: "'Where Are They Now?' — about departed loved ones.",
  },
  "ar-wUZnLwlKIzw": {
    eligibleMoods: ["comfort", "grief", "faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["grief"],
    ownerReviewed: false,
    note: "'How God Can Help Us Overcome Guilt and Grief'.",
  },
  "jd-IZkJF81oJ2g": {
    eligibleMoods: ["faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["war", "death"],
    ownerReviewed: false,
    note: "'Storming the Beach: Remembering the Sacrifice of D-Day, Part 2'.",
  },
  "jd-TJjArLCMlOs": {
    eligibleMoods: ["faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["war", "death"],
    ownerReviewed: false,
    note: "'Storming the Beach: Remembering the Sacrifice of D-Day, Part 1'.",
  },
  "aj-kIh2caUd5Gw": {
    eligibleMoods: ["faith"],
    emotionalWeight: "heavy",
    sensitiveThemes: ["violence"],
    ownerReviewed: false,
    note: "'Murder, She Wrote' — violence-centered title/content.",
  },

  // --- Placeholder for expanded artist catalog ---
  // All newly added recordings from approved artists default to ownerReviewed: false
  // and are excluded from mood recommendations. Add entries here as new records
  // are added to djCaresLibrary.ts. Use this pattern:
  //
  // "[unique-id]": {
  //   eligibleMoods: ["hope", "faith"],  // proposal; always list at least one
  //   excludedMoods: undefined,           // if known negative moods
  //   emotionalWeight: "moderate",
  //   sensitiveThemes: undefined,         // if any apply
  //   ownerReviewed: false,               // ALWAYS false until owner reviews
  //   note: "Title - context why added or concerns to review",
  // },
};

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

// Pure rule for a single review record. Exported for tests.
export function moodAllows(review: CatalogMoodReview | undefined, mood: Mood): boolean {
  if (!review) return true; // unreviewed-and-unflagged items keep vibe behavior
  if (!review.ownerReviewed) return false; // flagged: out until the owner decides
  if (review.excludedMoods?.includes(mood)) return false;
  return review.eligibleMoods.includes(mood);
}

// May this catalog item be RECOMMENDED for this mood right now?
export function moodEligible(itemId: string, mood: Mood): boolean {
  return moodAllows(MOOD_REVIEWS[itemId], mood);
}

// May this item appear in any curiosity-driven recommendation ("surprise me",
// swap replacements)? Flagged-but-unreviewed items may not.
export function recommendableAtAll(itemId: string): boolean {
  const review = MOOD_REVIEWS[itemId];
  return !review || review.ownerReviewed;
}
