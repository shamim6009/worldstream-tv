import { CalendarClock } from 'lucide-react';
import { useEpg } from '../hooks/useCatalog';
import { nowAndNext, programsFor, progress } from '../lib/epg';
import { formatDate, formatTime } from '../lib/utils';
import type { Channel } from '../types/catalog';

export function NowNext({ channel, limit = 4 }: { channel: Channel; limit?: number }) {
  const { data: epg, isLoading } = useEpg();
  const programs = programsFor(epg, channel);
  const { current, upcoming } = nowAndNext(programs);

  return (
    <section className="panel p-4" aria-label="TV guide">
      <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-slate-100">
        <CalendarClock className="h-4 w-4 text-accent-cyan" aria-hidden="true" /> TV guide
      </h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Loading schedule…</p>
      ) : !current && upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Schedule unavailable.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {current ? (
            <li>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                Now · {formatTime(current.start)}–{formatTime(current.stop)}
              </p>
              <p className="text-sm font-semibold text-slate-100">{current.title}</p>
              {current.description ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{current.description}</p> : null}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-accent-cyan" style={{ width: `${Math.round(progress(current) * 100)}%` }} />
              </div>
            </li>
          ) : null}
          {upcoming.slice(0, limit).map((program) => (
            <li key={`${program.start}-${program.title}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {formatDate(program.start)} · {formatTime(program.start)}
              </p>
              <p className="text-sm text-slate-200">{program.title}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
