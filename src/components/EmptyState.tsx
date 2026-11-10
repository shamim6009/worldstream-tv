import type { ReactNode } from 'react';
import { Tv } from 'lucide-react';
import { cn } from '../lib/utils';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-ink-900/40 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 rounded-2xl border border-white/10 bg-ink-800/80 p-3 text-slate-300">
        {icon ?? <Tv className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h2 className="font-heading text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
