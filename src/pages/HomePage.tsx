import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Globe2, Radio, ShieldCheck, Trophy } from 'lucide-react';
import { CatalogGate } from '../components/CatalogGate';
import { CategoryIcon } from '../components/CategoryIcon';
import { ChannelRail } from '../components/ChannelRail';
import { Logo } from '../components/Logo';
import { SectionHeading } from '../components/SectionHeading';
import { StatusBadge } from '../components/StatusBadge';
import { useRecent } from '../hooks/useRecent';
import { channelById, isAvailable, statusRank } from '../lib/channels';
import { useSeo } from '../lib/seo';
import { formatNumber, formatRelative } from '../lib/utils';
import type { Catalog, Channel } from '../types/catalog';

function byCategory(channels: Channel[], category: string, exclude?: (channel: Channel) => boolean) {
  return channels.filter((channel) => channel.categories.includes(category) && !exclude?.(channel)).slice(0, 18);
}

function Hero({ catalog }: { catalog: Catalog }) {
  const spotlight = useMemo(
    () =>
      [...catalog.channels]
        .filter((channel) => channel.featured)
        .sort((a, b) => statusRank(a.status) - statusRank(b.status))
        .slice(0, 4),
    [catalog.channels],
  );
  const [lead, ...rest] = spotlight;

  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-hero-grid">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-8 lg:py-20">
        <div className="animate-slide-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Authorized free sources only
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Watch Free Live TV <span className="bg-gradient-to-r from-accent-soft to-accent-cyan bg-clip-text text-transparent">From Around the World</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            Discover live television, sports, news and entertainment from authorized free streaming sources worldwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/live-tv" className="btn-primary">
              Explore Live TV <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/sports" className="btn-secondary">
              <Trophy className="h-4 w-4" aria-hidden="true" /> Browse Sports
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {[
              { label: 'Channels', value: formatNumber(catalog.stats.totalChannels) },
              { label: 'Countries', value: formatNumber(catalog.stats.countries) },
              { label: 'Sources', value: formatNumber(catalog.stats.sources) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-ink-900/60 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{stat.label}</dt>
                <dd className="mt-1 font-heading text-2xl font-bold text-slate-50">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Catalog updated {formatRelative(catalog.generatedAt)} · {catalog.stats.verifiedChannels} channels passed the
            latest automated check.
          </p>
        </div>

        {lead ? (
          <div className="relative animate-fade-in">
            <Link
              to={`/channel/${lead.slug}`}
              className="group block overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 shadow-glow transition hover:border-accent-soft/50"
            >
              <div className="relative aspect-video bg-gradient-to-br from-ink-800 via-ink-850 to-ink-950">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 30% 30%, rgba(37,99,235,0.35), transparent 50%), radial-gradient(circle at 75% 70%, rgba(6,182,212,0.25), transparent 45%)',
                  }}
                />
                <Logo name={lead.name} logo={lead.logo} className="absolute inset-0 m-auto h-28 w-48 !bg-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    <Radio className="h-3 w-3" aria-hidden="true" /> Featured
                  </span>
                  <StatusBadge status={lead.status} compact />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 to-transparent p-5 pt-16">
                  <p className="font-heading text-xl font-bold text-slate-50">{lead.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">{lead.description}</p>
                </div>
              </div>
            </Link>
            {rest.length ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {rest.map((channel) => (
                  <Link
                    key={channel.id}
                    to={`/channel/${channel.slug}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-900/70 p-2.5 transition hover:border-white/25"
                  >
                    <Logo name={channel.name} logo={channel.logo} className="h-9 w-9 shrink-0" imgClassName="p-1" />
                    <span className="truncate text-xs font-semibold text-slate-200">{channel.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HomeContent({ catalog }: { catalog: Catalog }) {
  useSeo({
    title: 'WorldStream TV — Free Live TV, Sports & IPTV Worldwide',
    description: `Browse ${catalog.stats.totalChannels} authorized free live TV channels from ${catalog.stats.countries} countries: news, sports, entertainment, kids, music and Bangladesh channels.`,
    path: '',
  });

  const recentEntries = useRecent((state) => state.entries);
  const channels = catalog.channels;

  const sections = useMemo(() => {
    const featured = channels.filter((channel) => channel.featured);
    const popular = [...channels]
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          b.sources.length - a.sources.length ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 18);
    return {
      featured,
      popular,
      sports: byCategory(channels, 'sports'),
      bangladesh: channels.filter((channel) => channel.country === 'BD').slice(0, 18),
      news: byCategory(channels, 'news', (channel) => channel.country === 'BD'),
      entertainment: byCategory(channels, 'entertainment'),
      movies: byCategory(channels, 'movies'),
      music: byCategory(channels, 'music'),
      kids: byCategory(channels, 'kids'),
      recentlyAdded: [...channels]
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name))
        .slice(0, 18),
      available: channels.filter(isAvailable).slice(0, 18),
    };
  }, [channels]);

  const recent = useMemo(() => {
    const map = channelById(catalog);
    return recentEntries.map((entry) => map.get(entry.id)).filter((channel): channel is Channel => Boolean(channel));
  }, [catalog, recentEntries]);

  const topCountries = useMemo(
    () => [...catalog.countries].filter((c) => c.channelCount > 0).sort((a, b) => b.channelCount - a.channelCount),
    [catalog.countries],
  );

  return (
    <>
      <Hero catalog={catalog} />
      <div className="mx-auto w-full max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {recent.length ? (
          <ChannelRail title="Recently Watched" eyebrow="Continue" channels={recent} to="/favorites" />
        ) : null}
        <ChannelRail
          title="Featured Live Channels"
          eyebrow="Editor’s picks"
          description="Hand-reviewed channels with official, documented sources."
          channels={sections.featured}
          to="/live-tv"
        />
        <ChannelRail
          title="Popular Free TV"
          description="Ordered by the latest automated availability check, then by number of approved sources."
          channels={sections.popular}
          to="/live-tv?sort=status"
        />
        <ChannelRail title="Live Sports" eyebrow="Sports" channels={sections.sports} to="/sports" />
        <ChannelRail
          title="Bangladesh Channels"
          eyebrow="বাংলাদেশ"
          description="Official Bangladeshi broadcasters, plus private ISP playlist support."
          channels={sections.bangladesh}
          to="/bangladesh-tv"
        />
        <ChannelRail title="International News" channels={sections.news} to="/category/news" />
        <ChannelRail title="Entertainment Channels" channels={sections.entertainment} to="/category/entertainment" />
        <ChannelRail title="Movies & Series Channels" channels={sections.movies} to="/category/movies" />
        <ChannelRail title="Music Channels" channels={sections.music} to="/category/music" />
        <ChannelRail title="Kids Channels" channels={sections.kids} to="/category/kids" />

        <section className="space-y-4" aria-label="Channels by country">
          <SectionHeading
            title="Channels by Country"
            action={
              <Link to="/countries" className="text-sm font-semibold text-accent-cyan hover:text-cyan-300">
                All countries
              </Link>
            }
          />
          <div className="flex flex-wrap gap-2">
            {topCountries.map((country) => (
              <Link key={country.code} to={`/country/${country.slug}`} className="chip">
                <span aria-hidden="true">{country.flag}</span> {country.name}
                <span className="text-slate-500">{country.channelCount}</span>
              </Link>
            ))}
          </div>
        </section>

        <ChannelRail title="Recently Added" channels={sections.recentlyAdded} to="/live-tv?sort=recent" />

        <ChannelRail
          title="Available Channels"
          eyebrow="Verified"
          description="Channels whose stream passed the most recent automated check."
          channels={sections.available}
          to="/live-tv?status=available"
          empty={
            <div className="panel flex items-start gap-3 p-5 text-sm text-slate-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <p>
                No channel has a recorded successful check yet. Statuses appear after the scheduled stream checker runs
                (<code className="text-slate-300">npm run validate:streams</code>). We never display LIVE just because a
                URL exists.
              </p>
            </div>
          }
        />

        <section className="space-y-4" aria-label="All categories">
          <SectionHeading
            title="All Categories"
            action={
              <Link to="/categories" className="text-sm font-semibold text-accent-cyan hover:text-cyan-300">
                Browse categories
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {catalog.categories
              .filter((category) => category.channelCount > 0)
              .map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4 transition hover:-translate-y-0.5 hover:border-white/25"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${category.color}22`, color: category.color }}
                  >
                    <CategoryIcon name={category.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">{category.name}</span>
                    <span className="text-xs text-slate-500">{category.channelCount} channels</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-hero-grid p-6 sm:grid-cols-3 sm:p-8">
          {[
            {
              icon: ShieldCheck,
              title: 'Authorized sources',
              text: 'Every published stream documents its broadcaster and authorization. Community playlists stay candidates until reviewed.',
            },
            {
              icon: CheckCircle2,
              title: 'Honest status',
              text: 'Statuses come from real manifest checks, including CORS. Unchecked streams are labelled as such.',
            },
            {
              icon: Globe2,
              title: 'Fast everywhere',
              text: 'A static, CDN-cached catalog with lazy loading keeps the app quick on slower mobile connections.',
            },
          ].map((item) => (
            <div key={item.title}>
              <item.icon className="h-6 w-6 text-accent-cyan" aria-hidden="true" />
              <h3 className="mt-3 font-heading text-base font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export default function HomePage() {
  return <CatalogGate>{(catalog) => <HomeContent catalog={catalog} />}</CatalogGate>;
}
