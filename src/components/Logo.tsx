import { useState } from 'react';
import { cn, initials } from '../lib/utils';

export function Logo({
  name,
  logo,
  className,
  imgClassName,
}: {
  name: string;
  logo?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logo) && !failed;

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-700/80 to-ink-850 text-slate-100',
        className,
      )}
    >
      {showImage ? (
        <img
          src={logo ?? ''}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-contain p-2', imgClassName)}
        />
      ) : (
        <span className="select-none font-heading text-sm font-bold tracking-wide text-slate-300">
          {initials(name)}
        </span>
      )}
    </div>
  );
}
