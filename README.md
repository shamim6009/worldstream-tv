# WorldStream TV

A fast, open-source directory of **authorized free live TV**: news, sports, entertainment, kids, music and a dedicated **Bangladesh TV** section. It plays streams directly from broadcasters with a built-in HLS player, and runs as a static site, with no paid API or backend.

- **Worldwide directory:** filter by country, language, category and checked availability. Country and category pages are prerendered for SEO.
- **Live sports:** 14 sport categories, verified event listings shown in the visitor's timezone with countdowns, and links to official free sports services.
- **Bangladesh TV:** Bangla/English interface, instant channel switching, and private import of ISP/BDIX M3U playlists.
- **Player:** hls.js with native-HLS fallback, quality selection, PiP, fullscreen, cast (Remote Playback / AirPlay), keyboard shortcuts, safe retry with backoff, and automatic fallback to the next approved source.
- **Honest status:** a scheduled checker validates HLS manifests and CORS. Unchecked streams show "Not yet checked", never "LIVE".
- **TV guide:** XMLTV from allowlisted feeds only. If a channel has no data, it shows "Schedule unavailable".
- **No account needed:** favorites, history, preferences, light/dark theme, and JSON import/export, all stored in the browser.

> WorldStream TV never hosts, proxies or re-streams video. It does not bypass DRM, paywalls, CORS or geo-restrictions. Community playlists are imported as **review candidates only**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 (generates the catalog first)
```

Requires Node.js 20+. The app loads a usable catalog (`data/approved-channels.json`) with no configuration or API keys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Generate catalog and start Vite dev server |
| `npm run build` | Validate & generate catalog → type check → Vite build → prerender routes |
| `npm run preview` | Serve `dist/` on port 4173 |
| `npm run lint` / `npm run typecheck` | ESLint (0 warnings) / strict TypeScript |
| `npm test` | Vitest unit tests (app + ingestion scripts) |
| `npm run test:e2e` | Playwright tests against `dist/` (run `npm run build` first, or use `test:e2e:full`) |
| `npm run sync:catalog` | Download allowlisted playlists → `data/candidates.json` (never published) |
| `npm run validate:streams` | Check approved sources → `data/stream-status.json` (`--concurrency=4`, `--only=<id>`, `--dry-run`) |
| `npm run sync:epg` | Fetch allowlisted XMLTV feeds → `data/epg.json` |
| `npm run generate:catalog` | Build `public/data/catalog.json`, `sitemap.xml`, `robots.txt` |
| `npm run check` | lint + typecheck + test + build |

For the real-playback e2e test, use a browser with H.264: `PW_CHANNEL=chrome npm run test:e2e` (or `msedge`). Without one, that test is skipped and the reason is printed.

## Project layout

```text
.github/workflows/   ci.yml · sync-streams.yml (scheduled checks) · deploy.yml (GitHub Pages)
data/                approved-channels.json (published) · candidates.json · sources.json (allowlist + blocklist)
                     categories.json · countries.json · stream-status.json · epg.json · sports-events.json
scripts/             sync-playlists · validate-streams · sync-epg · generate-catalog · prerender
scripts/lib/         m3u parser · normalize/dedupe · SSRF guard · HTTP probe · XMLTV · validation
src/components/      layout, cards, directory, player/ (HlsPlayer, ChannelPlayer, YouTube, Provider)
src/pages/           Home, Live TV, Country, Category, Channel, Sports, Bangladesh, Guide, Search, Favorites, …
src/stores/ hooks/   Zustand stores persisted to localStorage
tests/               unit/ · scripts/ · e2e/ · fixtures/hls/
docs/                ARCHITECTURE.md · ADMIN.md · DEPLOYMENT.md
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md): data flow, stream statuses, player fallback, security model
- [Admin workflow](docs/ADMIN.md): approving, removing and checking channels through pull requests
- [Deployment](docs/DEPLOYMENT.md): Cloudflare Pages, Vercel, Netlify and GitHub Pages

## Adding a channel

Add an entry to `data/approved-channels.json` only if the rights holder publishes the stream for free. Document `authorization`, `authorizationNote` and `officialWatchUrl`. The build rejects entries that use non-HTTPS URLs, have no documented authorization, use unknown categories, or point at blocklisted hosts. See [docs/ADMIN.md](docs/ADMIN.md).

## Copyright & removal

Rights holders can open a removal request from any channel page or the [legal page](src/pages/LegalPage.tsx). A listing is removed by deleting it from `approved-channels.json` and blocklisting its URL.

## License

MIT for the source code. Channel names, logos, streams and guide data belong to their owners.
