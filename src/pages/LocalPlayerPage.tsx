import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EmptyState } from '../components/EmptyState';
import { HlsPlayer } from '../components/player/HlsPlayer';
import { useLocalPlaylists } from '../hooks/useLocalPlaylists';
import { useSeo } from '../lib/seo';

export default function LocalPlayerPage() {
  const { id = '' } = useParams();
  const channel = useLocalPlaylists((state) => state.channels.find((entry) => entry.id === id));

  useSeo({
    title: channel ? `${channel.name} — Local playlist | WorldStream TV` : 'Local channel | WorldStream TV',
    description: 'A channel from a personal playlist stored in this browser.',
    noindex: true,
  });

  if (!channel) {
    return (
      <div className="page">
        <EmptyState
          title="Local channel not found"
          description="Local playlists live only in the browser where they were imported. Import the playlist again on this device."
          action={
            <Link to="/bangladesh-tv#isp-local" className="btn-primary">
              Import a playlist
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page space-y-5">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Favorites & playlists', to: '/favorites' }, { label: channel.name }]} />
      <div className="mx-auto max-w-5xl space-y-4">
        <HlsPlayer src={channel.url} poster={channel.logo} title={channel.name} isLocal />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-50">{channel.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {channel.group ? `${channel.group} · ` : ''}
              {channel.playlistName} · {new URL(channel.url).hostname}
            </p>
          </div>
          <Link to="/favorites#playlists" className="btn-secondary py-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All local channels
          </Link>
        </div>
        <p className="flex gap-2 rounded-xl border border-white/10 bg-ink-900/40 p-3 text-xs leading-5 text-slate-400">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" aria-hidden="true" />
          This channel comes from a playlist you imported. It is stored only in this browser, played directly from its
          source, and is not reviewed by WorldStream TV. ISP-local streams usually play only on that ISP’s network.
        </p>
      </div>
    </div>
  );
}
