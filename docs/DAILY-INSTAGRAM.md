# Daily Encouragement → Instagram (TheDJCares)

This site runs the shared **Open Mirror Daily Social Engine** (canonical core:
`open-mirror/packages/daily-social-engine`; full Meta setup + operations
guide: `crossheartpray/docs/DAILY-INSTAGRAM.md` — everything there applies
here with this brand's env vars).

Brand specifics:

- **Content**: one item per day from DJ's curated Encouragement Library
  (`app/lib/djCaresLibrary.ts`) — only approved library items can ever be
  selected. The daily label matches the type: Sermon of the Day, Song for
  Today, Playlist for Today, Teaching for Today, Book for Today,
  Encouragement for Today.
- **Selection**: deterministic rotation — day N since 2026-07-12 picks item
  (N mod library size) from the stable-sorted eligible list, so nothing
  repeats until the whole library has had a day. Growing the library (one
  line in djCaresLibrary.ts) grows the rotation automatically.
- **Copyright**: nothing is downloaded or re-uploaded. The card is an
  original TheDJCares text design (title + attribution + DJ's summary); the
  page embeds/links the authorized source. YouTube ids are re-verified via
  oEmbed before every real publish.
- **Routes**: `/today` (permanent bio link), `/today/<date>` (stable dated
  archive — fully reproducible),
  `/api/social/daily-encouragement/<date>.png` (1080×1350 card),
  `/api/social/instagram/publish`, `/admin/social?key=…`.
- **Cron**: 14:00 UTC daily (vercel.json), publishes only when
  `INSTAGRAM_AUTOPUBLISH_ENABLED=true`.
- **GA events**: `djc_today_viewed`, `djc_source_opened`,
  `djc_card_downloaded`, `djc_shared`, `djc_library_opened`.
- **Tests**: `npm test` (library eligibility, full-cycle rotation without
  repeats, label mapping, caption parity).
