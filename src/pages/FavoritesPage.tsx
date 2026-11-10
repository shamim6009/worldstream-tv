import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Heart, History, Settings, Upload } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogGate } from '../components/CatalogGate';
import { ChannelGrid } from '../components/ChannelGrid';
import { EmptyState } from '../components/EmptyState';
import { LocalPlaylistManager } from '../components/LocalPlaylistManager';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { useFavorites } from '../hooks/useFavorites';
import { useRecent } from '../hooks/useRecent';
import { channelById, languageOptions } from '../lib/channels';
import { useSeo } from '../lib/seo';
import { formatRelative } from '../lib/utils';
import { downloadJson, exportPersonalData, importPersonalData } from '../stores/personalData';
import { usePreferences, type Theme } from '../stores/preferences';
import type { Catalog, Channel } from '../types/catalog';

function Preferences({ catalog }: { catalog: Catalog }) {
  const prefs = usePreferences();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [includePlaylists, setIncludePlaylists] = useState(true);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const languages = useMemo(() => languageOptions(catalog.channels), [catalog.channels]);

  async function onImport(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('The file is too large.');
      const summary = importPersonalData(JSON.parse(await file.text()) as unknown);
      setMessage({ tone: 'ok', text: summary });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Import failed.' });
    }
  }

  return (
    <section id="settings" className="panel scroll-mt-24 space-y-5 p-5 sm:p-6" aria-label="Preferences">
      <SectionHeading title="Preferences" description="Saved in this browser only. No account needed." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-300">Theme</span>
          <select value={prefs.theme} onChange={(event) => prefs.setTheme(event.target.value as Theme)} className="field">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Match system</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-300">Preferred country</span>
          <select
            value={prefs.preferredCountry ?? ''}
            onChange={(event) => prefs.setPreferredCountry(event.target.value || null)}
            className="field"
          >
            <option value="">No preference</option>
            {catalog.countries.filter((country) => country.channelCount > 0).map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-300">Preferred language</span>
          <select
            value={prefs.preferredLanguage ?? ''}
            onChange={(event) => prefs.setPreferredLanguage(event.target.value || null)}
            className="field"
          >
            <option value="">No preference</option>
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5 text-sm">
          <span className="font-semibold text-slate-300">Player</span>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={prefs.autoplay} onChange={(event) => prefs.setAutoplay(event.target.checked)} />
            Autoplay streams
          </label>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={prefs.muted} onChange={(event) => prefs.setMuted(event.target.checked)} />
            Start muted
          </label>
          <label className="flex items-center gap-2 text-slate-300">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.volume}
              onChange={(event) => prefs.setVolume(Number(event.target.value))}
              className="volume flex-1"
              aria-label="Default volume"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={() => downloadJson(`worldstream-tv-preferences-${new Date().toISOString().slice(0, 10)}.json`, exportPersonalData(includePlaylists))}
          className="btn-secondary py-2"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Import preferences file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImport(file);
            event.target.value = '';
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary py-2">
          <Upload className="h-4 w-4" aria-hidden="true" /> Import
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={includePlaylists} onChange={(event) => setIncludePlaylists(event.target.checked)} />
          Include local playlists in export
        </label>
        <button type="button" onClick={prefs.reset} className="ml-auto text-xs font-semibold text-slate-500 hover:text-rose-300">
          Reset preferences
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={message.tone === 'ok' ? 'text-sm text-emerald-300' : 'text-sm text-rose-300'}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

function FavoritesContent({ catalog }: { catalog: Catalog }) {
  const ids = useFavorites((state) => state.ids);
  const clearFavorites = useFavorites((state) => state.clear);
  const entries = useRecent((state) => state.entries);
  const clearRecent = useRecent((state) => state.clear);

  useSeo({ title: 'Favorites & playlists | WorldStream TV', description: 'Your saved channels and local playlists.', path: 'favorites', noindex: true });

  const map = useMemo(() => channelById(catalog), [catalog]);
  const favorites = ids.map((id) => map.get(id)).filter((channel): channel is Channel => Boolean(channel));
  const recent = entries.map((entry) => map.get(entry.id)).filter((channel): channel is Channel => Boolean(channel));
  const missing = ids.length - favorites.length;

  return (
    <div className="page space-y-10">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Favorites' }]} />
      <PageHeader
        eyebrow="Your library"
        title="Favorites & playlists"
        description="Everything here is stored in this browser. Export it to move to another device."
        actions={
          <a href="#settings" className="btn-secondary py-2">
            <Settings className="h-4 w-4" aria-hidden="true" /> Preferences
          </a>
        }
      />

      <section className="space-y-4" aria-label="Favorite channels">
        <SectionHeading
          title={`Favorite channels (${favorites.length})`}
          action={
            favorites.length ? (
              <button type="button" onClick={clearFavorites} className="text-xs font-semibold text-slate-500 hover:text-rose-300">
                Clear all
              </button>
            ) : null
          }
        />
        {missing > 0 ? (
          <p className="text-xs text-slate-500">
            {missing} saved channel{missing === 1 ? ' is' : 's are'} no longer in the catalog (removed or renamed).
          </p>
        ) : null}
        {favorites.length ? (
          <ChannelGrid channels={favorites} />
        ) : (
          <EmptyState
            icon={<Heart className="h-6 w-6" aria-hidden="true" />}
            title="No favorites yet"
            description="Tap the heart on any channel to keep it here."
            action={
              <Link to="/live-tv" className="btn-primary">
                Browse channels
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-4" aria-label="Recently watched">
        <SectionHeading
          title="Recently watched"
          description={entries[0] ? `Last watched ${formatRelative(entries[0].watchedAt)}.` : undefined}
          action={
            recent.length ? (
              <button type="button" onClick={clearRecent} className="text-xs font-semibold text-slate-500 hover:text-rose-300">
                Clear history
              </button>
            ) : null
          }
        />
        {recent.length ? (
          <ChannelGrid channels={recent} />
        ) : (
          <EmptyState icon={<History className="h-6 w-6" aria-hidden="true" />} title="Nothing watched yet" description="Channels you open appear here." />
        )}
      </section>

      <section id="playlists" className="panel scroll-mt-24 space-y-4 p-5 sm:p-6" aria-label="Local playlists">
        <SectionHeading
          title="Local playlists"
          description="Import an M3U/M3U8 file from your ISP or another legitimate source. It never leaves this browser."
        />
        <LocalPlaylistManager />
      </section>

      <Preferences catalog={catalog} />
    </div>
  );
}

export default function FavoritesPage() {
  return <CatalogGate>{(catalog) => <FavoritesContent catalog={catalog} />}</CatalogGate>;
}
