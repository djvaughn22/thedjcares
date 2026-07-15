# thedjcares

Hand-picked Christian music, sermons, podcasts, and encouragement — Gospel first, no algorithm.

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
- **Routes:** `/` (Encouragement Library), `/today`, `/today/[date]`, `/admin/social`
- **Family chrome:** `OpenMirrorNav.tsx` / `OpenMirrorFooter.tsx` / `OpenMirrorTheme.tsx` are synced copies — canonical source is the hub repo `packages/openmirror-ui/` + `scripts/sync-ui.sh`. Never edit the local copies.
- **Theme:** family ☀️/🌙 toggle; `om-theme` localStorage key; light mode remaps family hexes (see hub `docs/OPEN_MIRROR_PATTERNS.md`).
- **Env vars (names only):** `SITE_BASE_URL`, `SOCIAL_ADMIN_KEY`, `SOCIAL_HASHTAGS`, `CRON_SECRET`
- **External services:** YouTube embeds (verify video ids via oEmbed before shipping), Apple Music/Spotify playlist links
- **Protected:** Gospel-first, warm, curated, Christian (St. Louis). Content lives in `app/lib/djCaresLibrary.ts` — one-line adds only, DJ controls all content.
- **Make changes in:** `app/lib/djCaresLibrary.ts` (playlists/videos), `app/lib/faithYouTube.ts`.
