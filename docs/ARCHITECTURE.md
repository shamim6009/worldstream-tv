# Architecture

## Overview

WorldStream TV is a static React app backed by JSON files that a build pipeline generates. Browsers never download playlists. They load one cached `catalog.json` file (about 100 KB for 80 channels), and the player connects directly to the broadcaster.

```text
 allowlisted playlists ──► sync-playlists ──► data/candidates.json   (publish:false, review only)
   (IPTV-org, Free-TV)                              │  human review + PR
                                                    ▼
                                      data/approved-channels.json ──┐
 approved sources ──► validate-streams ──► data/stream-status.json ─┤
 allowlisted XMLTV ──► sync-epg ─────────► data/epg.json ───────────┤
                                                                    ▼
                                generate-catalog (validates, merges, dedupes)
                                                                    ▼
                    public/data/catalog.json · sitemap.xml · robots.txt
                                                                    ▼
                         vite build ──► prerender (≈125 routes + 404.html) ──► CDN
```

## Ingestion (`scripts/`)

| Step | File | Notes |
| --- | --- | --- |
| Fetch | `lib/http.ts` | HTTPS GET with timeout, byte cap, manual redirects (max 5). **Every hop is checked by the SSRF guard.** |
| SSRF guard | `lib/ssrf.ts` | Blocks non-HTTP(S) URLs, URLs with credentials, localhost, `.local`/`.internal`, cloud metadata hosts, and any hostname whose DNS resolves to a private, loopback, link-local, CGNAT or reserved IPv4/IPv6 address. |
| Parse | `lib/m3u.ts` | Extended M3U: BOM/CRLF tolerant, `tvg-*`, `group-title`, `#EXTGRP`, `#EXTVLCOPT`. |
| Normalize | `lib/normalize.ts` | Strips quality/region suffixes, canonical key = `tvg-id` or name+country, merges backup URLs, dedupes URLs. |
| Validate | `lib/validate-approved.ts` | Schema rules for approved entries plus the blocklist in `data/sources.json`. The build fails on any error. |
| Status | `validate-streams.ts`, `lib/status.ts` | Concurrency-limited, retries with exponential backoff, reads at most ~256 KB of the manifest (never video segments). |
| EPG | `sync-epg.ts`, `lib/xmltv.ts` | Only feeds listed in `sources.json → epg` with `enabled: true`. Only approved channel IDs are kept. |

### Stream statuses

| Status | Meaning |
| --- | --- |
| `verified` | Valid HLS manifest (master or media, with segments) **and** a browser-usable CORS header |
| `recently-available` | Verified in a previous run but not in the latest one |
| `temporarily-unavailable` | Timeout, 5xx, or an invalid or empty manifest |
| `playback-restricted` | Valid manifest without CORS, or HTTP 403 (refused from the checker's network) |
| `geo-restricted` | HTTP 451, or set manually with a `regionNote` when the broadcaster documents a region limit |
| `auth-required` | 401 |
| `unknown` | Never checked (the default for new entries) |
| `removed` | 404/410 |

HTTP 200 alone is never "verified". An HTML error page returned with 200 is rejected.

## Frontend (`src/`)

- **Routing:** React Router with lazy-loaded pages. `/bangladesh` redirects to `/bangladesh-tv`. Pages that would be empty (a country or category with no channels) render a noindex 404.
- **Data:** TanStack Query loads `catalog.json`, `epg.json` and `sports-events.json` once and caches them.
- **State:** Zustand `persist` stores in localStorage hold favorites, recent channels, local playlists, preferences and search history. Import and export validate every field.
- **Search:** token-based scoring over name, alternate names, country, language, provider, categories and sports. The query is deferred with `useDeferredValue`. 5,000 channels search in well under 100 ms.
- **Lists:** `ChannelGrid` virtualizes rows with `@tanstack/react-virtual` once a list has more than 60 items.
- **Theme:** dark by default. Light mode remaps the palette utilities in `styles/index.css`.

### Player behavior

`ChannelPlayer` orders sources (`playbackOrder`): playable before provider links, primary first, then by status, and drops removed sources. `HlsPlayer` then:

1. Classifies failures: 403/401 → access refused (likely region), 404 → retired, status 0 → CORS, plain HTTP on an HTTPS page → mixed content, or a media/decoding error.
2. Retries transient network errors twice, with 1.5 s and 3 s backoff. Media errors get `recoverMediaError`, then a codec swap.
3. Reports a fatal error to `ChannelPlayer`, which moves to the **next approved source** and tells the viewer.
4. When every source has failed, shows the reason and the official broadcaster link.

The player never invents a fallback stream and never uses a proxy.

## Security model

- No secrets in the client. Only `VITE_*` variables reach the bundle, and CI scans `dist/` for token patterns.
- CSP is set in `index.html` and as HTTP headers (`public/_headers`, `vercel.json`). `script-src 'self'` and `object-src 'none'` are set, and frames are allowed only from YouTube.
- All rendered text goes through React escaping. Search highlighting builds `<mark>` elements without `innerHTML`. JSON-LD escapes `<`.
- External links pass through `safeExternal` (http/https only) and use `rel="noreferrer noopener"`.
- Local playlists are parsed in the browser, accept only http(s) URLs, are capped at 5 MB and 5,000 entries, and are never uploaded. The app never scans private networks.
- Server-side fetching happens only in CI scripts, only for allowlisted URLs, behind the SSRF guard.

## SEO

`scripts/prerender.ts` writes a real HTML page for every directory route, with title, description, canonical, Open Graph, robots and JSON-LD (`WebSite` and `TelevisionChannel`). The sitemap includes only countries and categories that have channels.
