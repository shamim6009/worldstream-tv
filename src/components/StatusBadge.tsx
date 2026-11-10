import { cn, statusMeta } from '../lib/utils';

export function StatusBadge({
  status,
  compact = false,
  className,
}: {
  status: string;
  compact?: boolean;
  className?: string;
}) {
  const meta = statusMeta(status);
  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        meta.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}
