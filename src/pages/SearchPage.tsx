import { useDeferredValue, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Search, X } from 'lucide-react';
import { CatalogGate } from '../components/CatalogGate';
import { CategoryIcon } from '../components/CategoryIcon';
import { ChannelGrid } from '../components/ChannelGrid';
import { EmptyState } from '../components/EmptyState';
import { Highlight } from '../components/Highlight';
import { Logo } from '../components/Logo';
import { SPORT_CATEGORIES } from '../data/reference';
import { categoryLabel } from '../lib/channels';
import { searchChannels } from '../lib/search';
import { useSeo } from '../lib/seo';
import { cn, normalizeText } from '../lib/utils';
import { useSearchHistory } from '../stores/searchHistory';
import type { Catalog } from '../types/catalog';

function SearchContent({ catalog }: { catalog: Catalog }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const deferred = useDeferredValue(input);
  const history = useSearchHistory((state) => state.queries);
  const addHistory = useSearchHistory((state) => state.add);
  const removeHistory = useSearchHistory((state) => state.remove);
  const clearHistory = useSearchHistory((state) => state.clear);
  const committed = params.get('q') ?? '';

  useSeo({
    title: committed ? `“${committed}” — Search | WorldStream TV` : 'Search channels | WorldStream TV',
    description: 'Search authorized free live TV channels by name, country, language, category, sport or broadcaster.',
    path: 'search',
    noindex: true,
  });

  useEffect(() => {
    setInput(committed);
  }, [committed]);

  const suggestions = useMemo(() => (deferred.trim() ? searchChannels(catalog.channels, deferred).slice(0, 8) : []), [catalog.channels, deferred]);
  const results = useMemo(() => (committed.trim() ? searchChannels(catalog.channels, committed) : []), [catalog.channels, committed]);

  const matchingCountries = useMemo(() => {
    const needle = normalizeText(committed);
    if (!needle) return [];
    return catalog.countries.filter((country) => country.channelCount > 0 && normalizeText(country.name).includes(needle)).slice(0, 6);
  }, [catalog.countries, committed]);

  function commit(value: string) {
    const trimmed = value.trim();
    setOpen(false);
    setActive(-1);
    if (!trimmed) {
      setParams({}, { replace: true });
      return;
    }
    addHistory(trimmed);
    setParams({ q: trimmed }, { replace: false });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((value) => (value + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((value) => (value <= 0 ? suggestions.length - 1 : value - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const channel = suggestions[active];
      if (channel) {
        addHistory(input);
        navigate(`/channel/${channel.slug}`);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const popularCategories = catalog.categories.filter((category) => category.channelCount > 0).slice(0, 10);

  return (
    <div className="page space-y-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-center font-heading text-3xl font-extrabold text-slate-50">Search channels</h1>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            commit(input);
          }}
          className="relative"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900 px-4 py-3 focus-within:border-accent-soft/60 focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              id="global-search"
              type="search"
              value={input}
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="search-suggestions"
              aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
              aria-label="Search channels, countries, languages, categories, sports or broadcasters"
              placeholder="Channel, country, language, sport, broadcaster…"
              onChange={(event) => {
                setInput(event.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
            />
            <kbd className="hidden rounded border border-white/10 px-1.5 text-[11px] text-slate-500 sm:inline">/</kbd>
          </div>
          {open && suggestions.length > 0 ? (
            <ul
              id="search-suggestions"
              role="listbox"
              className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-card"
            >
              {suggestions.map((channel, index) => (
                <li key={channel.id} id={`suggestion-${index}`} role="option" aria-selected={active === index}>
                  <Link
                    to={`/channel/${channel.slug}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addHistory(input)}
                    className={cn('flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/5', active === index && 'bg-white/10')}
                  >
                    <Logo name={channel.name} logo={channel.logo} className="h-8 w-11 shrink-0" imgClassName="p-1" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-100">
                        <Highlight text={channel.name} query={deferred} />
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {channel.countryName} · {channel.languageName} · {channel.categories.map(categoryLabel).join(', ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        {!committed && history.length ? (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Recent searches</span>
              <button type="button" onClick={clearHistory} className="normal-case tracking-normal text-accent-cyan hover:underline">
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((query) => (
                <span key={query} className="chip pr-1.5">
                  <button type="button" onClick={() => commit(query)} className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {query}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHistory(query)}
                    aria-label={`Remove ${query} from history`}
                    className="rounded-full p-0.5 text-slate-500 hover:text-slate-200"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {committed ? (
        <section className="space-y-4" aria-label="Search results">
          <p className="text-sm text-slate-400" aria-live="polite">
            <span className="font-semibold text-slate-200">{results.length}</span> channel{results.length === 1 ? '' : 's'} for “
            {committed}”
          </p>
          {matchingCountries.length ? (
            <div className="flex flex-wrap gap-2">
              {matchingCountries.map((country) => (
                <Link key={country.code} to={`/country/${country.slug}`} className="chip">
                  {country.flag} {country.name} <span className="text-slate-500">{country.channelCount}</span>
                </Link>
              ))}
            </div>
          ) : null}
          {results.length ? (
            <ChannelGrid channels={results} />
          ) : (
            <EmptyState
              title="No channels found"
              description="Try another spelling, a country (e.g. “Japan”), a language (“Bangla”), a category (“news”) or a broadcaster."
            />
          )}
        </section>
      ) : (
        <section className="mx-auto max-w-3xl space-y-4" aria-label="Popular searches">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Popular categories</h2>
          <div className="flex flex-wrap gap-2">
            {popularCategories.map((category) => (
              <button key={category.id} type="button" onClick={() => commit(category.name)} className="chip">
                <CategoryIcon name={category.icon} className="h-3.5 w-3.5" /> {category.name}
              </button>
            ))}
            {SPORT_CATEGORIES.slice(0, 4).map((sport) => (
              <button key={sport.id} type="button" onClick={() => commit(sport.id)} className="chip">
                {sport.emoji} {sport.name}
              </button>
            ))}
            {['Bangla', 'Bangladesh', 'English', 'France'].map((term) => (
              <button key={term} type="button" onClick={() => commit(term)} className="chip">
                {term}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Tip: press <kbd className="rounded bg-white/10 px-1">/</kbd> or <kbd className="rounded bg-white/10 px-1">Ctrl K</kbd>{' '}
            anywhere to search. Use ↑ ↓ and Enter to pick a suggestion.
          </p>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <CatalogGate>{(catalog) => <SearchContent catalog={catalog} />}</CatalogGate>;
}
