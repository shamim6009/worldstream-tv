import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PageHeader } from '../components/PageHeader';
import { useSeo } from '../lib/seo';
import { repoUrl } from '../lib/channels';

const STEPS = [
  {
    title: '1. Discover',
    text: 'A scheduled GitHub Action downloads allowlisted public playlists (IPTV-org, Free-TV) and the IPTV-org metadata API over HTTPS, with rate limits and SSRF protection.',
  },
  {
    title: '2. Candidates, not publications',
    text: 'Every imported entry is normalized, de-duplicated, matched to metadata and written to data/candidates.json with publish: false. Nothing from a community playlist is shown to visitors automatically.',
  },
  {
    title: '3. Human review',
    text: 'A maintainer confirms the broadcaster publishes the stream for free (official site, public broadcaster, FAST publisher or official YouTube channel) and adds it to data/approved-channels.json through a pull request.',
  },
  {
    title: '4. Health checks',
    text: 'The stream checker fetches only the HLS manifest (never full video), validates its structure and CORS headers, and records an honest status. HTTP 200 alone is never treated as “live”.',
  },
  {
    title: '5. Static catalog',
    text: 'A compact catalog.json, sitemap and prerendered pages are generated and deployed to a CDN. Browsers load one cached JSON file instead of downloading playlists.',
  },
];

export default function AboutPage() {
  useSeo({
    title: 'About WorldStream TV',
    description: 'How WorldStream TV sources, reviews and checks free live TV streams.',
    path: 'about',
  });
  return (
    <div className="page space-y-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <PageHeader
        eyebrow="About"
        title="A directory of authorized free TV"
        description="WorldStream TV is an open-source, static web app that lists live channels their owners publish for free, and plays them directly from the source."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((step) => (
          <section key={step.title} className="panel p-5">
            <h2 className="font-heading text-base font-semibold text-slate-100">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
          </section>
        ))}
        <section className="panel p-5">
          <h2 className="font-heading text-base font-semibold text-slate-100">What we never do</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-400">
            <li>Bypass DRM, paywalls, logins or geographic restrictions.</li>
            <li>Proxy or re-stream video, or circumvent CORS.</li>
            <li>Invent statuses, schedules, fixtures or fallback streams.</li>
            <li>Upload your local playlists or scan private networks.</li>
          </ul>
        </section>
      </div>
      <p className="text-sm text-slate-400">
        Source code, documentation and the review workflow are on{' '}
        <a href={repoUrl()} target="_blank" rel="noreferrer noopener" className="text-accent-cyan hover:underline">
          GitHub
        </a>
        . See also the <Link to="/admin" className="text-accent-cyan hover:underline">data workflow</Link> and{' '}
        <Link to="/legal" className="text-accent-cyan hover:underline">legal notice</Link>.
      </p>
    </div>
  );
}
