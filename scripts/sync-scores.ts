/**
 * Pulls live scores and fixtures from ESPN's public scoreboards.
 *
 * Runs in CI (see .github/workflows/sync-scores.yml), never in the browser:
 * the site is a static build, and this keeps third-party access server-side.
 * Output goes to data/sports-live.json, which is deliberately separate from the
 * hand-curated data/sports-events.json so provenance stays obvious.
 *
 * Usage: npm run sync:scores
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SportsEvent, SportsEventData } from '../src/types/catalog';
import { ESPN_LEAGUES, mapEspnScoreboard, type EspnScoreboard, type LeagueConfig } from './lib/espn';

const root = process.cwd();
const OUT = path.join(root, 'data', 'sports-live.json');
const SCOREBOARD = (league: LeagueConfig) =>
  `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard`;

/** Fixtures further out than this are noise on a "live now" page. */
const HORIZON_DAYS = 14;

async function fetchLeague(league: LeagueConfig): Promise<SportsEvent[]> {
  const url = SCOREBOARD(league);
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'worldstream-tv/1.0 (+https://github.com/shamim6009/worldstream-tv)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const board = (await response.json()) as EspnScoreboard;
  return mapEspnScoreboard(board, league);
}

async function main(): Promise<void> {
  const now = Date.now();
  const horizon = now + HORIZON_DAYS * 86_400_000;
  const events: SportsEvent[] = [];
  const failures: string[] = [];

  for (const league of ESPN_LEAGUES) {
    try {
      const mapped = await fetchLeague(league);
      events.push(...mapped);
      console.info(`[scores] ${league.competition}: ${mapped.length} event(s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      failures.push(`${league.competition} (${message})`);
      console.warn(`[scores] ${league.competition}: skipped, ${message}`);
    }
  }

  // Keep the board useful: live and recent results first, then the next two weeks.
  const kept = events
    .filter((event) => {
      const start = Date.parse(event.startTime);
      const end = Date.parse(event.endTime);
      if (event.status === 'finished') return end >= now - 36 * 3_600_000;
      return start <= horizon;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (kept.length === 0 && failures.length === ESPN_LEAGUES.length) {
    // Every league failed: keep the previous file instead of blanking the page.
    console.error('[scores] every league failed, leaving data/sports-live.json untouched');
    process.exitCode = 1;
    return;
  }

  const output: SportsEventData = {
    generatedAt: new Date(now).toISOString(),
    events: kept,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
  const live = kept.filter((event) => event.status === 'live').length;
  const finished = kept.filter((event) => event.status === 'finished').length;
  console.info(
    `[scores] wrote data/sports-live.json: ${kept.length} events (${live} live, ${finished} finished)` +
      (failures.length ? `, ${failures.length} league(s) skipped` : ''),
  );
}

main().catch((error) => {
  console.error('[scores] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
