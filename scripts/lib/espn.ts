/**
 * Maps ESPN's public scoreboard payload onto the catalog's SportsEvent shape.
 *
 * Why ESPN: it is the only free, key-less source that carries both football and
 * cricket with live scores. The endpoints are public but undocumented, so every
 * field access here is defensive — a shape change should degrade to "skip this
 * event", never throw.
 *
 * Nothing in this module invents a fixture. Events without two real teams are
 * dropped, and a match is only marked live when ESPN says its state is "in".
 */
import type { SportsEvent } from '../../src/types/catalog';

/** Leagues we pull, with the sport id used by src/data/reference.ts. */
export interface LeagueConfig {
  /** ESPN league slug, e.g. `eng.1` for the Premier League. */
  slug: string;
  /** ESPN sport path segment: `soccer` or `cricket`. */
  sport: 'soccer' | 'cricket';
  /** Catalog sport id (football, cricket, ...). */
  sportId: string;
  /** Human competition name shown on the card. */
  competition: string;
  /** Region label shown on the card. */
  region: string;
  /** Typical match length in minutes, used only to derive an end time. */
  durationMinutes: number;
  /** Catalog channel ids that legitimately carry this competition. */
  channelIds: string[];
}

export const ESPN_LEAGUES: LeagueConfig[] = [
  { slug: 'eng.1', sport: 'soccer', sportId: 'football', competition: 'Premier League', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: 'esp.1', sport: 'soccer', sportId: 'football', competition: 'LaLiga', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: 'ita.1', sport: 'soccer', sportId: 'football', competition: 'Serie A', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: 'ger.1', sport: 'soccer', sportId: 'football', competition: 'Bundesliga', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: 'fra.1', sport: 'soccer', sportId: 'football', competition: 'Ligue 1', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: 'uefa.champions', sport: 'soccer', sportId: 'football', competition: 'UEFA Champions League', region: 'Worldwide', durationMinutes: 120, channelIds: [] },
  { slug: '8044', sport: 'cricket', sportId: 'cricket', competition: 'Big Bash League', region: 'Worldwide', durationMinutes: 240, channelIds: [] },
  { slug: '8045', sport: 'cricket', sportId: 'cricket', competition: 'Sri Lanka Women’s T20', region: 'Worldwide', durationMinutes: 240, channelIds: [] },
];

/** Placeholder sides ESPN uses before a fixture is confirmed. */
const PLACEHOLDER = /^(tba|tbc|tbd|to be (announced|confirmed)|—|-|)$/i;

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
}

interface EspnStatus {
  type?: { state?: string; detail?: string; shortDetail?: string; description?: string };
}

interface EspnEvent {
  id?: string;
  name?: string;
  date?: string;
  status?: EspnStatus;
  competitions?: {
    status?: EspnStatus;
    competitors?: EspnCompetitor[];
  }[];
  links?: { href?: string; rel?: string[] }[];
}

export interface EspnScoreboard {
  events?: EspnEvent[];
}

function teamName(competitor: EspnCompetitor | undefined): string {
  const team = competitor?.team;
  return (
    team?.shortDisplayName?.trim() ||
    team?.displayName?.trim() ||
    team?.abbreviation?.trim() ||
    ''
  );
}

function watchUrlFor(event: EspnEvent, league: LeagueConfig): string {
  const official = event.links?.find((link) => link.rel?.includes('desktop') || link.href)?.href;
  if (official && /^https:\/\//.test(official)) return official;
  return league.sport === 'cricket'
    ? `https://www.espn.in/cricket/series/_/id/${league.slug}`
    : `https://www.espn.com/soccer/scoreboard/_/league/${league.slug}`;
}

/**
 * Converts one ESPN event into a catalog SportsEvent, or null when the payload
 * is incomplete or still a placeholder fixture.
 */
export function mapEspnEvent(event: EspnEvent, league: LeagueConfig, now = Date.now()): SportsEvent | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];

  const homeTeam = teamName(home);
  const awayTeam = teamName(away);
  if (PLACEHOLDER.test(homeTeam) || PLACEHOLDER.test(awayTeam)) return null;

  const startMs = event.date ? Date.parse(event.date) : Number.NaN;
  if (!Number.isFinite(startMs)) return null;

  const state = competition?.status?.type?.state ?? event.status?.type?.state ?? 'pre';
  const status: SportsEvent['status'] = state === 'in' ? 'live' : state === 'post' ? 'finished' : 'scheduled';
  const detail =
    competition?.status?.type?.shortDetail ?? event.status?.type?.shortDetail ?? event.status?.type?.description ?? '';

  // ESPN has no end time. A finished match ends when it ends, so use the check
  // time; anything else is given a typical duration so the card can count down.
  const endMs =
    status === 'finished'
      ? Math.max(startMs, Math.min(now, startMs + league.durationMinutes * 60_000))
      : startMs + league.durationMinutes * 60_000;

  const id = `${league.slug}-${event.id ?? `${startMs}`}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');

  return {
    id,
    title: `${homeTeam} v ${awayTeam}`,
    sport: league.sportId,
    competition: league.competition,
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    region: league.region,
    provider: 'ESPN',
    watchUrl: watchUrlFor(event, league),
    channelIds: league.channelIds,
    verifiedAt: new Date(now).toISOString(),
    source: 'ESPN public scoreboard API',
    note: detail || undefined,
    status,
    homeTeam,
    awayTeam,
    homeScore: status === 'scheduled' ? null : home?.score?.trim() || null,
    awayScore: status === 'scheduled' ? null : away?.score?.trim() || null,
    sourceUrl: watchUrlFor(event, league),
  };
}

/** Maps a whole scoreboard, dropping anything unmappable and de-duplicating ids. */
export function mapEspnScoreboard(board: EspnScoreboard, league: LeagueConfig, now = Date.now()): SportsEvent[] {
  const out: SportsEvent[] = [];
  const seen = new Set<string>();
  for (const event of board.events ?? []) {
    const mapped = mapEspnEvent(event, league, now);
    if (!mapped || seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }
  return out;
}
