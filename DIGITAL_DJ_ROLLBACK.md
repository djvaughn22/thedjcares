# Digital DJ — Rollback Guide

This document describes how to disable, revert, or troubleshoot the Digital DJ feature.

## Quick Reference

- **Baseline tag**: `before-digital-dj-preview-20260722-1700`
- **Feature branch**: `feature/digital-dj-preview`
- **Main commits added**: 5 (see below)

## Disabling Digital DJ

### Option 1: Kill the Feature Flag (Fastest)

Set this environment variable in Vercel:

```
DIGITAL_DJ_ACCESS_MODE=off
```

This:
- ✅ Hides the `/digital-dj` route (returns 404)
- ✅ Hides the homepage feature card
- ✅ Blocks all API calls
- ✅ Is **instantly reversible** — change the env var back to `preview`
- ❌ Does NOT delete code (kept for fast restore)

### Option 2: Disable AI Only

If deterministic selection works but AI is problematic:

```
DIGITAL_DJ_AI_ENABLED=false
```

This:
- ✅ Disables OpenAI calls entirely
- ✅ Keeps deterministic selection working
- ✅ No code changes needed
- ✅ Feature still accessible in "deterministic mode"

## Reverting All Code

### Full Rollback (Removes All Code)

```bash
cd /home/dj/TheDJCares/thedjcares

# Reset to the baseline commit
git reset --hard before-digital-dj-preview-20260722-1700

# Verify
git log --oneline -1  # Should show: cebbe85 Share everything...
git status            # Should show: nothing to commit, working tree clean
```

### Or: Revert via Commits

If the feature is already on main and you want to revert specific commits:

```bash
# Get the list of commits to revert
git log --oneline main | head -10

# Revert each Digital DJ commit (from newest to oldest)
# Example (adjust SHAs as needed):
git revert [COMMIT_SHA_1]
git revert [COMMIT_SHA_2]
# ... etc

git push origin main
```

## What Gets Removed

**Files added** (safe to delete or keep):
- `app/lib/featureAccess.ts` — feature flag + access control
- `app/lib/digitalDjSelector.ts` — deterministic media selector
- `app/lib/digitalDjAiParser.ts` — optional AI intent parser
- `app/lib/__tests__/featureAccess.test.ts` — access control tests
- `app/lib/__tests__/digitalDjSelector.test.ts` — selector tests
- `app/digital-dj/page.tsx` — page wrapper
- `app/digital-dj/DigitalDjClient.tsx` — UI component
- `app/api/digital-dj/parse-intent/route.ts` — API endpoint
- `DIGITAL_DJ_ROLLBACK.md` — this file

**Files modified** (easy to revert):
- `app/HomeClient.tsx` — added Digital DJ feature card (lines ~628-664)

**No database migrations** — feature is purely stateless/frontend.

## Testing the Rollback

After reverting, confirm:

```bash
# 1. Build succeeds
npm run build

# 2. Tests pass (including removed test files won't run)
npm test

# 3. Routes are gone
# These should all 404:
#   GET /digital-dj
#   POST /api/digital-dj/parse-intent

# 4. Homepage loads without Digital DJ card
# Open https://thedj.cares and verify the "Digital DJ" section is gone
```

## Accessing Shared Sessions

Shared Digital DJ sessions use the format:
```
https://thedj.cares/digital-dj?ids=song-way-maker,apple-faith-playlist,sermon-bg-christ-is-our-hope
```

**After rollback**:
- These links will 404.
- Users with shared links have no fallback.

To preserve shared links, **do not fully revert**; instead just set `DIGITAL_DJ_ACCESS_MODE=off`.

## Logs & Monitoring

### Check Feature Access in Production

In Vercel Analytics or CloudWatch:

```
DIGITAL_DJ_ACCESS_MODE = 'preview'  ✅ Feature enabled
DIGITAL_DJ_ACCESS_MODE = 'off'      ✅ Feature disabled
DIGITAL_DJ_AI_ENABLED = 'false'     ✅ Deterministic only
```

### AI Usage Events

If logging is enabled, search logs for:
- `digital_dj_selection_generated` — deterministic selection
- `digital_dj_ai_parsing_success` — successful AI parsing
- `digital_dj_ai_parsing_failed` — AI parsing failed (graceful fallback)

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Feature not available" 403 | `DIGITAL_DJ_ACCESS_MODE=off` | Change to `preview` |
| `/digital-dj` returns 404 | Feature disabled | Set `DIGITAL_DJ_ACCESS_MODE=preview` |
| AI parsing always fails | No `OPENAI_API_KEY` | Add or enable the env var |
| Slow homepage loads | Feature card rendering | Turn on `DIGITAL_DJ_ACCESS_MODE=off` |

## The Feature at a Glance

### Architecture

```
DigitalDjClient (React, /digital-dj)
    ├─ UI for duration, media type, needs selection
    ├─ digitalDjSelector.ts (deterministic, zero-token)
    │  └─ selectMediaForDj() → filters catalog
    ├─ Optional: "Tell the DJ" text field
    │  └─ parseUserIntentWithAi() (server-only, guarded)
    └─ ShareMenu (existing)
       └─ Share links (session as IDs)

canAccessFeature() (everywhere)
    └─ Checks: feature flag + access mode + viewer

API: /api/digital-dj/parse-intent
    └─ POST: { userText } → { intent }
    └─ Guards: access check, size limit, AI enabled check
```

### No User Data Stored

- No registration required.
- No accounts created.
- No payment processing.
- User text is **never stored** (only parsed in-memory and discarded).
- Session sharing uses only **media IDs** (not user text).

## Deploying After Rollback

After rollback, Vercel will:
1. See fewer files
2. Run full rebuild
3. Tests will pass (removed test files skipped)
4. Build succeeds (no new dependencies)

**Deploy command** (no changes needed):
```bash
git push origin main
```

Vercel auto-deploys on main commits.

## Questions?

- **Baseline**: `git show before-digital-dj-preview-20260722-1700`
- **Last commit before Digital DJ**: `cebbe85` (Share everything…)
- **Changes**: `git diff before-digital-dj-preview-20260722-1700..HEAD`

## Success Criteria for Rollback

✅ Feature is disabled or code is fully reverted  
✅ Homepage loads and renders without Digital DJ  
✅ No broken links in existing sections  
✅ Tests pass  
✅ Build succeeds  
✅ No user data loss (feature was stateless)  
