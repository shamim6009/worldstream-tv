import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ExternalLink, Timer, Trophy } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { ChannelGrid } from '../components/ChannelGrid';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { SectionHeading } from '../components/SectionHeading';
import { OFFICIAL_SPORTS_DESTINATIONS, SPORT_CATEGORIES, sportName } from '../data/reference';
import { useSportsEvents } from '../hooks/useCatalog';
import { searchChannels } from '../lib/search';
import { useSeo } from '../lib/seo';
import { cn, countdown, formatDate, formatTime, normalizeText, safeExternal } from '../lib/utils';
import type { Catalog, SportsEvent } from '../types/catalog';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function EventCard({ event, now, catalog }: { event: SportsEvent; now: number; catalog: Catalog }) {
  const start = Date.parse(event.startTime);
  const end = Date.parse(event.endTime);
  const live = now >= start && now < end;
  const watch = safeExternal(event.watchUrl);
  const channels = catalog.channels.filter((channel) => event.channelIds.includes(channel.id));

  return (
    <article className={cn('panel flex flex-col gap-3 p-4', live && 'border-rose-400/40')}>
      <div className="flex items-center justify-between gap-2">
        <span className="chip py-1">
          {SPORT_CATEGORIES.find((sport) => sport.id === event.sport)?.emoji ?? '🏅'} {sportName(event.sport)}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" /> Live now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" /> {countdown(start - now)}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-heading text-base font-semibold text-slate-100">{event.title}</h3>
        <p className="text-xs text-slate-400">{event.competition}</p>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-slate-300">
        <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
        {formatDate(event.startTime)} · {formatTime(event.startTime)}–{formatTime(event.endTime)}
        <span className="text-xs text-slate-500">(your time)</span>
      </p>
      <p className="text-xs text-slate-500">
        {event.provider} · Available in: {event.region}
        {event.note ? ` · ${event.note}` : ''}
      </p>
      {channels.length ? (
        <div className="flex flex-wrap gap-1.5">
          {channels.map((channel) => (
            <Link key={channel.id} to={`/channel/${channel.slug}`} className="chip py-1">
              {channel.name}
            </Link>
          ))}
        </div>
      ) : null}
      {watch ? (
        <a href={watch} target="_blank" rel="noreferrer noopener" className="btn-primary mt-auto py-2">
          Official Watch Live <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}

function SportsContent({ catalog, sport }: { catalog: Catalog; sport: string | null }) {
  const navigate = useNavigate();
  const { data: eventsData } = useSportsEvents();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const now = useNow();
  const activeSport = sport && SPORT_CATEGORIES.some((entry) => entry.id === sport) ? sport : null;

  useSeo({
    title: activeSport
      ? `${sportName(activeSport)} — Free Live Sports | WorldStream TV`
      : 'Free Live Sports — Authorized Streams | WorldStream TV',
    description:
      'Authorized free sports channels, official tournament streams and verified event listings shown in your local time.',
    path: activeSport ? `sports/${activeSport}` : 'sports',
  });

  const sportsChannels = useMemo(
    () => catalog.channels.filter((channel) => channel.categories.includes('sports') || (channel.sports?.length ?? 0) > 0),
    [catalog.channels],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const channel of sportsChannels) for (const id of channel.sports ?? []) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
  }, [sportsChannels]);

  const filtered = useMemo(() => {
    let list = sportsChannels;
    if (activeSport) list = list.filter((channel) => (channel.sports ?? []).includes(activeSport));
    if (country) list = list.filter((channel) => channel.country === country);
    return query ? searchChannels(list, query) : list;
  }, [sportsChannels, activeSport, country, query]);

  const events = useMemo(() => {
    const needle = normalizeText(query);
    return (eventsData?.events ?? [])
      .filter((event) => Date.parse(event.endTime) > now)
      .filter((event) => !activeSport || event.sport === activeSport)
      .filter(
        (event) =>
          !needle || normalizeText(`${event.title} ${event.competition} ${event.provider}`).includes(needle),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    // `now` ticks every second; events only need re-filtering each minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsData, activeSport, query, Math.floor(now / 60_000)]);

  const liveEvents = events.filter((event) => Date.parse(event.startTime) <= now);
  const upcoming = events.filter((event) => Date.parse(event.startTime) > now);
  const tournaments = [...new Set(events.map((event) => event.competition))].sort();
  const countryOptions = catalog.countries.filter((entry) => sportsChannels.some((channel) => channel.country === entry.code));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="page space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Sports', to: activeSport ? '/sports' : undefined },
          ...(activeSport ? [{ label: sportName(activeSport) }] : []),
        ]}
      />
      <PageHeader
        eyebrow="Live sports"
        title={activeSport ? sportName(activeSport) : 'Free Live Sports'}
        description="Free sports channels from official broadcasters and FAST providers, plus verified event listings. Paid tournament rights are never listed as free."
      >
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="Search team, event or channel…" className="sm:flex-1" />
          <select aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)} className="field sm:w-56">
            <option value="">All countries</option>
            {countryOptions.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.flag} {entry.name}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <nav aria-label="Sport categories" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => navigate('/sports')} className={cn('chip', !activeSport && 'chip-active')}>
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> All sports
          <span className="text-slate-500">{sportsChannels.length}</span>
        </button>
        {SPORT_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => navigate(`/sports/${entry.id}`)}
            aria-pressed={activeSport === entry.id}
            className={cn('chip', activeSport === entry.id && 'chip-active')}
          >
            <span aria-hidden="true">{entry.emoji}</span> {entry.name}
            <span className="text-slate-500">{counts.get(entry.id) ?? 0}</span>
          </button>
        ))}
      </nav>

      <section className="space-y-4" aria-label="Events">
        <SectionHeading
          title={liveEvents.length ? 'Live now & upcoming' : 'Upcoming matches'}
          description={`Times are shown in your timezone (${timezone}).`}
        />
        {tournaments.length ? (
          <div className="flex flex-wrap gap-2">
            {tournaments.map((name) => (
              <button key={name} type="button" onClick={() => setQuery(name)} className="chip">
                {name}
              </button>
            ))}
          </div>
        ) : null}
        {events.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...liveEvents, ...upcoming].map((event) => (
              <EventCard key={event.id} event={event} now={now} catalog={catalog} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
            title="No verified events listed"
            description="We only list events confirmed from an official broadcaster or licensed data source, and never generate fixtures. Check the official sports destinations below for today’s free streams."
          />
        )}
      </section>

      <section className="space-y-4" aria-label="Sports channels">
        <SectionHeading
          title="Sports channels"
          description={`${filtered.length} authorized free channel${filtered.length === 1 ? '' : 's'}${activeSport ? ` for ${sportName(activeSport)}` : ''}.`}
        />
        {filtered.length ? (
          <ChannelGrid channels={filtered} />
        ) : (
          <EmptyState
            title="No approved channels yet"
            description="No free, authorized channel for this sport is in the catalog yet. Try the official destinations below."
          />
        )}
      </section>

      <section className="space-y-4" aria-label="Official sports destinations">
        <SectionHeading
          title="Official free sports destinations"
          description="These services publish free live sport on their own sites. Playback opens on the provider’s page."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_SPORTS_DESTINATIONS.map((destination) => (
            <a
              key={destination.url}
              href={destination.url}
              target="_blank"
              rel="noreferrer noopener"
              className="panel group flex flex-col gap-2 p-4 transition hover:border-white/25"
            >
              <span className="flex items-center justify-between font-heading text-base font-semibold text-slate-100">
                {destination.name}
                <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-slate-200" aria-hidden="true" />
              </span>
              <span className="text-sm leading-6 text-slate-400">{destination.description}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SportsPage() {
  const { sport = null } = useParams();
  return <CatalogGate>{(catalog) => <SportsContent catalog={catalog} sport={sport} />}</CatalogGate>;
}
