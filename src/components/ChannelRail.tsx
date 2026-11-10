import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Channel } from '../types/catalog';
import { ChannelCard } from './ChannelCard';
import { CardSkeleton } from './Loading';
import { SectionHeading } from './SectionHeading';

export function ChannelRail({
  title,
  eyebrow,
  description,
  channels,
  to,
  loading = false,
  empty,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  channels: Channel[];
  to?: string;
  loading?: boolean;
  empty?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);

  function scroll(direction: 1 | -1) {
    const element = scroller.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
  }

  if (!loading && channels.length === 0 && !empty) return null;

  return (
    <section className="space-y-4" aria-label={title}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <div className="flex items-center gap-2">
            {to ? (
              <Link to={to} className="text-sm font-semibold text-accent-cyan hover:text-cyan-300">
                View all
              </Link>
            ) : null}
            {channels.length > 4 ? (
              <>
                <button
                  type="button"
                  onClick={() => scroll(-1)}
                  aria-label={`Scroll ${title} left`}
                  className="hidden rounded-full border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 sm:inline-flex"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll(1)}
                  aria-label={`Scroll ${title} right`}
                  className="hidden rounded-full border border-white/10 p-1.5 text-slate-300 transition hover:bg-white/10 sm:inline-flex"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        }
      />
      {!loading && channels.length === 0 ? (
        empty
      ) : (
        <div
          ref={scroller}
          className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[22%] xl:w-[18%]">
                  <CardSkeleton />
                </div>
              ))
            : channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[22%] xl:w-[18%]"
                />
              ))}
        </div>
      )}
    </section>
  );
}
