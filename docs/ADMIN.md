# Admin workflow (Git-based)

The free static deployment has **no admin login and no write API**. Every change to the catalog is a reviewed pull request that edits JSON in `data/`. CI validates each pull request, and merging it deploys the change.

The `/admin` page in the app is read-only. It shows catalog stats, source status counts and failing sources.

## Files

| File | Purpose |
| --- | --- |
| `data/approved-channels.json` | The **only** source of published channels |
| `data/candidates.json` | Output of `npm run sync:catalog`, every entry `publish: false` |
| `data/sources.json` | Playlist allowlist, metadata URLs, EPG feeds, and the **blocklist** |
| `data/stream-status.json` | Output of `npm run validate:streams` |
| `data/categories.json`, `data/countries.json` | Category and country metadata (ISO 3166-1 codes) |
| `data/epg.json` | Output of `npm run sync:epg` |
| `data/sports-events.json` | Curated, verified events only |

## Triage the candidate queue

`npm run sync:catalog` can import thousands of rows per playlist, and none of them are evidence of
rights. Run `npm run review:candidates` after a sync to get an advisory queue:

```
npm run sync:catalog
npm run review:candidates
```

It writes `data/candidates-review.md` (open this first) and `data/candidates-shortlist.json`. Every
candidate is bucketed by how likely the stream is the broadcaster's own endpoint:

| Tier | Signal |
| --- | --- |
| `official-domain` | stream host matches the channel's own website domain — start here |
| `official-fast` | hosted on a known free ad-supported platform (Pluto, Samsung, Plex, Xumo, …) |
| `official-youtube` | YouTube source, uploader still unverified |
| `review` | IP-based restreams and unknown CDNs — expect to reject most of these |

The tiers are a shortcut, **not** an approval. You still confirm rights and hand-write the entry as
described below. Both generated files are git-ignored; they are working state, not published data.

## Approve a stream

1. Find it in `data/candidates.json`, or start from the broadcaster's own site.
2. Confirm the rights holder publishes it **for free**. Accepted cases: an official site or app, a public broadcaster, a FAST channel run by the publisher, or an official YouTube channel. If embedding is not allowed, use a `provider` source that links to the official page.
3. Add an entry to `approved-channels.json`:

```jsonc
{
  "id": "example-news",                 // kebab-case, unique
  "name": "Example News",
  "country": "GB",                      // ISO 3166-1 alpha-2
  "language": "en",                     // ISO 639
  "categories": ["news"],               // ids from categories.json
  "sports": [],                         // ids from src/data/reference.ts (football, cricket, …)
  "provider": "Example Broadcasting Corp.",
  "description": "One or two factual sentences.",
  "region": "Europe",
  "authorization": "public-broadcaster",
  "authorizationNote": "Free live stream published on example.org/live.",
  "officialWatchUrl": "https://example.org/live",
  "addedAt": "2026-11-10",
  "updatedAt": "2026-11-10",
  "sources": [
    { "id": "example-news-s1", "type": "hls", "url": "https://…/master.m3u8", "provider": "Example CDN",
      "authorization": "public-broadcaster", "isPrimary": true, "status": "unknown" },
    { "id": "example-news-s2", "type": "youtube", "url": "https://www.youtube.com/channel/UC…",
      "provider": "Example News on YouTube", "authorization": "official-youtube", "status": "unknown" }
  ]
}
```

4. Run `npm run validate:streams -- --only=example-news`, then `npm run check`.
5. Open a pull request, and in the description link to where the broadcaster publishes the stream.

**Validation rules** (`scripts/lib/validate-approved.ts`): every URL is HTTPS with no credentials. `authorization` is one of `official-broadcaster`, `public-broadcaster`, `official-fast`, `official-youtube` or `provider-embed`. `authorizationNote` is required. Categories must exist. Source IDs are unique. `youtube` sources must point to youtube.com. No URL may be blocklisted.

## Fallback sources

Add more entries to `sources`, in order of preference. Only add streams from the **same rights holder**. The player tries them in order and then shows the official page.

## Reject or remove a stream (including copyright reports)

1. Delete the entry, or the single source, from `approved-channels.json`.
2. Add the host or URL prefix to `sources.json → blocklist` so that a future import can't bring it back:

```json
"blocklist": { "hosts": ["unauthorized.example"], "urls": ["https://cdn.example.org/restream/"] }
```

3. Merge. The next deployment removes the channel page and its sitemap entry. Aim to complete this within 72 hours of a valid request.

## Manage categories and countries

Edit `data/categories.json` (id, name, slug, description, a lucide icon name from `src/components/CategoryIcon.tsx`, and color) or `data/countries.json`. Countries with no channels get no page.

## Live scores and fixtures

`npm run sync:scores` pulls football and cricket scoreboards from ESPN's public,
key-less API and writes `data/sports-live.json`. `.github/workflows/sync-scores.yml`
runs it every 30 minutes and commits the result, which triggers a deploy.

| | |
| --- | --- |
| Leagues | configured in `ESPN_LEAGUES` (`scripts/lib/espn.ts`) |
| Output | `data/sports-live.json` → served as `public/data/sports-live.json` |
| Kept | live matches, results from the last 36 hours, fixtures up to 14 days out |
| Dropped | anything with a placeholder side (`TBA`, `TBC`, `TBD`) |

Two things to know before relying on it:

1. **It runs in CI, never in the browser.** The site is a static build and ESPN's
   endpoints are undocumented, so keeping the calls server-side means a rename on
   their end breaks a cron job instead of every visitor's page.
2. **This is fixture data, not an authorization grant.** A match appearing here
   does not mean we may restream it; the catalog still only lists streams its
   rights holder publishes. The card links out to ESPN.

The feed is separate from `data/sports-events.json` on purpose: that file is
hand-curated and should only ever hold events you verified yourself.

### Headlines

`npm run sync:news` fills `data/sports-news.json` from two feeds: ESPNcricinfo's
public RSS (`cricinfo.com/rss/content/story/feeds/0.xml`) and ESPN's news
endpoint. The same CI job runs it every 30 minutes.

Only a headline, a summary capped at 240 characters, the publication time and
the link are stored — **the article itself stays with the publisher**, and every
card opens their page. Do not extend this to full article bodies: an RSS feed is
a syndication channel, not a content licence.

## Sports events

Add events to `data/sports-events.json` only from an official broadcaster announcement or a licensed data provider. Include `watchUrl`, `region`, `source` and `verifiedAt`. Never add placeholder fixtures.

## Scheduled automation

`.github/workflows/sync-streams.yml` runs every 6 hours, and you can also start it with **Actions → Sync catalog & check streams → Run workflow**. It checks streams and syncs the EPG. When the pull-request input is set, it also re-imports candidates. It commits data changes only after the catalog validates, the tests pass and the app builds.

## Optional dynamic admin

If you later add a dashboard (for example Supabase), run all writes through a server-side function that has real authentication and role checks, and keep row-level security on. Never ship a service-role key, GitHub token or admin secret in frontend code or in a `VITE_*` variable.
