import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Info } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { Logo } from '../components/Logo';
import { PageHeader } from '../components/PageHeader';
import { useEpg } from '../hooks/useCatalog';
import { programsFor, programsOnDay } from '../lib/epg';
import { useSeo } from '../lib/seo';
import { cn, formatDate, formatRelative, formatTime, isNow } from '../lib/utils';
import type { Catalog, EpgProgram } from '../types/catalog';

function startOfDay(offset: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

const HOUR_WIDTH = 180;

function Timeline({ programs, day }: { programs: EpgProgram[]; day: Date }) {
  const from = day.getTime();
  return (
    <div className="relative h-14" style={{ width: HOUR_WIDTH * 24 }}>
      {programs.map((program) => {
        const start = Math.max(Date.parse(program.start), from);
        const stop = Math.min(Date.parse(program.stop), from + 86_400_000);
        const left = ((start - from) / 3_600_000) * HOUR_WIDTH;
        const width = Math.max(((stop - start) / 3_600_000) * HOUR_WIDTH - 4, 24);
        const live = isNow(program.start, program.stop);
        return (
          <div
            key={`${program.start}-${program.title}`}
            title={`${formatTime(program.start)}–${formatTime(program.stop)} ${program.title}${program.description ? `\n${program.description}` : ''}`}
            className={cn(
              'absolute top-1 h-12 overflow-hidden rounded-lg border px-2 py-1 text-xs',
              live ? 'border-accent-cyan/50 bg-accent-cyan/15 text-slate-50' : 'border-white/10 bg-ink-800 text-slate-300',
            )}
            style={{ left, width }}
          >
            <p className="truncate font-semibold">{program.title}</p>
            <p className="truncate text-[10px] text-slate-500">{formatTime(program.start)}</p>
          </div>
        );
      })}
    </div>
  );
}

function GuideContent({ catalog }: { catalog: Catalog }) {
  const { data: epg, isLoading } = useEpg();
  const [dayOffset, setDayOffset] = useState(0);
  const [country, setCountry] = useState('');
  const [onlyWithGuide, setOnlyWithGuide] = useState(false);
  const day = useMemo(() => startOfDay(dayOffset), [dayOffset]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useSeo({
    title: 'TV Guide — Verified Schedules | WorldStream TV',
    description: 'Programme schedules from authorized XMLTV feeds in your local time. Channels without guide data show "Schedule unavailable".',
    path: 'guide',
  });

  const rows = useMemo(() => {
    return catalog.channels
      .filter((channel) => !country || channel.country === country)
      .map((channel) => ({ channel, programs: programsOnDay(programsFor(epg, channel), day) }))
      .filter((row) => !onlyWithGuide || row.programs.length > 0)
      .sort((a, b) => Number(b.programs.length > 0) - Number(a.programs.length > 0) || a.channel.name.localeCompare(b.channel.name));
  }, [catalog.channels, country, day, epg, onlyWithGuide]);

  const withGuide = rows.filter((row) => row.programs.length > 0).length;
  const hasAnyGuide = epg ? Object.values(epg.channels).some((list) => list.length > 0) : false;

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'TV Guide' }]} />
      <PageHeader
        eyebrow="Electronic programme guide"
        title="TV Guide"
        description={`Schedules from authorized XMLTV feeds, shown in your timezone (${timezone}). We never invent programme listings.`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((offset) => (
          <button
            key={offset}
            type="button"
            onClick={() => setDayOffset(offset)}
            aria-pressed={dayOffset === offset}
            className={cn('chip', dayOffset === offset && 'chip-active')}
          >
            {offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatDate(startOfDay(offset).toISOString())}
          </button>
        ))}
        <select aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)} className="field ml-auto w-auto">
          <option value="">All countries</option>
          {catalog.countries.filter((entry) => entry.channelCount > 0).map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.flag} {entry.name}
            </option>
          ))}
        </select>
        <label className="chip cursor-pointer">
          <input type="checkbox" checked={onlyWithGuide} onChange={(event) => setOnlyWithGuide(event.target.checked)} />
          With schedule only
        </label>
      </div>

      {!isLoading && !hasAnyGuide ? (
        <div className="flex gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            No guide data is loaded yet{epg?.generatedAt ? ` (last sync ${formatRelative(epg.generatedAt)})` : ''}. Schedules
            appear after the maintainers run <code>npm run sync:epg</code> against allowlisted XMLTV feeds. Until then every
            channel shows “Schedule unavailable”.
          </p>
        </div>
      ) : null}

      <p className="text-sm text-slate-400">
        {withGuide} of {rows.length} channels have schedule data for {formatDate(day.toISOString())}.
      </p>

      <div className="panel overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <div className="min-w-max">
            {withGuide > 0 ? (
              <div className="sticky top-0 flex border-b border-white/5 bg-ink-900">
                <div className="w-56 shrink-0 px-4 py-2 text-xs font-semibold text-slate-500">
                  <CalendarClock className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Channel
                </div>
                <div className="flex">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="border-l border-white/5 px-2 py-2 text-xs text-slate-500" style={{ width: HOUR_WIDTH }}>
                      {formatTime(new Date(day.getTime() + hour * 3_600_000).toISOString())}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <ul className="divide-y divide-white/5">
              {rows.slice(0, 200).map(({ channel, programs }) => (
                <li key={channel.id} className="flex items-center">
                  <Link
                    to={`/channel/${channel.slug}`}
                    className="sticky left-0 z-10 flex w-56 shrink-0 items-center gap-2.5 bg-ink-900 px-4 py-2 hover:bg-ink-850"
                  >
                    <Logo name={channel.name} logo={channel.logo} className="h-9 w-12 shrink-0" imgClassName="p-1" />
                    <span className="truncate text-sm font-semibold text-slate-100">{channel.name}</span>
                  </Link>
                  {programs.length ? (
                    <Timeline programs={programs} day={day} />
                  ) : (
                    <p className="px-4 text-sm text-slate-500">Schedule unavailable.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return <CatalogGate>{(catalog) => <GuideContent catalog={catalog} />}</CatalogGate>;
}
