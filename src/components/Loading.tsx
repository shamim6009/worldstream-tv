import { cn } from '../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-slate-100',
        className,
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60">
      <div className="aspect-[16/9] animate-pulse bg-ink-800" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-ink-700" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-ink-800" />
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-ink-800" />
      </div>
    </div>
  );
}

export function ChannelGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function PageLoading({ label = 'Loading channels…' }: { label?: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-ink-800 sm:w-1/2" />
        <div className="h-4 w-full animate-pulse rounded bg-ink-900 sm:w-3/4" />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Spinner />
        {label}
      </div>
      <ChannelGridSkeleton />
    </div>
  );
}
