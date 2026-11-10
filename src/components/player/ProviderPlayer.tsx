import { ExternalLink, ShieldCheck } from 'lucide-react';
import { safeExternal } from '../../lib/utils';

export function ProviderPlayer({
  url,
  provider,
  note,
}: {
  url: string;
  provider: string;
  note?: string | null;
}) {
  const external = safeExternal(url);

  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-hero-grid px-6 text-center shadow-card">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300">
        <ShieldCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-lg font-semibold text-slate-100">Watch on {provider}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          {note ??
            'Playback happens on the official provider page. WorldStream TV does not proxy or re-stream this channel.'}
        </p>
      </div>
      {external ? (
        <a
          href={external}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          Open official page <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : (
        <p className="text-sm text-rose-300">The provider link is invalid.</p>
      )}
    </div>
  );
}
