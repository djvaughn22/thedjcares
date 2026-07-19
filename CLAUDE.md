# TheDJCares (thedjcares.com)
Christian community outreach (St. Louis first). **Stays Christian — never secularize.** Accent: **#A78BFA**.
- The whole approved library (music/playlists/podcasts/sermons/ministries/churches) lives in `app/lib/djCaresLibrary.ts` — one-line adds, `active: false` benches. DJ approves all content.
- Verify every YouTube ID via oEmbed AND confirm the official channel before shipping (dead-ID + re-upload lessons).
- The Now Spinning shuffle (`app/lib/spin.ts`) selects only from the approved library — never wire in YouTube recommendations.
- Apple Music playlist embeds are lazy ("Show player") so the first load stays fast.

## Open Mirror family rules
- One of 11 Open Mirror LLC sites (hub: openmirrorllc.com, repo djvaughn22/open-mirror). Baseline tag: `mvp-1`.
- **Design:** flat + cool. bg `#0b1220`, surface `#141d2e`, border `#26324c`, text `#e8edf5`, muted `#94a3b8`. No glass, no gradients, **no red**.
- **Shared chrome is SYNCED, not owned here:** `OpenMirrorNav.tsx`, `OpenMirrorFooter.tsx`, `OpenMirrorTheme.tsx` in the app folder are copies from the hub repo `packages/openmirror-ui/`. NEVER edit them here — edit in the hub, run its `scripts/sync-ui.sh`, then rebuild/commit each satellite.
- Nav + footer mount in `layout.tsx`. Footer = OPEN MIRROR LLC · ABOUT · ✝️ ❤️ 🙏 (the icons ARE the CrossHeartPray link — no word).
- ☀️/🌙 family toggle (`om-theme`) lives in the bar; pages that compute JS colors follow the `om-theme` window event.
- **Copy style:** DJ's words. Short, plain, human. Never wordy or AI-sounding.
- **Deploys:** push to `main` = production deploy (Vercel). Batch related edits into one commit.
