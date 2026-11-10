import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, GitPullRequest, ShieldAlert, Terminal } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { repoUrl } from '../lib/channels';
import { useSeo } from '../lib/seo';
import { formatRelative, sourceTypeLabel } from '../lib/utils';
import type { Catalog, StreamStatus } from '../types/catalog';

const COMMANDS: { command: string; description: string }[] = [
  { command: 'npm run sync:catalog', description: 'Download allowlisted playlists and write review candidates (never published).' },
  { command: 'npm run validate:streams', description: 'Check approved sources (manifest + CORS) and update data/stream-status.json.' },
  { command: 'npm run sync:epg', description: 'Fetch allowlisted XMLTV feeds and write the guide for approved channels.' },
  { command: 'npm run generate:catalog', description: 'Build public/data/catalog.json, sitemap.xml and robots.txt.' },
];

const STEPS = [
  'Find the channel in data/candidates.json (or add a new one) and confirm the broadcaster publishes it for free.',
  'Add an entry to data/approved-channels.json with provider, authorization, authorizationNote and officialWatchUrl.',
  'Add fallback sources to the same entry’s sources array, ordered by preference. Only add sources from the same rights holder.',
  'Run npm run check locally; the schema validation in generate:catalog rejects incomplete entries.',
  'Open a pull request. CI runs lint, type checks, tests and a build; a maintainer reviews provenance and merges.',
  'To remove a channel (e.g. a copyright report), delete it from approved-channels.json, add its URL to the blocklist in data/sources.json, and merge.',
];

function AdminContent({ catalog }: { catalog: Catalog }) {
  useSeo({ title: 'Data workflow | WorldStream TV', description: 'How the channel catalog is maintained.', path: 'admin', noindex: true });

  const sources = useMemo(
    () =>
      catalog.channels.flatMap((channel) =>
        channel.sources.map((source) => ({ channel, source })),
      ),
    [catalog.channels],
  );

  const byStatus = useMemo(() => {
    const counts = new Map<StreamStatus, number>();
    for (const { source } of sources) counts.set(source.status, (counts.get(source.status) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [sources]);

  const problems = sources
    .filter(({ source }) => source.status !== 'verified' && source.status !== 'recently-available' && source.status !== 'unknown')
    .slice(0, 100);
  const unchecked = sources.filter(({ source }) => !source.lastCheckedAt).length;

  return (
    <div className="page space-y-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Data workflow' }]} />
      <PageHeader
        eyebrow="Administration"
        title="Catalog data workflow"
        description="This deployment is static. Channels are managed as reviewed JSON files in Git; there is no admin login, token or write API in the browser."
        actions={
          <a href={`${repoUrl()}/blob/main/docs/ADMIN.md`} target="_blank" rel="noreferrer noopener" className="btn-secondary py-2">
            Admin guide <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Approved channels', value: catalog.stats.totalChannels },
          { label: 'Approved sources', value: catalog.stats.sources },
          { label: 'Verified channels', value: catalog.stats.verifiedChannels },
          { label: 'Never checked', value: unchecked },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
            <p className="mt-1 font-heading text-2xl font-bold text-slate-50">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="font-heading text-base font-semibold text-slate-100">Source status summary</h2>
        <p className="text-xs text-slate-500">Catalog generated {formatRelative(catalog.generatedAt)}.</p>
        <div className="flex flex-wrap gap-2">
          {byStatus.map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-2">
              <StatusBadge status={status} /> <span className="text-sm text-slate-300">{count}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-slate-100">
            <GitPullRequest className="h-4 w-4 text-accent-cyan" aria-hidden="true" /> Approve or remove a stream
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-400">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section className="panel space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-slate-100">
            <Terminal className="h-4 w-4 text-accent-cyan" aria-hidden="true" /> Maintenance commands
          </h2>
          <ul className="space-y-3">
            {COMMANDS.map((item) => (
              <li key={item.command}>
                <code className="rounded bg-ink-950 px-2 py-1 text-xs text-cyan-200">{item.command}</code>
                <p className="mt-1 text-sm text-slate-400">{item.description}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            The same jobs run on schedule in <code>.github/workflows/sync-streams.yml</code> and can be triggered manually
            from the GitHub Actions tab (“Run workflow”).
          </p>
        </section>
      </div>

      <section className="panel overflow-hidden" aria-label="Sources needing attention">
        <h2 className="flex items-center gap-2 border-b border-white/5 px-5 py-3 font-heading text-base font-semibold text-slate-100">
          <ShieldAlert className="h-4 w-4 text-amber-300" aria-hidden="true" /> Sources needing attention ({problems.length})
        </h2>
        {problems.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2">Channel</th>
                  <th className="px-5 py-2">Type</th>
                  <th className="px-5 py-2">Status</th>
                  <th className="px-5 py-2">HTTP</th>
                  <th className="px-5 py-2">Detail</th>
                  <th className="px-5 py-2">Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {problems.map(({ channel, source }) => (
                  <tr key={source.id}>
                    <td className="px-5 py-2">
                      <Link to={`/channel/${channel.slug}`} className="text-slate-100 hover:text-accent-cyan">
                        {channel.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-slate-400">{sourceTypeLabel(source.type)}</td>
                    <td className="px-5 py-2"><StatusBadge status={source.status} compact /></td>
                    <td className="px-5 py-2 text-slate-400">{source.httpStatus ?? '—'}</td>
                    <td className="max-w-xs truncate px-5 py-2 text-slate-400" title={source.error ?? ''}>{source.error ?? '—'}</td>
                    <td className="px-5 py-2 text-slate-500">{formatRelative(source.lastCheckedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-400">
            No failing sources recorded. {unchecked ? `${unchecked} sources have not been checked yet — run npm run validate:streams.` : ''}
          </p>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Optional dynamic administration (e.g. Supabase with row-level security) must run behind a server-side API with
        real authentication and roles. Never put admin or GitHub tokens in frontend code or <code>VITE_*</code> variables.
      </p>
    </div>
  );
}

export default function AdminPage() {
  return <CatalogGate>{(catalog) => <AdminContent catalog={catalog} />}</CatalogGate>;
}
