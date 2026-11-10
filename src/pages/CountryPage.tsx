import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { ChannelDirectory } from '../components/ChannelDirectory';
import { PageHeader } from '../components/PageHeader';
import { usePreferences } from '../stores/preferences';
import { useSeo } from '../lib/seo';
import type { Catalog } from '../types/catalog';
import NotFoundPage from './NotFoundPage';

function CountryContent({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const country = catalog.countries.find((entry) => entry.slug === slug);
  const channels = useMemo(
    () => (country ? catalog.channels.filter((channel) => channel.country === country.code) : []),
    [catalog.channels, country],
  );
  const preferredCountry = usePreferences((state) => state.preferredCountry);
  const setPreferredCountry = usePreferences((state) => state.setPreferredCountry);

  useSeo({
    title: country
      ? `${country.name} Live TV — Free Authorized Channels | WorldStream TV`
      : 'Country not found | WorldStream TV',
    description: country
      ? `Watch ${channels.length} free live TV channels from ${country.name}: news, entertainment, sports and more from official sources.`
      : 'This country has no approved channels.',
    path: `country/${slug}`,
    noindex: !country || channels.length === 0,
  });

  // Never render empty country pages.
  if (!country || channels.length === 0) return <NotFoundPage />;

  const isPreferred = preferredCountry === country.code;

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Countries', to: '/countries' }, { label: country.name }]} />
      <PageHeader
        eyebrow={country.region}
        title={`${country.flag} ${country.name} Live TV`}
        description={`${channels.length} authorized free channel${channels.length === 1 ? '' : 's'} from ${country.name}.`}
        actions={
          <>
            {country.code === 'BD' ? (
              <Link to="/bangladesh-tv" className="btn-primary">
                Open Bangladesh TV
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setPreferredCountry(isPreferred ? null : country.code)}
              aria-pressed={isPreferred}
              className="btn-secondary"
            >
              {isPreferred ? 'Preferred country ✓' : 'Set as my country'}
            </button>
          </>
        }
      />
      <ChannelDirectory catalog={catalog} channels={channels} hide={['country']} />
    </div>
  );
}

export default function CountryPage() {
  const { slug = '' } = useParams();
  return <CatalogGate>{(catalog) => <CountryContent catalog={catalog} slug={slug} />}</CatalogGate>;
}
