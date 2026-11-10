import type { StreamSource } from '../../types/catalog';
import { HlsPlayer } from './HlsPlayer';
import type { PlaybackError } from './playerErrors';
import { ProviderPlayer } from './ProviderPlayer';
import { YouTubePlayer } from './YouTubePlayer';

export function Player({
  source,
  title,
  poster,
  onFatal,
}: {
  source: StreamSource;
  title: string;
  poster?: string | null;
  onFatal?: (error: PlaybackError) => void;
}) {
  if (source.type === 'youtube') {
    return <YouTubePlayer url={source.url} title={title} />;
  }
  if (source.type === 'provider') {
    return <ProviderPlayer url={source.url} provider={source.provider} note={source.authorizationNote} />;
  }
  return <HlsPlayer key={source.id} src={source.url} poster={poster} title={title} onFatal={onFatal} />;
}
