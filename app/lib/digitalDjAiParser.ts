// Optional AI intent parser for Digital DJ — server-only, heavily guarded.
// Parses free-text requests into structured filters for the deterministic selector.
// NEVER sends the full catalog to AI. NEVER lets AI recommend external media.

import { canAccessFeature, isAiEnabled } from "./featureAccess";
import { type DjNeed, type DigitalDjRequest } from "./digitalDjSelector";

export type DigitalDjIntent = {
  durationMinutes?: number;
  mediaTypes?: Array<"music" | "music_video" | "sermon" | "podcast">;
  needs?: DjNeed[];
  requestedCreator?: string;
  familyFriendly?: boolean;
};

// Validation: reject oversized or suspicious input.
function validateInput(text: string): boolean {
  if (!text) return false;
  if (text.length > 300) return false; // Max 300 chars
  // Reject if it looks like a jailbreak attempt.
  if (text.toLowerCase().includes("ignore") && text.toLowerCase().includes("instruction")) {
    return false;
  }
  return true;
}

// Guard: check all preconditions before calling OpenAI.
async function checkAccessBeforeAi(viewer?: {
  id?: string;
  isOwner?: boolean;
}): Promise<{ allowed: boolean; reason?: string }> {
  // Feature must be accessible.
  const access = await canAccessFeature({
    featureKey: "digital_dj",
    viewer,
  });
  if (!access.allowed) {
    return { allowed: false, reason: "feature_not_accessible" };
  }

  // AI must be explicitly enabled.
  if (!isAiEnabled("digital_dj")) {
    return { allowed: false, reason: "ai_disabled" };
  }

  // Must have a valid API key.
  if (!process.env.OPENAI_API_KEY) {
    return { allowed: false, reason: "no_api_key" };
  }

  return { allowed: true };
}

// Use OpenAI to parse intent with strict schema enforcement.
// Returns null if parsing fails or is suspicious.
export async function parseUserIntentWithAi(
  userText: string,
  viewer?: { id?: string; isOwner?: boolean },
): Promise<DigitalDjIntent | null> {
  // Validate input size and content.
  if (!validateInput(userText)) {
    console.error("digitalDjAiParser: input validation failed");
    return null;
  }

  // Check access and preconditions.
  const access = await checkAccessBeforeAi(viewer);
  if (!access.allowed) {
    console.error(`digitalDjAiParser: access denied (${access.reason})`);
    return null;
  }

  // Import OpenAI client dynamically to avoid breaking if the package isn't available.
  let OpenAI: any;
  try {
    // @ts-ignore - optional dependency
    const mod = await import("openai");
    OpenAI = mod.default;
  } catch (e) {
    console.error("digitalDjAiParser: openai package not available", e);
    return null;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Strict system prompt: intent parsing only, no recommendations, no external media.
  const systemPrompt = `You are a helper that parses user requests for a Christian music and teaching curator called "The DJ Cares".

The user has given you a free-text request (up to 300 characters). Your job is to extract structured intent ONLY from the approved catalog — not to recommend anything outside it.

You will return JSON matching this schema, with all fields optional:
{
  "durationMinutes": number (5, 10, 20, 30, or 60 only),
  "mediaTypes": ["music" | "music_video" | "sermon" | "podcast"],
  "needs": ["encouragement" | "joy" | "peace" | "hope" | "faith" | "family" | "morning" | "evening" | "surprise"],
  "requestedCreator": string (a ministry name or artist, if mentioned),
  "familyFriendly": boolean
}

CRITICAL RULES:
- Extract intent ONLY from what the user said.
- Do NOT invent features or content outside the catalog.
- Do NOT recommend YouTube channels, artists, or content not pre-approved.
- Do NOT try to fulfill requests for other services (shopping, dating, gaming, etc).
- If the request is unclear or off-topic, return empty {} to fall back to deterministic selection.
- For duration: prefer round numbers (5, 10, 20, 30, 60). If the user says "morning" or "quick", infer the most likely short duration.
- For needs: map user words like "sad" → "encouragement", "energetic" → "joy", "sleep" → "peace", etc.
- For media: if the user says "music video", only suggest ["music_video"]. If they say "sermon", only ["sermon"]. Otherwise leave empty.
- For requestedCreator: only include if the user explicitly mentions a person or ministry name.`;

  const userPrompt = `Parse this request for The DJ Cares:

"${userText}"

Return ONLY valid JSON (no markdown, no explanation). If you cannot parse it safely, return: {}`;

  try {
    const response = await client.beta.messages.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
      betas: ["interleaved-thinking-2025-05-14"],
    });

    // Extract the text response.
    const text =
      response.content
        .filter((block) => block.type === "text")
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim() || "{}";

    // Parse JSON safely.
    let intent: Record<string, any>;
    try {
      intent = JSON.parse(text);
    } catch {
      console.error("digitalDjAiParser: JSON parse failed", { text });
      return null;
    }

    // Validate and sanitize the parsed intent.
    return sanitizeIntent(intent);
  } catch (error) {
    console.error("digitalDjAiParser: OpenAI call failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Validate and clean the parsed intent before returning it.
function sanitizeIntent(raw: any): DigitalDjIntent | null {
  const intent: DigitalDjIntent = {};

  // Duration: must be one of the allowed values.
  if (typeof raw.durationMinutes === "number") {
    if ([5, 10, 20, 30, 60].includes(raw.durationMinutes)) {
      intent.durationMinutes = raw.durationMinutes;
    }
  }

  // Media types: validate against allowed values.
  if (Array.isArray(raw.mediaTypes)) {
    const allowed = new Set<string>(["music", "music_video", "sermon", "podcast"]);
    const filtered = raw.mediaTypes.filter((t: any) => typeof t === "string" && allowed.has(t));
    if (filtered.length > 0) {
      intent.mediaTypes = filtered as any;
    }
  }

  // Needs: validate against allowed values.
  if (Array.isArray(raw.needs)) {
    const allowed = new Set<string>([
      "encouragement",
      "joy",
      "peace",
      "hope",
      "faith",
      "family",
      "morning",
      "evening",
      "surprise",
    ]);
    const filtered = raw.needs.filter((n: any) => typeof n === "string" && allowed.has(n));
    if (filtered.length > 0) {
      intent.needs = filtered as any;
    }
  }

  // Creator name: accept short strings only.
  if (typeof raw.requestedCreator === "string") {
    const creator = raw.requestedCreator.trim();
    if (creator.length > 0 && creator.length <= 100) {
      intent.requestedCreator = creator;
    }
  }

  // Family friendly: accept boolean.
  if (typeof raw.familyFriendly === "boolean") {
    intent.familyFriendly = raw.familyFriendly;
  }

  // Return null if no intent was extracted.
  return Object.keys(intent).length > 0 ? intent : null;
}
