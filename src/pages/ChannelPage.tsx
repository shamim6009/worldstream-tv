import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Flag, Globe2, Languages, ShieldCheck } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { ChannelRail } from '../components/ChannelRail';
import { FavoriteButton } from '../components/FavoriteButton';
import { Logo } from '../components/Logo';
import { NowNext } from '../components/NowNext';
import { StatusBadge } from '../components/StatusBadge';
import { ChannelPlayer } from '../components/player/ChannelPlayer';
import { useRecent } from '../hooks/useRecent';
import { categoryLabel, countrySlug, relatedChannels, reportIssueUrl } from '../lib/channels';
import { useSeo } from '../lib/seo';
import {
  authorizationLabel,
  cn,
  formatRelative,
  safeExternal,
  sourceTypeLabel,
  statusMeta,
  truncate,
} from '../lib/utils';
import type { Catalog, Channel } from '../types/catalog';
import NotFoundPage from './NotFoundPage';

function RelatedList({ channels, activeId }: { channels: Channel[]; activeId: string }) {
  return (
    <aside className="panel flex max-h-[70vh] flex-col overflow-hidden lg:max-h-none" aria-label="Related channels">
      <h2 className="border-b border-white/5 px-4 py-3 font-heading text-sm font-semibold text-slate-100">
        Related channels
      </h2>
      <ul className="scrollbar-thin flex-1 divide-y divide-white/5 overflow-y-auto">
        {channels.map((channel) => (
          <li key={channel.id}>
            <Link
              to={`/channel/${channel.slug}`}
              aria-current={channel.id === activeId ? 'page' : undefined}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/5"
            >
              <Logo name={channel.name} logo={channel.logo} className="h-10 w-14 shrink-0" imgClassName="p-1" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-100">{channel.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {channel.countryName} · {channel.categories.map(categoryLabel).join(', ')}
                </span>
              </span>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', statusMeta(channel.status).dot)} title={statusMeta(channel.status).label} />
            </Link>
          </li>
        ))}
        {channels.length === 0 ? <li className="px-4 py-6 text-sm text-slate-500">No related channels.</li> : null}
      </ul>
    </aside>
  );
}

function ChannelContent({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const channel = catalog.channels.find((entry) => entry.slug === slug);
  const record = useRecent((state) => state.record);
  const related = useMemo(() => (channel ? relatedChannels(channel, catalog.channels, 20) : []), [catalog.channels, channel]);

  const jsonLd = useMemo(
    () =>
      channel
        ? {
            '@context': 'https://schema.org',
            '@type': 'TelevisionChannel',
            name: channel.name,
            description: channel.description,
            broadcastDisplayName: channel.name,
            inLanguage: channel.language,
          }
        : null,
    [channel],
  );

  useSeo({
    title: channel ? `${channel.name} Live — ${channel.countryName} | WorldStream TV` : 'Channel not found | WorldStream TV',
    description: channel ? truncate(channel.description, 160) : 'Channel not found.',
    path: `channel/${slug}`,
    image: channel?.logo ?? undefined,
    noindex: !channel,
    jsonLd,
  });

  useEffect(() => {
    if (channel) record(channel.id);
  }, [channel, record]);

  if (!channel) return <NotFoundPage />;

  const official = safeExternal(channel.officialWatchUrl);
  const cSlug = countrySlug(catalog, channel.country);
  const lastChecked = channel.sources
    .map((source) => source.lastCheckedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return (
    <div className="page space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Live TV', to: '/live-tv' },
          ...(cSlug ? [{ label: channel.countryName, to: `/country/${cSlug}` }] : []),
          { label: channel.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <ChannelPlayer channel={channel} />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Logo name={channel.name} logo={channel.logo} className="h-16 w-24 shrink-0 border border-white/10" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-extrabold text-slate-50 sm:text-3xl">{channel.name}</h1>
                <StatusBadge status={channel.status} />
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  {cSlug ? (
                    <Link to={`/country/${cSlug}`} className="hover:text-slate-200">
                      {channel.countryName}
                    </Link>
                  ) : (
                    channel.countryName
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" aria-hidden="true" /> {channel.languageName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> {channel.provider}
                </span>
                {channel.quality ? <span className="font-semibold text-slate-300">{channel.quality}</span> : null}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {channel.categories.map((category) => (
                  <Link key={category} to={`/category/${category}`} className="chip py-1">
                    {categoryLabel(category)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <FavoriteButton channelId={channel.id} channelName={channel.name} showLabel />
              {official ? (
                <a href={official} target="_blank" rel="noreferrer noopener" className="btn-secondary py-2">
                  Official page <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-7 text-slate-300">{channel.description}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="panel p-4" aria-label="Source and availability">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Source &amp; availability
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Authorization</dt>
                  <dd className="text-right text-slate-200">{authorizationLabel(channel.authorization)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="text-right text-slate-200">{statusMeta(channel.status).label}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Last checked</dt>
                  <dd className="text-right text-slate-200">{formatRelative(lastChecked)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Approved sources</dt>
                  <dd className="text-right text-slate-200">{channel.sources.length}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-slate-500">{statusMeta(channel.status).description}</p>
              <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-xs text-slate-400">
                {channel.sources.map((source, index) => (
                  <li key={source.id} className="flex flex-wrap items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta(source.status).dot)} aria-hidden="true" />
                    <span className="font-semibold text-slate-300">{source.label ?? `Source ${index + 1}`}</span>·
                    {sourceTypeLabel(source.type)} · {source.provider}
                    {source.regionNote ? ` · ${source.regionNote}` : ''}
                  </li>
                ))}
              </ul>
            </section>
            <NowNext channel={channel} />
          </div>

          <p className="text-xs text-slate-500">
            Stream not working or listed without permission?{' '}
            <a href={reportIssueUrl(channel)} target="_blank" rel="noreferrer noopener" className="text-accent-cyan hover:underline">
              Report a problem
            </a>{' '}
            ·{' '}
            <a
              href={reportIssueUrl(channel, 'copyright')}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent-cyan hover:underline"
            >
              Copyright / removal request
            </a>
          </p>
        </div>

        <RelatedList channels={related} activeId={channel.id} />
      </div>

      <ChannelRail title="Similar channels" channels={related.slice(0, 12)} />
    </div>
  );
}

export default function ChannelPage() {
  const { slug = '' } = useParams();
  return <CatalogGate>{(catalog) => <ChannelContent catalog={catalog} slug={slug} />}</CatalogGate>;
}
