import { useDeferredValue, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, SlidersHorizontal, X } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { filterChannels, languageOptions, sortChannels, type SortKey } from '../lib/channels';
import { searchChannels } from '../lib/search';
import { cn, statusMeta } from '../lib/utils';
import type { Catalog, Channel } from '../types/catalog';
import { ChannelGrid } from './ChannelGrid';
import { EmptyState } from './EmptyState';
import { SearchBox } from './SearchBox';

const STATUS_FILTERS = ['available', 'verified', 'recently-available', 'unknown', 'temporarily-unavailable', 'playback-restricted', 'geo-restricted'];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'status', label: 'Availability' },
  { value: 'recent', label: 'Recently added' },
];

export function ChannelDirectory({
  catalog,
  channels,
  hide = [],
}: {
  catalog: Catalog;
  channels: Channel[];
  hide?: Array<'country' | 'category' | 'language'>;
}) {
  const [params, setParams] = useSearchParams();
  const favoriteIds = useFavorites((state) => state.ids);

  const query = params.get('q') ?? '';
  const country = params.get('country');
  const language = params.get('language');
  const category = params.get('category');
  const status = params.get('status');
  const sort = (params.get('sort') as SortKey | null) ?? 'name-asc';
  const favoritesOnly = params.get('favorites') === '1';
  const deferredQuery = useDeferredValue(query);

  function update(key: string, value: string | null) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  const results = useMemo(() => {
    const filtered = filterChannels(channels, {
      country,
      language,
      category,
      status,
      favoritesOnly,
      favoriteIds,
    });
    return deferredQuery ? searchChannels(filtered, deferredQuery) : sortChannels(filtered, sort);
  }, [channels, country, language, category, status, favoritesOnly, favoriteIds, deferredQuery, sort]);

  const languages = useMemo(() => languageOptions(channels), [channels]);
  const countries = useMemo(() => {
    const codes = new Set(channels.map((channel) => channel.country));
    return catalog.countries.filter((entry) => codes.has(entry.code));
  }, [catalog.countries, channels]);
  const categories = useMemo(() => {
    const ids = new Set(channels.flatMap((channel) => channel.categories));
    return catalog.categories.filter((entry) => ids.has(entry.id));
  }, [catalog.categories, channels]);

  const activeFilters = [country, language, category, status, favoritesOnly ? '1' : null, query].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="panel space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox
            value={query}
            onChange={(value) => update('q', value || null)}
            placeholder="Filter by channel, provider, language…"
            className="lg:flex-1"
          />
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => update('sort', event.target.value === 'name-asc' ? null : event.target.value)}
              className="field w-auto"
              disabled={Boolean(query)}
              title={query ? 'Search results are sorted by relevance' : 'Sort'}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => update('favorites', favoritesOnly ? null : '1')}
              aria-pressed={favoritesOnly}
              className={cn('chip h-[38px]', favoritesOnly && 'chip-active')}
            >
              <Heart className={cn('h-3.5 w-3.5', favoritesOnly && 'fill-current')} aria-hidden="true" />
              Favorites
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <span className="col-span-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:hidden">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Filters
          </span>
          {!hide.includes('country') ? (
            <select
              aria-label="Country"
              value={country ?? ''}
              onChange={(event) => update('country', event.target.value || null)}
              className="field"
            >
              <option value="">All countries</option>
              {countries.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.flag} {entry.name}
                </option>
              ))}
            </select>
          ) : null}
          {!hide.includes('language') ? (
            <select
              aria-label="Language"
              value={language ?? ''}
              onChange={(event) => update('language', event.target.value || null)}
              className="field"
            >
              <option value="">All languages</option>
              {languages.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name} ({entry.count})
                </option>
              ))}
            </select>
          ) : null}
          {!hide.includes('category') ? (
            <select
              aria-label="Category"
              value={category ?? ''}
              onChange={(event) => update('category', event.target.value || null)}
              className="field"
            >
              <option value="">All categories</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          ) : null}
          <select
            aria-label="Stream status"
            value={status ?? ''}
            onChange={(event) => update('status', event.target.value || null)}
            className="field"
          >
            <option value="">Any status</option>
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === 'available' ? 'Available now (verified or recent)' : statusMeta(value).label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
        <p aria-live="polite">
          <span className="font-semibold text-slate-200">{results.length}</span> of {channels.length} channels
        </p>
        {activeFilters > 0 ? (
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-cyan hover:text-cyan-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
          </button>
        ) : null}
      </div>

      {results.length ? (
        <ChannelGrid channels={results} />
      ) : (
        <EmptyState
          title="No channels match these filters"
          description={
            status && status !== 'unknown'
              ? 'No channel currently has this status. Statuses update after each scheduled stream check.'
              : 'Try a different search or clear some filters.'
          }
          action={
            <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}
