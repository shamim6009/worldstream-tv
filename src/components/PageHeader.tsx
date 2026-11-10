import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('relative overflow-hidden rounded-3xl border border-white/10 bg-hero-grid p-6 sm:p-8', className)}>
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-slate-50 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
          ) : null}
          {children}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
