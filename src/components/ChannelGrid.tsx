import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type { Channel } from '../types/catalog';
import { ChannelCard } from './ChannelCard';

function columnsFor(width: number): number {
  if (width >= 1200) return 5;
  if (width >= 960) return 4;
  if (width >= 600) return 3;
  return 2;
}

const GAP = 12;
/** Below this size the grid renders normally; virtualization only pays off for long lists. */
const VIRTUALIZE_AFTER = 60;

/**
 * Responsive channel grid. Long lists are virtualized by row against the window
 * scroll so thousands of imported channels stay fast on low-end phones.
 */
export function ChannelGrid({ channels }: { channels: Channel[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1200);
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      setWidth(element.clientWidth);
      setOffset(element.getBoundingClientRect().top + window.scrollY);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const columns = columnsFor(width);
  const rows = Math.ceil(channels.length / columns);
  const virtualize = channels.length > VIRTUALIZE_AFTER;
  const cardWidth = (width - GAP * (columns - 1)) / columns;
  // 16:9 artwork + ~84px text block + row gap.
  const estimate = Math.round((cardWidth * 9) / 16 + 84 + GAP);

  const virtualizer = useWindowVirtualizer({
    count: virtualize ? rows : 0,
    estimateSize: () => estimate,
    overscan: 4,
    scrollMargin: offset,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [estimate, columns, virtualizer]);

  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: `${GAP}px` };

  if (!virtualize) {
    return (
      <div ref={containerRef} className="grid" style={gridStyle} data-testid="channel-grid">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} data-testid="channel-grid">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="grid"
            style={{
              ...gridStyle,
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              paddingBottom: GAP,
              transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {channels.slice(row.index * columns, row.index * columns + columns).map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
