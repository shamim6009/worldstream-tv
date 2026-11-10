import { Heart } from 'lucide-react';
import { useFavorites, useIsFavorite } from '../hooks/useFavorites';
import { cn } from '../lib/utils';

export function FavoriteButton({
  channelId,
  channelName,
  className,
  showLabel = false,
}: {
  channelId: string;
  channelName: string;
  className?: string;
  showLabel?: boolean;
}) {
  const favorite = useIsFavorite(channelId);
  const toggle = useFavorites((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(channelId);
      }}
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${channelName} from favorites` : `Add ${channelName} to favorites`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border p-2 text-sm font-semibold backdrop-blur transition',
        favorite
          ? 'border-rose-400/40 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
          : 'border-white/15 bg-ink-950/60 text-slate-200 hover:border-white/30 hover:bg-ink-800',
        showLabel && 'px-3',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4', favorite && 'fill-current')}
        aria-hidden="true"
      />
      {showLabel ? <span>{favorite ? 'Saved' : 'Save'}</span> : null}
    </button>
  );
}
