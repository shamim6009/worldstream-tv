import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { EmptyState } from '../components/EmptyState';
import { usePreferences } from '../stores/preferences';
import { useSeo } from '../lib/seo';
import { cn, normalizeText } from '../lib/utils';
import type { Catalog, Region } from '../types/catalog';

const REGION_ORDER: Region[] = ['Asia', 'Middle East', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'];

function CountriesContent({ catalog }: { catalog: Catalog }) {
  const [query, setQuery] = useState('');
  const preferred = usePreferences((state) => state.preferredCountry);

  useSeo({
    title: 'Live TV by Country | WorldStream TV',
    description: `Browse authorized free live TV from ${catalog.stats.countries} countries across Asia, Europe, Africa, the Americas and Oceania.`,
    path: 'countries',
  });

  const grouped = useMemo(() => {
    const needle = normalizeText(query);
    const visible = catalog.countries.filter(
      (country) => country.channelCount > 0 && (!needle || normalizeText(country.name).includes(needle)),
    );
    return REGION_ORDER.map((region) => ({
      region,
      countries: visible.filter((country) => country.region === region).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((group) => group.countries.length > 0);
  }, [catalog.countries, query]);

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Countries' }]} />
      <PageHeader
        eyebrow="Worldwide"
        title="Channels by Country"
        description="Only countries with at least one approved channel are listed. More countries appear as sources are reviewed."
      >
        <SearchBox value={query} onChange={setQuery} placeholder="Find a country…" className="mt-5 max-w-md" />
      </PageHeader>

      {grouped.length === 0 ? (
        <EmptyState title="No matching countries" description="No approved channels are listed for that country yet." />
      ) : (
        grouped.map((group) => (
          <section key={group.region} className="space-y-3" aria-label={group.region}>
            <h2 className="font-heading text-lg font-bold text-slate-100">{group.region}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {group.countries.map((country) => (
                <Link
                  key={country.code}
                  to={`/country/${country.slug}`}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3.5 transition hover:-translate-y-0.5 hover:border-white/25',
                    preferred === country.code && 'border-accent-soft/50',
                  )}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {country.flag}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-100">{country.name}</span>
                    <span className="text-xs text-slate-500">
                      {country.channelCount} channel{country.channelCount === 1 ? '' : 's'}
                      {preferred === country.code ? ' · Your country' : ''}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export default function CountriesPage() {
  return <CatalogGate>{(catalog) => <CountriesContent catalog={catalog} />}</CatalogGate>;
}
