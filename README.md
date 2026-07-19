# thedjcares

A digital DJ for Christian media. Choose a category, press play, and let The DJ Cares spin something good — hand-picked music, music videos, podcasts, and sermons. Gospel first, no algorithm.

**Live:** https://thedjcares.com
**Part of:** [Open Mirror LLC](https://openmirrorllc.com)

## Local dev
```bash
npm install
npm run dev
```

## Deploy
Push to `main` — Vercel auto-deploys production.

## Repo map

- **Production:** https://thedjcares.com — branch `main`, auto-deploys on push (Vercel).
- **Framework:** Next.js 15.3.3 (App Router). Build: `npm run build`. Tests: `npm test`.
- **Routes:** `/` (the Now Spinning DJ experience — Spin / Music / Videos / Podcasts / Sermons / Ministries / Churches / About tabs, linkable via `#music` etc.), `/today`, `/today/[date]`, `/admin/social`
- **Family chrome:** `OpenMirrorNav.tsx` / `OpenMirrorFooter.tsx` / `OpenMirrorTheme.tsx` are synced copies — canonical source is the hub repo `packages/openmirror-ui/` + `scripts/sync-ui.sh`. Never edit the local copies.
- **Theme:** family ☀️/🌙 toggle; `om-theme` localStorage key; light mode remaps family hexes (see hub `docs/OPEN_MIRROR_PATTERNS.md`).
- **Env vars (names only):** `SITE_BASE_URL`, `SOCIAL_ADMIN_KEY`, `SOCIAL_HASHTAGS`, `CRON_SECRET`
- **External services:** YouTube IFrame Player + youtube-nocookie embeds (verify every video id via oEmbed AND confirm the official channel before shipping), Apple Music / Spotify embeds
- **Protected:** Gospel-first, warm, curated, Christian (St. Louis). The whole approved library — music, playlists, podcasts, sermons, ministries, approved churches — lives in `app/lib/djCaresLibrary.ts`. One-line adds; `active: false` benches an item; DJ controls all content.
- **Shuffle:** `app/lib/spin.ts` — controlled randomness (approved library only, no immediate repeats, localStorage recent-history). Never wire YouTube recommendations into it.
- **Church submissions:** reviewed by hand; the public form prepares an email to ask@openmirrorllc.com (no backend, no auto-publish). Approved churches are added manually to `APPROVED_CHURCHES`.
