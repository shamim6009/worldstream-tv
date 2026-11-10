import { ExternalLink, Youtube } from 'lucide-react';
import { safeExternal } from '../../lib/utils';

function youtubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(parsed.hostname)) return null;
    const channel = parsed.pathname.match(/\/channel\/(UC[\w-]{20,})/i)?.[1];
    if (channel) {
      return `https://www.youtube.com/embed/live_stream?channel=${channel}&autoplay=1&rel=0`;
    }
    const video =
      parsed.searchParams.get('v') ??
      parsed.pathname.match(/\/embed\/([\w-]{11})/)?.[1] ??
      parsed.pathname.match(/^\/([\w-]{11})$/)?.[1];
    if (video) {
      return `https://www.youtube.com/embed/${video}?autoplay=1&rel=0`;
    }
    return null;
  } catch {
    return null;
  }
}

export function YouTubePlayer({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbed(url);
  const external = safeExternal(url);

  if (!embed) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-ink-900 px-6 text-center">
        <Youtube className="h-10 w-10 text-rose-400" aria-hidden="true" />
        <p className="text-sm text-slate-300">
          This broadcaster controls YouTube embedding. Open the official channel to watch.
        </p>
        {external ? (
          <a
            href={external}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Open on YouTube <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-card">
      <iframe
        src={embed}
        title={`${title} live on YouTube`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        className="aspect-video w-full"
      />
    </div>
  );
}
