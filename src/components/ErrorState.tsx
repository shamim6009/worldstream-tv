import { AlertTriangle, RotateCw } from 'lucide-react';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-8 text-center">
      <div className="mx-auto mb-4 w-fit rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-300">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="font-heading text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
        {message ?? 'The catalog could not be loaded. Check your connection and try again.'}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      ) : null}
    </div>
  );
}
