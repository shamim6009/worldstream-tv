import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Info, Radio } from 'lucide-react';
import type { Channel } from '../../types/catalog';
import { playbackOrder } from '../../lib/channels';
import { cn, safeExternal, sourceTypeLabel, statusMeta } from '../../lib/utils';
import { Player } from './Player';
import type { PlaybackError } from './playerErrors';

/**
 * Plays a channel's approved sources in order. When a source fails it moves to the
 * next approved source automatically (once per source), then shows the official page.
 * It never invents a fallback: only sources listed in the catalog are tried.
 */
export function ChannelPlayer({ channel }: { channel: Channel }) {
  const sources = useMemo(() => playbackOrder(channel.sources), [channel.sources]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, PlaybackError>>({});
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);

  useEffect(() => {
    setIndex(0);
    setFailed({});
    setSwitchNotice(null);
  }, [channel.id]);

  const active = sources[index];
  const official = safeExternal(channel.officialWatchUrl);

  const handleFatal = useCallback(
    (error: PlaybackError) => {
      const current = sources[index];
      if (!current) return;
      setFailed((previous) => ({ ...previous, [current.id]: error }));
      const nextIndex = sources.findIndex(
        (source, position) => position > index && source.type !== 'provider' && !failed[source.id],
      );
      if (nextIndex !== -1) {
        setSwitchNotice(`${current.label ?? current.provider} failed. Switched to backup source ${nextIndex + 1}.`);
        setIndex(nextIndex);
      }
    },
    [failed, index, sources],
  );

  if (!active) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-ink-900 px-6 text-center">
        <Info className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p className="max-w-md text-sm text-slate-300">
          No approved playback source is currently listed for this channel.
        </p>
        {official ? (
          <a href={official} target="_blank" rel="noreferrer noopener" className="btn-primary">
            Watch on official site <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    );
  }

  const allPlayableFailed =
    sources.filter((source) => source.type !== 'provider').every((source) => failed[source.id]) &&
    Object.keys(failed).length > 0;

  return (
    <div className="space-y-3">
      <Player source={active} title={channel.name} poster={channel.logo} onFatal={handleFatal} />

      {switchNotice ? (
        <p role="status" className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-200">
          {switchNotice}
        </p>
      ) : null}

      {allPlayableFailed ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold">None of the approved sources could be played from your connection.</p>
          <p className="mt-1 text-amber-100/80">
            The broadcaster may be offline, limited to certain countries, or blocking browser playback.
            {official ? ' The official page is the most reliable way to watch.' : ''}
          </p>
          {official ? (
            <a
              href={official}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-amber-200"
            >
              Watch on {channel.provider} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}

      {sources.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Stream sources">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" /> Sources
          </span>
          {sources.map((source, position) => {
            const meta = statusMeta(source.status);
            const sourceFailed = Boolean(failed[source.id]);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  setSwitchNotice(null);
                  setFailed((previous) => {
                    const next = { ...previous };
                    delete next[source.id];
                    return next;
                  });
                  setIndex(position);
                }}
                aria-pressed={position === index}
                title={sourceFailed ? failed[source.id]?.message : meta.description}
                className={cn('chip', position === index && 'chip-active', sourceFailed && 'line-through opacity-60')}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
                {source.label ?? `Source ${position + 1}`} · {sourceTypeLabel(source.type)}
                {source.quality ? ` · ${source.quality}` : ''}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
