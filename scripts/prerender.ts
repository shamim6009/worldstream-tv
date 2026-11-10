import fs from 'node:fs';
import path from 'node:path';
import type { Catalog, CatalogCategory, CatalogCountry, Channel, EpgData, SportsEventData } from '../src/types/catalog';
import { siteConfig } from './lib/catalog-build';

interface Route {
  path: string;
  title: string;
  description: string;
  body: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const root = process.cwd();
const dist = path.join(root, 'dist');
const { base, absoluteBase } = siteConfig();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:#93c5fd;text-decoration:none">${escapeHtml(label)}</a>`;
}

function nav(): string {
  const items: [string, string][] = [
    ['', 'Home'],
    ['live-tv', 'Live TV'],
    ['sports', 'Sports'],
    ['bangladesh-tv', 'Bangladesh TV'],
    ['countries', 'Countries'],
    ['categories', 'Categories'],
    ['guide', 'TV Guide'],
    ['about', 'About'],
  ];
  return `<header style="border-bottom:1px solid #1e293b;padding:16px 24px;display:flex;flex-wrap:wrap;gap:16px;align-items:center">
  ${link(`${base}`, 'WorldStream TV')}
  <nav style="display:flex;flex-wrap:wrap;gap:14px;font-size:14px">
    ${items.map(([route, label]) => link(`${base}${route}`, label)).join('')}
  </nav>
</header>`;
}

function shell(title: string, body: string): string {
  return `<div style="min-height:100vh;background:#080d1b;color:#f8fafc;font-family:system-ui,sans-serif">
  ${nav()}
  <main style="max-width:1120px;margin:0 auto;padding:32px 24px 64px">
    <h1 style="font-size:clamp(28px,4vw,44px);line-height:1.1;margin:0 0 12px">${escapeHtml(title)}</h1>
    ${body}
  </main>
  <footer style="border-top:1px solid #1e293b;padding:24px;color:#94a3b8;font-size:13px;text-align:center">
    WorldStream TV lists authorized free streams published by broadcasters and FAST providers.
    Playback availability is controlled by the source. ${link(`${base}legal`, 'Legal & disclaimer')}
  </footer>
</div>`;
}

function channelList(channels: Channel[]): string {
  if (channels.length === 0) return '<p style="color:#94a3b8">No channels available.</p>';
  return `<ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;padding:0;list-style:none;margin:24px 0">
    ${channels
      .map(
        (channel) =>
          `<li style="border:1px solid #1e293b;border-radius:12px;padding:12px 14px;background:#0c1424">
            <div style="font-weight:600">${link(`${base}channel/${channel.slug}`, channel.name)}</div>
            <div style="color:#94a3b8;font-size:13px;margin-top:4px">${escapeHtml(channel.countryName)} · ${escapeHtml(
              channel.categories.join(', '),
            )} · ${escapeHtml(channel.status)}</div>
          </li>`,
      )
      .join('')}
  </ul>`;
}

function categoryLinks(categories: CatalogCategory[]): string {
  return `<ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:0;list-style:none;margin:24px 0">
    ${categories
      .filter((category) => category.channelCount > 0)
      .map(
        (category) =>
          `<li style="border:1px solid #1e293b;border-radius:12px;padding:12px 14px">
            ${link(`${base}category/${category.slug}`, category.name)}
            <span style="color:#94a3b8;font-size:13px"> · ${category.channelCount} channels</span>
          </li>`,
      )
      .join('')}
  </ul>`;
}

function countryLinks(countries: CatalogCountry[]): string {
  return `<ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:0;list-style:none;margin:24px 0">
    ${countries
      .filter((country) => country.channelCount > 0)
      .map(
        (country) =>
          `<li style="border:1px solid #1e293b;border-radius:12px;padding:12px 14px">
            ${link(`${base}country/${country.slug}`, `${country.flag} ${country.name}`)}
            <span style="color:#94a3b8;font-size:13px"> · ${country.channelCount} channels</span>
          </li>`,
      )
      .join('')}
  </ul>`;
}

function channelBody(channel: Channel, catalog: Catalog): string {
  const related = catalog.channels
    .filter(
      (candidate) =>
        candidate.id !== channel.id &&
        (candidate.country === channel.country ||
          candidate.categories.some((category) => channel.categories.includes(category))),
    )
    .slice(0, 8);
  const sources = channel.sources
    .map(
      (source) =>
        `<li>${escapeHtml(source.provider)} · ${escapeHtml(source.type.toUpperCase())}${
          source.quality ? ` · ${escapeHtml(source.quality)}` : ''
        } · ${escapeHtml(source.status)}</li>`,
    )
    .join('');
  return `<p style="color:#cbd5e1;max-width:760px;line-height:1.65">${escapeHtml(channel.description)}</p>
  <p style="color:#94a3b8;font-size:14px">
    ${escapeHtml(channel.countryName)} · ${escapeHtml(channel.languageName)} · ${escapeHtml(
      channel.categories.join(', '),
    )} · Provider: ${escapeHtml(channel.provider)} · Status: ${escapeHtml(channel.status)}
  </p>
  <p style="color:#94a3b8;font-size:14px">${escapeHtml(channel.notes ?? "")}</p>
  ${
    channel.officialWatchUrl
      ? `<p>${link(channel.officialWatchUrl, 'Official broadcaster page')}</p>`
      : ''
  }
  <h2 style="font-size:20px;margin-top:32px">Sources</h2>
  <ul style="color:#cbd5e1;line-height:1.8">${sources}</ul>
  <h2 style="font-size:20px;margin-top:32px">Related channels</h2>
  ${channelList(related)}`;
}

function buildRoutes(catalog: Catalog, epg: EpgData, sports: SportsEventData): Route[] {
  const routes: Route[] = [];
  const featured = catalog.channels.filter((channel) => channel.featured).slice(0, 16);
  const stats = catalog.stats;

  routes.push({
    path: '',
    title: 'WorldStream TV — Free Live TV, Sports & IPTV Worldwide',
    description:
      `Browse ${stats.totalChannels} authorized free live TV channels from ${stats.countries} countries. ` +
      'News, sports, entertainment, kids, music, documentaries and Bangladesh channels.',
    body: `<p style="color:#cbd5e1;max-width:780px;line-height:1.7">
      WorldStream TV is a fast, modern directory of free live television published by broadcasters,
      public media and FAST providers. ${stats.totalChannels} channels, ${stats.sources} documented sources,
      ${stats.verifiedChannels} verified at the last check.
    </p>
    <h2 style="font-size:22px;margin-top:32px">Featured channels</h2>
    ${channelList(featured)}
    <h2 style="font-size:22px;margin-top:32px">Browse by category</h2>
    ${categoryLinks(catalog.categories)}
    <h2 style="font-size:22px;margin-top:32px">Browse by country</h2>
    ${countryLinks(catalog.countries)}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'WorldStream TV',
      url: `${absoluteBase}/`,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${absoluteBase}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  });

  routes.push({
    path: 'live-tv',
    title: 'Live TV Directory — Authorized Free Channels | WorldStream TV',
    description: `Browse all ${stats.totalChannels} free live TV channels by country, category and status.`,
    body: `<p style="color:#cbd5e1">All channels in the directory, with source status and provenance.</p>
      ${channelList(catalog.channels)}`,
  });

  const sportsChannels = catalog.channels.filter((channel) => channel.categories.includes('sports'));
  routes.push({
    path: 'sports',
    title: 'Free Live Sports — Authorized Streams | WorldStream TV',
    description: `Watch ${sportsChannels.length} authorized free sports channels and check verified event listings.`,
    body: `<p style="color:#cbd5e1">Free sports channels from official broadcasters and FAST providers.</p>
      <h2 style="font-size:22px;margin-top:28px">Event listings</h2>
      ${
        sports.events.length === 0
          ? '<p style="color:#94a3b8">No verified event listings are published. We never invent fixtures or kick-off times.</p>'
          : `<ul style="color:#cbd5e1">${sports.events
              .map((event) => `<li>${escapeHtml(event.title)} — ${escapeHtml(event.provider)}</li>`)
              .join('')}</ul>`
      }
      <h2 style="font-size:22px;margin-top:28px">Sports channels</h2>
      ${channelList(sportsChannels)}`,
  });

  const bdChannels = catalog.channels.filter((channel) => channel.country === 'BD');
  routes.push({
    path: 'bangladesh-tv',
    title: 'Bangladesh Live TV — Free Official Channels | WorldStream TV',
    description: `Watch ${bdChannels.length} Bangladeshi channels from official broadcaster sources, including news, entertainment, kids and sports.`,
    body: `<p style="color:#cbd5e1">Bangladeshi channels from official broadcaster YouTube channels and authorized HLS sources.
      Live availability is controlled by each broadcaster. Local BDIX playlists can be imported privately on this page.</p>
      ${channelList(bdChannels)}`,
  });

  routes.push({
    path: 'countries',
    title: 'Live TV by Country | WorldStream TV',
    description: `Browse authorized free live TV from ${stats.countries} countries.`,
    body: countryLinks(catalog.countries),
  });

  routes.push({
    path: 'categories',
    title: 'Live TV by Category | WorldStream TV',
    description: `Browse ${stats.categories} categories of authorized free live TV.`,
    body: categoryLinks(catalog.categories),
  });

  const guideChannels = catalog.channels.filter((channel) => (epg.channels[channel.epgId ?? channel.id]?.length ?? 0) > 0);
  routes.push({
    path: 'guide',
    title: 'TV Guide — Verified Schedules | WorldStream TV',
    description: 'Programme schedules from authorized XMLTV feeds. Channels without guide data show "Schedule unavailable".',
    body:
      guideChannels.length === 0
        ? '<p style="color:#94a3b8">No authorized TV guide data is loaded. The app never invents schedules.</p>'
        : channelList(guideChannels),
  });

  routes.push({
    path: 'about',
    title: 'About WorldStream TV',
    description: 'How WorldStream TV sources, verifies and documents free live TV streams.',
    body: `<p style="color:#cbd5e1;max-width:780px;line-height:1.7">
      WorldStream TV lists only streams that are published by their rights holders: public broadcasters,
      official broadcaster websites and apps, publisher-operated FAST channels, and official YouTube channels.
      Community playlists are imported as candidates and are never published automatically.
      Status labels are based on real checks and never imply a guarantee of availability.</p>`,
  });

  routes.push({
    path: 'legal',
    title: 'Legal & Disclaimer | WorldStream TV',
    description: 'Copyright, authorization and availability information for WorldStream TV.',
    body: `<p style="color:#cbd5e1;max-width:780px;line-height:1.7">
      WorldStream TV does not host, transcode or re-stream video. Playback happens directly from the
      broadcaster or provider. Channel names, logos and trademarks belong to their owners.
      If you believe a listing is unauthorized, contact the operator and we will remove it promptly.
      Availability varies by region and can change without notice.</p>`,
  });

  for (const country of catalog.countries.filter((entry) => entry.channelCount > 0)) {
    const channels = catalog.channels.filter((channel) => channel.country === country.code);
    routes.push({
      path: `country/${country.slug}`,
      title: `${country.name} Live TV — Free Authorized Channels | WorldStream TV`,
      description: `Watch ${channels.length} free live TV channels from ${country.name}.`,
      body: `<p style="color:#cbd5e1">${channels.length} channels from ${escapeHtml(country.name)}.</p>${channelList(channels)}`,
    });
  }

  for (const category of catalog.categories.filter((entry) => entry.channelCount > 0)) {
    const channels = catalog.channels.filter((channel) => channel.categories.includes(category.id));
    routes.push({
      path: `category/${category.slug}`,
      title: `${category.name} Live TV — Free Authorized Channels | WorldStream TV`,
      description: category.description,
      body: `<p style="color:#cbd5e1">${escapeHtml(category.description)}</p>${channelList(channels)}`,
    });
  }

  for (const channel of catalog.channels) {
    routes.push({
      path: `channel/${channel.slug}`,
      title: `${channel.name} Live — ${channel.countryName} | WorldStream TV`,
      description: channel.description.slice(0, 180),
      body: channelBody(channel, catalog),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'TelevisionChannel',
        name: channel.name,
        description: channel.description,
        broadcastDisplayName: channel.name,
        inLanguage: channel.language,
        countryOfOrigin: channel.country,
        url: `${absoluteBase}/channel/${channel.slug}`,
      },
    });
  }

  for (const pathName of ['search', 'favorites', 'admin']) {
    routes.push({
      path: pathName,
      title: `${pathName[0]?.toUpperCase() ?? ''}${pathName.slice(1)} | WorldStream TV`,
      description: 'WorldStream TV.',
      body: '<p style="color:#94a3b8">This page uses local browser data.</p>',
      noindex: true,
    });
  }

  return routes;
}

function injectMeta(html: string, route: Route): string {
  const canonical = `${absoluteBase}/${route.path}`.replace(/\/$/, '') || `${absoluteBase}/`;
  const image = `${absoluteBase}/images/og-cover.svg`;
  let output = html;

  output = output.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`);
  output = output.replace(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
  );
  output = output.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
  );
  output = output.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
  );
  output = output.replace(
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
  );
  output = output.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
  );
  output = output.replace(
    /<meta property="og:image" content="[^"]*" \/>/,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
  );
  output = output.replace(
    '</head>',
    `<meta name="robots" content="${route.noindex ? 'noindex,nofollow' : 'index,follow'}" />
    ${
      route.jsonLd
        ? `<script type="application/ld+json">${safeJson(route.jsonLd)}</script>`
        : ''
    }
  </head>`,
  );
  output = output.replace('<div id="root"></div>', `<div id="root">${shell(route.title, route.body)}</div>`);
  return output;
}

function writeRoute(routePath: string, html: string): void {
  const file =
    routePath === ''
      ? path.join(dist, 'index.html')
      : path.join(dist, ...routePath.split('/'), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function main(): void {
  const shellPath = path.join(dist, 'index.html');
  if (!fs.existsSync(shellPath)) {
    throw new Error('dist/index.html not found. Run vite build first.');
  }
  const template = fs.readFileSync(shellPath, 'utf8');
  const catalog = JSON.parse(
    fs.readFileSync(path.join(dist, 'data', 'catalog.json'), 'utf8'),
  ) as Catalog;
  const epgPath = path.join(dist, 'data', 'epg.json');
  const epg = fs.existsSync(epgPath)
    ? (JSON.parse(fs.readFileSync(epgPath, 'utf8')) as EpgData)
    : { generatedAt: '', timezone: 'UTC', channels: {} };
  const sportsPath = path.join(dist, 'data', 'sports-events.json');
  const sports = fs.existsSync(sportsPath)
    ? (JSON.parse(fs.readFileSync(sportsPath, 'utf8')) as SportsEventData)
    : { generatedAt: '', events: [] };

  const routes = buildRoutes(catalog, epg, sports);
  for (const route of routes) {
    writeRoute(route.path, injectMeta(template, route));
  }

  const notFound: Route = {
    path: '404',
    title: 'Page not found | WorldStream TV',
    description: 'The page you requested was not found. Browse live TV, sports and countries instead.',
    body: `<p style="color:#cbd5e1">The page you requested does not exist.</p>
      <p>${link(`${base}live-tv`, 'Browse all live TV')} · ${link(`${base}sports`, 'Sports')} · ${link(
        `${base}countries`,
        'Countries',
      )}</p>`,
    noindex: true,
  };
  fs.writeFileSync(path.join(dist, '404.html'), injectMeta(template, notFound));
  fs.writeFileSync(path.join(dist, '.nojekyll'), '');

  console.info(`[prerender] wrote ${routes.length} routes plus 404.html`);
}

try {
  main();
} catch (error) {
  console.error('[prerender] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
