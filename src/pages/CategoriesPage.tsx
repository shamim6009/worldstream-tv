import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { CategoryIcon } from '../components/CategoryIcon';
import { PageHeader } from '../components/PageHeader';
import { useSeo } from '../lib/seo';
import type { Catalog } from '../types/catalog';

function CategoriesContent({ catalog }: { catalog: Catalog }) {
  useSeo({
    title: 'Live TV by Category | WorldStream TV',
    description: `Browse ${catalog.stats.categories} categories of authorized free live TV: news, sports, entertainment, kids, music and more.`,
    path: 'categories',
  });
  const categories = catalog.categories.filter((category) => category.channelCount > 0);

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Categories' }]} />
      <PageHeader eyebrow="Browse" title="Categories" description="Every category with at least one approved channel." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className="group flex gap-4 rounded-2xl border border-white/10 bg-ink-900/60 p-5 transition hover:-translate-y-0.5 hover:border-white/25"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
              style={{ backgroundColor: `${category.color}22`, color: category.color }}
            >
              <CategoryIcon name={category.icon} className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="font-heading text-base font-semibold text-slate-100">{category.name}</span>
                <span className="text-xs text-slate-500">{category.channelCount}</span>
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">{category.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return <CatalogGate>{(catalog) => <CategoriesContent catalog={catalog} />}</CatalogGate>;
}
