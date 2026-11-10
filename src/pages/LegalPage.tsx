import { Breadcrumbs } from '../components/Breadcrumbs';
import { PageHeader } from '../components/PageHeader';
import { reportIssueUrl } from '../lib/channels';
import { useSeo } from '../lib/seo';

export default function LegalPage() {
  useSeo({
    title: 'Legal & Disclaimer | WorldStream TV',
    description: 'Copyright, authorization, privacy and availability information for WorldStream TV, and how to request removal.',
    path: 'legal',
  });
  const email = import.meta.env.VITE_CONTACT_EMAIL;

  return (
    <div className="page space-y-6">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Legal' }]} />
      <PageHeader eyebrow="Legal" title="Legal & disclaimer" />
      <div className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-slate-300">
        <section>
          <h2 className="font-heading text-lg font-semibold text-slate-100">No hosting or re-streaming</h2>
          <p className="mt-2">
            WorldStream TV does not host, store, transcode, proxy or re-stream video. When you press play, your browser
            connects directly to the broadcaster or provider. Where embedding is not permitted we link to the official
            provider page instead.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold text-slate-100">Authorized sources only</h2>
          <p className="mt-2">
            Listings are limited to streams published free of charge by their rights holders: public broadcasters,
            official broadcaster websites and apps, publisher-operated FAST channels, and official YouTube channels. We do
            not bypass DRM, subscriptions, authentication or geographic restrictions. Channel names, logos and trademarks
            belong to their respective owners.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold text-slate-100">Availability</h2>
          <p className="mt-2">
            Status labels come from automated manifest checks and can be out of date. Broadcasters may change, limit or
            withdraw streams at any time. A “Verified” label is not a guarantee that a stream will play in your country or
            on your network.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold text-slate-100">Local playlists</h2>
          <p className="mt-2">
            Playlists you import are parsed and stored only in your browser. They are not reviewed, uploaded or shared. You
            are responsible for having the right to watch any stream you add yourself.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold text-slate-100">Privacy</h2>
          <p className="mt-2">
            The app has no accounts, analytics or advertising. Favorites, history and preferences are kept in your
            browser’s local storage. Video providers you connect to (including YouTube) apply their own privacy policies.
          </p>
        </section>
        <section id="copyright" className="scroll-mt-24 rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <h2 className="font-heading text-lg font-semibold text-slate-100">Copyright complaints &amp; removal</h2>
          <p className="mt-2">
            If you are a rights holder and believe a listing is not authorized, send the channel name, the page URL, and
            proof that you represent the rights holder. We remove disputed listings promptly, normally within 72 hours,
            and the removal is applied to the catalog in the next deployment.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={reportIssueUrl(undefined, 'copyright')} target="_blank" rel="noreferrer noopener" className="btn-primary py-2">
              Open a removal request
            </a>
            {email ? (
              <a href={`mailto:${email}?subject=${encodeURIComponent('Copyright removal request')}`} className="btn-secondary py-2">
                Email {email}
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
