import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { Channel } from '../types/catalog';
import { cn, qualityLabel, sourceTypeLabel } from '../lib/utils';
import { FavoriteButton } from './FavoriteButton';
import { Logo } from './Logo';
import { StatusBadge } from './StatusBadge';

function categoryLabel(category: string): string {
  return category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ChannelCard({ channel, className }: { channel: Channel; className?: string }) {
  const primary = channel.sources.find((source) => source.isPrimary) ?? channel.sources[0];

  return (
    <article className={cn('group relative', className)}>
      <Link
        to={`/channel/${channel.slug}`}
        className="block h-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft/50 hover:bg-ink-850 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ink-800 via-ink-850 to-ink-950">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(6,182,212,0.18), transparent 40%)',
            }}
          />
          <Logo
            name={channel.name}
            logo={channel.logo}
            className="absolute inset-0 m-auto h-20 w-32 !bg-transparent"
            imgClassName="p-1"
          />
          <div className="absolute left-2 top-2">
            <StatusBadge status={channel.status} compact />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-ink-950/90 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-medium text-slate-300">
            <span className="truncate">
              {channel.countryName} · {channel.languageName}
            </span>
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {qualityLabel(channel.quality)}
            </span>
          </div>
        </div>
        <div className="space-y-1 p-3.5">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 flex-1 truncate font-heading text-sm font-semibold text-slate-50">
              {channel.name}
            </h3>
            {channel.featured ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-label="Featured" />
            ) : null}
          </div>
          <p className="truncate text-xs text-slate-400">
            {channel.categories.slice(0, 2).map(categoryLabel).join(' · ')}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {channel.provider} · {sourceTypeLabel(primary?.type ?? 'hls')}
          </p>
        </div>
      </Link>
      <FavoriteButton
        channelId={channel.id}
        channelName={channel.name}
        className="absolute right-2 top-2 z-10 p-1.5"
      />
    </article>
  );
}
