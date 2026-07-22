# Digital DJ — Rollback Guide

How to disable, revert, or troubleshoot the Digital DJ feature. Every claim
in this file has been verified against the actual build.

## Quick Reference

- **Baseline tag**: `before-digital-dj-preview-20260722-1700` (= commit `cebbe85`)
- **Feature branch**: `feature/digital-dj-preview`

## Disabling Digital DJ

### Option 1: Kill switch (no code changes)

In Vercel → Project Settings → Environment Variables, set:

```
DIGITAL_DJ_ACCESS_MODE=off
```

then **redeploy** (env changes on Vercel only take effect on the next
deployment — use "Redeploy" on the latest deployment, or push any commit).

Verified effect of an `off` build:
- `/digital-dj` returns **404**
- `POST /api/digital-dj/parse-intent` returns **403**
- The homepage Digital DJ card is not rendered
- No OpenAI call can occur
- Everything else on the site is untouched

To restore: set the variable back to `preview` and redeploy.

### Option 2: Disable AI only

```
DIGITAL_DJ_AI_ENABLED=false
```

(again: redeploy to apply). The deterministic DJ keeps working; the
"tell the DJ" field disappears; the API answers `{ intent: null,
aiEnabled: false }` without ever contacting OpenAI. Removing / not setting
`OPENAI_API_KEY` has the same effect.

## Reverting all code

```bash
cd /home/dj/TheDJCares/thedjcares
git reset --hard before-digital-dj-preview-20260722-1700
git push --force-with-lease origin main   # only if the feature already merged
```

Or revert the feature commits individually with `git revert` (newest first)
if you prefer a forward-moving history.

## What a full revert removes

**Files added by the feature:**
- `app/lib/featureAccess.ts` — access modes + `canAccessFeature`
- `app/lib/digitalDjSelector.ts` — deterministic selector
- `app/lib/digitalDjSession.ts` — artwork, swap, reorder, duration helpers
- `app/lib/digitalDjAiParser.ts` — OpenAI Responses API intent parser
- `app/lib/digitalDjRateLimit.ts` — burst + daily-quota limiter
- `app/api/digital-dj/parse-intent/route.ts` — the one AI endpoint
- `app/digital-dj/page.tsx` + `app/digital-dj/DigitalDjClient.tsx`
- `app/lib/__tests__/featureAccess.test.ts`
- `app/lib/__tests__/digitalDjSelector.test.ts`
- `app/lib/__tests__/digitalDjSession.test.ts`
- `app/lib/__tests__/digitalDjGuards.test.ts`
- `DIGITAL_DJ_ROLLBACK.md`, `docs/DIGITAL-DJ-STATUS.md`

To undo only the Jul-22 visual polish (keep the feature), reset to tag
`before-digital-dj-visual-polish-20260722-1745` instead.

**Files modified by the feature (revert restores them):**
- `app/page.tsx` — passes `digitalDjEnabled` to the home client
- `app/HomeClient.tsx` — the homepage feature card
- `.env.example` — the `DIGITAL_DJ_*` / `OPENAI_*` block
- `package.json` / `package-lock.json` — the `openai` dependency

**No database or migration exists** — the feature is stateless; nothing to
clean up.

## After rollback, confirm

```bash
npm run build   # succeeds
npm test        # remaining suites pass
```

and that the homepage renders without the Digital DJ card.

## Shared session links

Shared links look like `/digital-dj?ids=song-way-maker,song-living-hope`.
They contain only catalog ids — never visitor text. Unknown or tampered ids
are ignored; a link whose ids all fail simply shows the normal picker.
After a full revert (or in `off` mode) these links 404 — if you want old
links to keep working, prefer the kill switch over deleting the code.

## Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `/digital-dj` 404s | `DIGITAL_DJ_ACCESS_MODE=off` at build time | Set `preview`, redeploy |
| "Tell the DJ" field missing | AI disabled or `OPENAI_API_KEY` unset | Set the key (server-side env only), redeploy |
| API returns 429 | Burst (4/min) or daily quota reached | Expected; limits reset within a minute / at UTC midnight |
| API returns 403 | Mode is `off` or `subscriber` | Set `preview`, redeploy |
