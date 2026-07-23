# Digital DJ — Honest Status

Last verified: 2026-07-22, on `feature/digital-dj-preview`.

Each item is labeled with exactly how far it has been taken:
**implemented** (code exists) · **locally verified** (tested on a local
production build) · **future placeholder** (interface only — must not be
described as working).

## Working and locally verified

- **Deterministic DJ** — duration / media-type / need dials filter the
  approved catalog; sessions build to the requested length; music vs
  music-video vs sermon vs podcast stay distinct; "mix" (no type filter)
  draws from the whole playable library; empty combos show a recovery
  state. *(implemented, locally verified, 114 unit tests)*
- **Access modes** — `off` 404s the page, 403s the API, and removes the
  homepage card (verified against a real `off` build); `preview` opens the
  feature to everyone; `subscriber` blocks anonymous visitors server-side.
  All checks are server-side; client state is never authorization.
- **Kill switches** — `DIGITAL_DJ_ACCESS_MODE=off` and
  `DIGITAL_DJ_AI_ENABLED=false`, both applied at the next deploy.
- **AI intent parsing** — official `openai` SDK (v6.48.0, in
  package.json), Responses API, strict JSON-schema output, 8s timeout,
  1 retry, 250-token cap, 300-char input cap, default model
  `gpt-5.4-nano` (override: `OPENAI_MODEL`). The catalog is never sent;
  the model's output is whitelist-sanitized and can only ever set filter
  values — never URLs, ids, or media. Visitor text is parsed in memory
  and never stored or logged. *(LIVE-VERIFIED Jul 22 2026: with
  `OPENAI_API_KEY` configured in Vercel, real production requests parsed
  correctly — e.g. "ten minutes … encouragement" → 10 min +
  encouragement — and every result still resolves through the local
  catalog only)*
- **Rate limiting** — server-side, before any OpenAI request: 4/min burst
  + daily quota (`DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT`, default 5) keyed by a
  salted SHA-256 hash of the forwarded IP (raw IPs never stored).
- **Share links** — `?ids=` carries catalog ids only; tampered/unknown ids
  are ignored; lists are capped at 60 ids; every surviving item resolves
  to its stored catalog URL.
- **UI** — family palette, site header/footer, no horizontal overflow at
  320×568 / 375×812 / 812×375 / 1440×900, keyboard-focusable dials with
  `aria-pressed`, a live announcer, and no autoplay on page load (the
  player mounts only after a tap).

## Mood integrity (P0 fix, Jul 22 2026)

A Joy request served "My Jesus" — a grief-born testimony song carrying a
hand-typed Joy vibe. Root cause: catalog vibes describe genre/message, but a
mood request asks for a dominant listening experience, and the DJ trusted
vibes blindly. Fixed structurally:

- `app/lib/djMoodReview.ts` — an owner-review eligibility layer. Items
  substantially centered on death, bereavement, illness, trauma, fear, war,
  or violence carry a review entry and are **excluded from every
  mood-specific recommendation (including "surprise me" and swaps) until DJ
  sets `ownerReviewed: true`** with the moods he approves. 20 items are
  currently flagged (7 songs, 13 sermons) — that list is DJ's review
  worklist, one line per decision.
- Catalog corrections: "My Jesus" is Gospel/Hope (never Joy); "Scars in
  Heaven" is Hope only (never Family/Joy). Both stay fully available in
  tabs, deck, direct links, shared sessions, and no-mood mixes.
- Rule of record: hope-after-grief ≠ joy; encouragement ≠ joy; faith ≠ joy;
  Gospel ≠ joy. Joy media is predominantly celebratory, uplifting, warmly
  happy, gratitude- or praise-centered.
- Locked by 16 tests in `app/lib/__tests__/djMoodReview.test.ts`, including
  a data-hygiene rule: nothing death/grief-flagged may ever claim joy
  without explicit owner approval.

## Preview-grade (fine for free preview, NOT production-grade)

- **Rate-limit store** — process memory. Vercel serverless instances do
  not share it, so quotas are best-effort across instances. Before any
  PAID launch this must move to a durable store (database or a rate-limit
  service). The interface (`checkRateLimit`) is where a durable adapter
  would plug in.

## Future placeholders (interfaces only — nothing works yet)

- **Subscriber entitlement** — `subscriber` mode currently denies every
  non-owner because there is no persistence, no accounts, and no billing.
  The `Entitlement` type and `canAccessFeature` seam exist so a shared
  Open Mirror identity/entitlement service (`OPEN_MIRROR_ENTITLEMENT_URL`
  is reserved, never called) can plug in later without touching Digital
  DJ. **Do not enable `subscriber` mode expecting anyone to get in.**
- **Owner override** — `canAccessFeature` honors `viewer.isOwner`, but no
  authentication exists to set it, so today it is unreachable code kept
  for the future identity layer.
- **Plan metadata** — `open_mirror_apps_monthly` ($2.99) exists as
  inactive internal data only. No Stripe, no checkout, no public price
  display, and none may be added without a separate decision.

## Before paid access can ever be enabled

1. Real authentication (shared Open Mirror identity or local accounts).
2. Persistent entitlements (database) read by `canAccessFeature`.
3. Durable rate limiting.
4. A billing provider — deliberately absent today.

## Environment variables

```
DIGITAL_DJ_ACCESS_MODE=preview        # off | preview | subscriber (default preview)
DIGITAL_DJ_AI_ENABLED=true            # default true; false = deterministic only
OPENAI_API_KEY=                       # server-only; absent = AI quietly off
OPENAI_MODEL=gpt-5.4-nano             # default shown
DIGITAL_DJ_DAILY_ANONYMOUS_LIMIT=5    # default shown
DIGITAL_DJ_DAILY_ACCOUNT_LIMIT=20     # reserved for the future account tier
```

Rollback: see `DIGITAL_DJ_ROLLBACK.md`.
