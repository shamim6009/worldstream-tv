import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { LocalPlaylistManager } from '../components/LocalPlaylistManager';
import { Logo } from '../components/Logo';
import { NowNext } from '../components/NowNext';
import { SearchBox } from '../components/SearchBox';
import { StatusBadge } from '../components/StatusBadge';
import { ChannelPlayer } from '../components/player/ChannelPlayer';
import { BD_CATEGORIES, BD_STRINGS } from '../data/reference';
import { useLocalPlaylists } from '../hooks/useLocalPlaylists';
import { useRecent } from '../hooks/useRecent';
import { sortChannels, statusRank } from '../lib/channels';
import { searchChannels } from '../lib/search';
import { useSeo } from '../lib/seo';
import { cn, statusMeta } from '../lib/utils';
import { usePreferences } from '../stores/preferences';
import type { Catalog } from '../types/catalog';

function BangladeshContent({ catalog }: { catalog: Catalog }) {
  const lang = usePreferences((state) => state.bangladeshUiLanguage);
  const setLang = usePreferences((state) => state.setBangladeshUiLanguage);
  const t = BD_STRINGS[lang];
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const category = params.get('category');
  const record = useRecent((state) => state.record);
  const localCount = useLocalPlaylists((state) => state.channels.length);

  useSeo({
    title: 'Bangladesh Live TV — Free Official Bangladeshi Channels | WorldStream TV',
    description:
      'Watch Bangladeshi news, entertainment, sports, music and religious channels from official broadcaster sources. Import your own ISP/BDIX playlist privately.',
    path: 'bangladesh-tv',
  });

  const all = useMemo(
    () =>
      sortChannels(
        catalog.channels.filter((channel) => channel.country === 'BD'),
        'name-asc',
      ).sort((a, b) => statusRank(a.status) - statusRank(b.status)),
    [catalog.channels],
  );

  const list = useMemo(() => {
    const definition = BD_CATEGORIES.find((entry) => entry.id === category);
    const filtered = definition ? all.filter((channel) => definition.match(channel.categories)) : all;
    return query ? searchChannels(filtered, query) : filtered;
  }, [all, category, query]);

  const selectedSlug = params.get('channel');
  const selected = all.find((channel) => channel.slug === selectedSlug) ?? list[0] ?? all[0];

  useEffect(() => {
    if (selected && selectedSlug) record(selected.id);
  }, [record, selected, selectedSlug]);

  function select(slug: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('channel', slug);
        return next;
      },
      { replace: true },
    );
  }

  function step(direction: 1 | -1) {
    if (!selected || list.length === 0) return;
    const index = list.findIndex((channel) => channel.id === selected.id);
    const next = list[(index + direction + list.length) % list.length];
    if (next) select(next.slug);
  }

  // Fast channel switching: PageUp/PageDown or [ / ].
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'PageDown' || event.key === ']') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'PageUp' || event.key === '[') {
        event.preventDefault();
        step(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className="page space-y-6" lang={lang === 'bn' ? 'bn' : 'en'}>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Bangladesh TV' }]} />

      <header className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-900/40 via-ink-900 to-ink-950 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-rose-600/25 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">🇧🇩 {t.eyebrow}</p>
            <h1 className="font-heading text-3xl font-extrabold text-slate-50 sm:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{t.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <div role="group" aria-label="Interface language" className="flex rounded-full border border-white/10 p-0.5">
              {(['en', 'bn'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition',
                    lang === code ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white',
                  )}
                >
                  {code === 'en' ? 'English' : 'বাংলা'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Bangladesh categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => setParams({}, { replace: true })}
          className={cn('chip', !category && 'chip-active')}
        >
          {t.all} <span className="text-slate-500">{all.length}</span>
        </button>
        {BD_CATEGORIES.map((entry) => {
          const count = all.filter((channel) => entry.match(channel.categories)).length;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={count === 0}
              title={count === 0 ? t.noChannels : undefined}
              onClick={() => setParams({ category: entry.id }, { replace: true })}
              className={cn('chip disabled:cursor-not-allowed disabled:opacity-40', category === entry.id && 'chip-active')}
            >
              {lang === 'bn' ? entry.bn : entry.en} <span className="text-slate-500">{count}</span>
            </button>
          );
        })}
        <a href="#isp-local" className="chip">
          {lang === 'bn' ? 'আইএসপি-লোকাল' : 'Authorized ISP-Local TV'} <span className="text-slate-500">{localCount}</span>
        </a>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {selected ? (
            <>
              <ChannelPlayer channel={selected} />
              <div className="flex flex-wrap items-center gap-3">
                <Logo name={selected.name} logo={selected.logo} className="h-12 w-16 shrink-0 border border-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">{t.nowWatching}</p>
                  <h2 className="flex flex-wrap items-center gap-2 font-heading text-xl font-bold text-slate-50">
                    {selected.name} <StatusBadge status={selected.status} compact />
                  </h2>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => step(-1)} className="btn-secondary px-3 py-2" aria-label="Previous channel ([)">
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => step(1)} className="btn-secondary px-3 py-2" aria-label="Next channel (])">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <Link to={`/channel/${selected.slug}`} className="btn-secondary py-2">
                    {lang === 'bn' ? 'বিস্তারিত' : 'Details'}
                  </Link>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-400">{selected.description}</p>
              <NowNext channel={selected} limit={3} />
            </>
          ) : (
            <p className="panel p-6 text-sm text-slate-400">{t.pick}</p>
          )}
        </div>

        <aside className="panel flex max-h-[80vh] flex-col overflow-hidden" aria-label="Bangladesh channel list">
          <div className="border-b border-white/5 p-3">
            <SearchBox value={query} onChange={setQuery} placeholder={t.search} />
            <p className="mt-2 text-[11px] text-slate-500">
              {list.length} {t.channels} · <kbd className="rounded bg-white/10 px-1">[</kbd>{' '}
              <kbd className="rounded bg-white/10 px-1">]</kbd> {lang === 'bn' ? 'চ্যানেল বদল' : 'to switch'}
            </p>
          </div>
          <ul className="scrollbar-thin flex-1 overflow-y-auto p-1.5">
            {list.map((channel, index) => (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => select(channel.slug)}
                  aria-current={selected?.id === channel.id ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/5',
                    selected?.id === channel.id && 'bg-emerald-500/15 ring-1 ring-emerald-400/30',
                  )}
                >
                  <span className="w-5 text-right text-[11px] font-semibold text-slate-500">{index + 1}</span>
                  <Logo name={channel.name} logo={channel.logo} className="h-9 w-12 shrink-0" imgClassName="p-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">{channel.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {channel.categories.join(' · ')} · {channel.sources[0]?.type === 'youtube' ? 'YouTube' : 'HLS'}
                    </span>
                  </span>
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', statusMeta(channel.status).dot)} title={statusMeta(channel.status).label} />
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-3 py-6 text-sm text-slate-500">{t.noChannels}</li> : null}
          </ul>
        </aside>
      </div>

      <section id="isp-local" className="panel scroll-mt-24 space-y-4 p-5 sm:p-6" aria-label={t.localTitle}>
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-100">{t.localTitle}</h2>
          <p className="mt-1 text-sm text-slate-400">{t.localDescription}</p>
        </div>
        <LocalPlaylistManager />
      </section>
    </div>
  );
}

export default function BangladeshPage() {
  return <CatalogGate>{(catalog) => <BangladeshContent catalog={catalog} />}</CatalogGate>;
}
