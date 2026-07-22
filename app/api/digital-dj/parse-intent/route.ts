// The one AI endpoint for Digital DJ. Every guard runs server-side and in
// order — a request that fails any of them never reaches OpenAI:
//   1. Feature access (DIGITAL_DJ_ACCESS_MODE)
//   2. AI switch (DIGITAL_DJ_AI_ENABLED)
//   3. API key present
//   4. Rate limit + daily quota (salted-hash visitor key, no raw IPs stored)
//   5. Input validation (type + 300-char cap)
// The client treats every non-OK response the same way: fall back to the
// deterministic selector. The visitor's text is parsed in memory and never
// stored or logged.

import { NextRequest, NextResponse } from "next/server";
import { canAccessFeature, isAiEnabled } from "../../../lib/featureAccess";
import { anonymousKey, checkRateLimit } from "../../../lib/digitalDjRateLimit";
import { MAX_INPUT_CHARS, parseUserIntentWithAi, validateInput } from "../../../lib/digitalDjAiParser";

export async function POST(request: NextRequest) {
  const access = await canAccessFeature({ featureKey: "digital_dj" });
  if (!access.allowed) {
    return NextResponse.json({ error: "Feature not available", intent: null }, { status: 403 });
  }

  if (!isAiEnabled("digital_dj") || !process.env.OPENAI_API_KEY) {
    // AI off (or unconfigured) is a normal state, not an error — the
    // deterministic DJ is the product either way.
    return NextResponse.json({ intent: null, aiEnabled: false }, { status: 200 });
  }

  const key = anonymousKey(request.headers.get("x-forwarded-for"));
  const rate = checkRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit reached", intent: null }, { status: 429 });
  }

  let userText: unknown;
  try {
    ({ userText } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", intent: null }, { status: 400 });
  }

  if (!validateInput(userText)) {
    return NextResponse.json(
      { error: `userText must be 1–${MAX_INPUT_CHARS} characters`, intent: null },
      { status: 400 },
    );
  }

  const intent = await parseUserIntentWithAi(userText);
  // intent === null means the parser fell back — still a 200; the client
  // proceeds deterministically.
  return NextResponse.json({ intent });
}
