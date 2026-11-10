import fs from 'node:fs';
import path from 'node:path';
import type {
  Catalog,
  CatalogCategory,
  CatalogCountry,
  Channel,
  EpgData,
  Region,
  SportsEventData,
  StreamSource,
} from '../../src/types/catalog';
import { applyStatuses, deriveChannelStatus, firstVerifiedAt, readStatusFile } from './status';
import { validateApprovedChannel, type Blocklist } from './validate-approved';

export interface ApprovedChannelSeed {
  id: string;
  name: string;
  altNames?: string[];
  country: string;
  language: string;
  categories: string[];
  sports?: string[];
  logo?: string | null;
  provider: string;
  description: string;
  region?: string;
  featured?: boolean;
  quality?: string | null;
  authorization: Channel['authorization'];
  authorizationNote: string;
  officialWatchUrl?: string | null;
  addedAt: string;
  updatedAt: string;
  sources: StreamSource[];
}

export interface ApprovedFile {
  version: number;
  generatedAt: string;
  note: string;
  channels: ApprovedChannelSeed[];
}

interface RawCountry {
  code: string;
  name: string;
  slug: string;
  flag: string;
  region: string;
}

interface RawCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  bn: 'Bengali',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  hi: 'Hindi',
  es: 'Spanish',
  pt: 'Portuguese',
  tr: 'Turkish',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  ru: 'Russian',
  ur: 'Urdu',
};

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function loadBlocklist(root: string): Blocklist {
  const file = path.join(root, 'data', 'sources.json');
  if (!fs.existsSync(file)) return { hosts: [], urls: [] };
  const sources = readJson<{ blocklist?: Partial<Blocklist> }>(file);
  return { hosts: sources.blocklist?.hosts ?? [], urls: sources.blocklist?.urls ?? [] };
}

export function loadApproved(root: string): ApprovedFile {
  const file = readJson<ApprovedFile>(path.join(root, 'data', 'approved-channels.json'));
  if (!Array.isArray(file.channels)) throw new Error('approved-channels.json has no channels array');
  const categoryIds = new Set(
    readJson<RawCategory[]>(path.join(root, 'data', 'categories.json')).map((category) => category.id),
  );
  const blocklist = loadBlocklist(root);
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const channel of file.channels) {
    if (seen.has(channel.id)) errors.push(`${channel.id}: duplicate channel id`);
    seen.add(channel.id);
    errors.push(...validateApprovedChannel(channel, categoryIds, blocklist));
  }
  if (errors.length) {
    throw new Error(`approved-channels.json failed validation:\n  - ${errors.join('\n  - ')}`);
  }
  return file;
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

export function buildCatalog(root: string, siteUrl: string): Catalog {
  const approved = loadApproved(root);
  const rawCountries = readJson<RawCountry[]>(path.join(root, 'data', 'countries.json'));
  const rawCategories = readJson<RawCategory[]>(path.join(root, 'data', 'categories.json'));
  const statuses = readStatusFile(path.join(root, 'data', 'stream-status.json'));

  const countryByCode = new Map(rawCountries.map((country) => [country.code.toUpperCase(), country]));
  const categoryById = new Map(rawCategories.map((category) => [category.id, category]));

  const channels: Channel[] = approved.channels.map((seed) => {
    const country = countryByCode.get(seed.country.toUpperCase());
    if (!country) throw new Error(`Unknown country ${seed.country} for ${seed.id}`);
    for (const categoryId of seed.categories) {
      if (!categoryById.has(categoryId)) {
        throw new Error(`Unknown category ${categoryId} for ${seed.id}`);
      }
    }
    const sources = applyStatuses(seed.id, seed.sources, statuses).sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return 0;
    });
    const status = deriveChannelStatus(sources);
    return {
      id: seed.id,
      slug: seed.id,
      name: seed.name,
      altNames: seed.altNames ?? [],
      country: country.code,
      countryName: country.name,
      language: seed.language,
      languageName: languageName(seed.language),
      categories: seed.categories,
      sports: seed.sports ?? [],
      logo: seed.logo ?? null,
      description: seed.description,
      quality: seed.quality ?? null,
      isHd: /^(2160|1440|1080|720)p$/.test(seed.quality ?? ''),
      provider: seed.provider,
      sources,
      status,
      featured: Boolean(seed.featured),
      region: country.region as Region,
      epgId: seed.id,
      officialWatchUrl: seed.officialWatchUrl ?? undefined,
      addedAt: seed.addedAt,
      updatedAt: seed.updatedAt,
      verifiedAt: firstVerifiedAt(sources),
      authorization: seed.authorization,
      notes: seed.authorizationNote,
    };
  });

  channels.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const countries: CatalogCountry[] = rawCountries
    .map((country) => ({
      code: country.code,
      name: country.name,
      slug: country.slug,
      flag: country.flag,
      region: country.region as Region,
      channelCount: channels.filter((channel) => channel.country === country.code).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const categories: CatalogCategory[] = rawCategories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      channelCount: channels.filter((channel) => channel.categories.includes(category.id)).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sourceCount = channels.reduce((total, channel) => total + channel.sources.length, 0);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    siteUrl,
    channels,
    countries,
    categories,
    stats: {
      totalChannels: channels.length,
      verifiedChannels: channels.filter((channel) => channel.status === 'verified').length,
      countries: countries.filter((country) => country.channelCount > 0).length,
      categories: categories.filter((category) => category.channelCount > 0).length,
      sources: sourceCount,
    },
  };
}

export function siteConfig(): { siteUrl: string; base: string; absoluteBase: string } {
  const siteUrl = (process.env.VITE_SITE_URL || 'https://worldstream-tv.pages.dev').replace(/\/+$/, '');
  const rawBase = process.env.VITE_BASE || '/';
  const base = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const absoluteBase =
    normalizedBase === '/' ? siteUrl : `${siteUrl}${normalizedBase.replace(/\/$/, '')}`;
  return { siteUrl, base: normalizedBase, absoluteBase };
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemap(catalog: Catalog, absoluteBase: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const routes: { path: string; priority: string; changefreq: string }[] = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: 'live-tv', priority: '0.9', changefreq: 'daily' },
    { path: 'sports', priority: '0.9', changefreq: 'daily' },
    { path: 'bangladesh-tv', priority: '0.9', changefreq: 'daily' },
    { path: 'countries', priority: '0.8', changefreq: 'weekly' },
    { path: 'categories', priority: '0.8', changefreq: 'weekly' },
    { path: 'guide', priority: '0.6', changefreq: 'daily' },
    { path: 'about', priority: '0.4', changefreq: 'monthly' },
    { path: 'legal', priority: '0.4', changefreq: 'monthly' },
    ...catalog.countries
      .filter((country) => country.channelCount > 0)
      .map((country) => ({
        path: `country/${country.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
      })),
    ...catalog.categories
      .filter((category) => category.channelCount > 0)
      .map((category) => ({
        path: `category/${category.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
      })),
    ...catalog.channels.map((channel) => ({
      path: `channel/${channel.slug}`,
      priority: '0.6',
      changefreq: 'weekly',
    })),
  ];

  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${xmlEscape(`${absoluteBase}/${route.path}`.replace(/\/$/, '') || absoluteBase)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRobots(absoluteBase: string): string {
  return `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${absoluteBase}/sitemap.xml
`;
}

export function writeCatalogArtifacts(root: string, catalog: Catalog, absoluteBase: string): void {
  const publicDir = path.join(root, 'public');
  const dataDir = path.join(publicDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildSitemap(catalog, absoluteBase));
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), buildRobots(absoluteBase));

  const epgPath = path.join(root, 'data', 'epg.json');
  if (fs.existsSync(epgPath)) {
    const epg = readJson<EpgData>(epgPath);
    fs.writeFileSync(path.join(dataDir, 'epg.json'), `${JSON.stringify(epg, null, 2)}\n`);
  }
  const sportsPath = path.join(root, 'data', 'sports-events.json');
  if (fs.existsSync(sportsPath)) {
    const sports = readJson<SportsEventData>(sportsPath);
    fs.writeFileSync(path.join(dataDir, 'sports-events.json'), `${JSON.stringify(sports, null, 2)}\n`);
  }
}
