import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { ChannelDirectory } from '../components/ChannelDirectory';
import { PageHeader } from '../components/PageHeader';
import { useSeo } from '../lib/seo';
import type { Catalog } from '../types/catalog';

function LiveTvContent({ catalog }: { catalog: Catalog }) {
  useSeo({
    title: 'Live TV Directory — Authorized Free Channels | WorldStream TV',
    description: `Browse ${catalog.stats.totalChannels} free live TV channels from ${catalog.stats.countries} countries by country, language, category and stream status.`,
    path: 'live-tv',
  });

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Live TV' }]} />
      <PageHeader
        eyebrow="Worldwide directory"
        title="Live TV"
        description={`${catalog.stats.totalChannels} authorized free channels from ${catalog.stats.countries} countries. Filter by country, language, category or verified availability.`}
      />
      <ChannelDirectory catalog={catalog} channels={catalog.channels} />
    </div>
  );
}

export default function LiveTvPage() {
  return <CatalogGate>{(catalog) => <LiveTvContent catalog={catalog} />}</CatalogGate>;
}
