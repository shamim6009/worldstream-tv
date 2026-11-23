import { OFFICIAL_SPORTS_DESTINATIONS, PREMIUM_SPORTS_SERVICES } from '../../src/data/reference';

const ALL = [...OFFICIAL_SPORTS_DESTINATIONS, ...PREMIUM_SPORTS_SERVICES];

describe('sports watch guide', () => {
  it('links every destination over https', () => {
    for (const destination of ALL) {
      expect(destination.url, destination.name).toMatch(/^https:\/\//);
    }
  });

  it('has no duplicate destinations or names', () => {
    expect(new Set(ALL.map((d) => d.url)).size).toBe(ALL.length);
    expect(new Set(ALL.map((d) => d.name)).size).toBe(ALL.length);
  });

  it('labels the free destinations as free and never mixes them with paid ones', () => {
    expect(OFFICIAL_SPORTS_DESTINATIONS.length).toBeGreaterThan(0);
    expect(OFFICIAL_SPORTS_DESTINATIONS.every((d) => d.plan === 'free')).toBe(true);
    expect(PREMIUM_SPORTS_SERVICES.every((d) => d.plan === 'subscription')).toBe(true);
  });

  it('covers the subscription channels people ask for', () => {
    const names = PREMIUM_SPORTS_SERVICES.map((d) => d.name.toLowerCase()).join(' ');
    for (const expected of ['star sports', 'sky sports', 'tnt sports', 'espn', 'willow', 'dazn', 'supersport']) {
      expect(names).toContain(expected);
    }
  });

  it('describes each destination without claiming a free stream', () => {
    for (const destination of PREMIUM_SPORTS_SERVICES) {
      expect(destination.description.length).toBeGreaterThan(30);
    }
  });
});
