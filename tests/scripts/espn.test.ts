import { ESPN_LEAGUES, mapEspnEvent, mapEspnScoreboard, type LeagueConfig } from '../../scripts/lib/espn';

const league: LeagueConfig = {
  slug: 'eng.1',
  sport: 'soccer',
  sportId: 'football',
  competition: 'Premier League',
  region: 'Worldwide',
  durationMinutes: 120,
  channelIds: [],
};

const NOW = Date.parse('2026-11-23T18:00:00Z');

function board(events: unknown[]) {
  return { events } as never;
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: '401',
    name: 'Chelsea at Nottingham Forest',
    date: '2026-11-23T20:00Z',
    competitions: [
      {
        status: { type: { state: 'pre', shortDetail: '7:00 PM' } },
        competitors: [
          { homeAway: 'home', score: '0', team: { shortDisplayName: 'Nottm Forest' } },
          { homeAway: 'away', score: '0', team: { shortDisplayName: 'Chelsea' } },
        ],
      },
    ],
    ...overrides,
  };
}

describe('mapEspnEvent', () => {
  it('maps a scheduled fixture', () => {
    const mapped = mapEspnEvent(event(), league, NOW);
    expect(mapped).toMatchObject({
      title: 'Nottm Forest v Chelsea',
      sport: 'football',
      competition: 'Premier League',
      status: 'scheduled',
      homeTeam: 'Nottm Forest',
      awayTeam: 'Chelsea',
    });
    expect(mapped?.startTime).toBe('2026-11-23T20:00:00.000Z');
    expect(mapped?.homeScore).toBeNull();
  });

  it('keeps the score once the match is under way', () => {
    const live = event({
      competitions: [
        {
          status: { type: { state: 'in', shortDetail: "63'" } },
          competitors: [
            { homeAway: 'home', score: '2', team: { shortDisplayName: 'Nottm Forest' } },
            { homeAway: 'away', score: '1', team: { shortDisplayName: 'Chelsea' } },
          ],
        },
      ],
    });
    const mapped = mapEspnEvent(live, league, NOW);
    expect(mapped?.status).toBe('live');
    expect(mapped?.homeScore).toBe('2');
    expect(mapped?.awayScore).toBe('1');
  });

  it('marks a finished match and ends it no later than now', () => {
    const finished = event({
      date: '2026-11-23T12:00Z',
      competitions: [
        {
          status: { type: { state: 'post', shortDetail: 'FT' } },
          competitors: [
            { homeAway: 'home', score: '3', team: { shortDisplayName: 'Nottm Forest' } },
            { homeAway: 'away', score: '0', team: { shortDisplayName: 'Chelsea' } },
          ],
        },
      ],
    });
    const mapped = mapEspnEvent(finished, league, NOW);
    expect(mapped?.status).toBe('finished');
    expect(Date.parse(mapped?.endTime ?? '')).toBeLessThanOrEqual(NOW);
  });

  it('drops placeholder fixtures instead of inventing a match', () => {
    const tbc = event({
      competitions: [
        {
          competitors: [
            { homeAway: 'home', team: { displayName: 'TBC' } },
            { homeAway: 'away', team: { displayName: 'TBC' } },
          ],
        },
      ],
    });
    expect(mapEspnEvent(tbc, league, NOW)).toBeNull();
  });

  it('drops an event with no usable date', () => {
    expect(mapEspnEvent(event({ date: undefined }), league, NOW)).toBeNull();
  });

  it('keeps cricket scores as strings such as 187/6', () => {
    const cricket: LeagueConfig = { ...league, slug: '8044', sport: 'cricket', sportId: 'cricket', competition: 'Big Bash League' };
    const mapped = mapEspnEvent(
      event({
        competitions: [
          {
            status: { type: { state: 'in', shortDetail: 'Renegades need 42 off 30' } },
            competitors: [
              { homeAway: 'home', score: '187/6', team: { shortDisplayName: 'Renegades' } },
              { homeAway: 'away', score: '145/8', team: { shortDisplayName: 'Scorchers' } },
            ],
          },
        ],
      }),
      cricket,
      NOW,
    );
    expect(mapped?.homeScore).toBe('187/6');
    expect(mapped?.sport).toBe('cricket');
  });

  it('always links to an https source', () => {
    expect(mapEspnEvent(event(), league, NOW)?.watchUrl).toMatch(/^https:\/\//);
  });
});

describe('mapEspnScoreboard', () => {
  it('de-duplicates repeated ids', () => {
    const mapped = mapEspnScoreboard(board([event(), event()]), league, NOW);
    expect(mapped).toHaveLength(1);
  });

  it('survives an empty or malformed payload', () => {
    expect(mapEspnScoreboard(board([]), league, NOW)).toHaveLength(0);
    expect(mapEspnScoreboard({} as never, league, NOW)).toHaveLength(0);
  });

  it('only configures known sport ids', () => {
    for (const entry of ESPN_LEAGUES) {
      expect(['football', 'cricket']).toContain(entry.sportId);
      expect(entry.durationMinutes).toBeGreaterThan(0);
    }
  });
});
