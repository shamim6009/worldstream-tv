import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { CategoryIcon } from '../components/CategoryIcon';
import { ChannelDirectory } from '../components/ChannelDirectory';
import { PageHeader } from '../components/PageHeader';
import { useSeo } from '../lib/seo';
import type { Catalog } from '../types/catalog';
import NotFoundPage from './NotFoundPage';

function CategoryContent({ catalog, slug }: { catalog: Catalog; slug: string }) {
  const category = catalog.categories.find((entry) => entry.slug === slug);
  const channels = useMemo(
    () => (category ? catalog.channels.filter((channel) => channel.categories.includes(category.id)) : []),
    [catalog.channels, category],
  );

  useSeo({
    title: category
      ? `${category.name} Live TV — Free Authorized Channels | WorldStream TV`
      : 'Category not found | WorldStream TV',
    description: category ? `${category.description} ${channels.length} free channels.` : 'Category not found.',
    path: `category/${slug}`,
    noindex: !category || channels.length === 0,
  });

  if (!category || channels.length === 0) return <NotFoundPage />;

  return (
    <div className="page space-y-6">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: 'Categories', to: '/categories' }, { label: category.name }]}
      />
      <PageHeader eyebrow="Category" title={`${category.name} Channels`} description={category.description}>
        <span
          className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${category.color}22`, color: category.color }}
        >
          <CategoryIcon name={category.icon} className="h-4 w-4" /> {channels.length} channels
        </span>
      </PageHeader>
      <ChannelDirectory catalog={catalog} channels={channels} hide={['category']} />
    </div>
  );
}

export default function CategoryPage() {
  const { slug = '' } = useParams();
  return <CatalogGate>{(catalog) => <CategoryContent catalog={catalog} slug={slug} />}</CatalogGate>;
}
