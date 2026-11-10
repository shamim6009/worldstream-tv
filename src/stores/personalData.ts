import { useFavorites } from '../hooks/useFavorites';
import { useLocalPlaylists } from '../hooks/useLocalPlaylists';
import { useRecent, type RecentEntry } from '../hooks/useRecent';
import type { LocalPlaylistChannel } from '../types/catalog';
import { usePreferences, type Theme, type UiLanguage } from './preferences';
import { useSearchHistory } from './searchHistory';

export const EXPORT_FORMAT = 'worldstream-tv/preferences';

export interface PersonalDataExport {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  favorites: string[];
  recent: RecentEntry[];
  searchHistory: string[];
  preferences: {
    theme: Theme;
    preferredCountry: string | null;
    preferredLanguage: string | null;
    bangladeshUiLanguage: UiLanguage;
    volume: number;
    muted: boolean;
    autoplay: boolean;
  };
  localPlaylists?: LocalPlaylistChannel[];
}

export function exportPersonalData(includePlaylists: boolean): PersonalDataExport {
  const prefs = usePreferences.getState();
  return {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: useFavorites.getState().ids,
    recent: useRecent.getState().entries,
    searchHistory: useSearchHistory.getState().queries,
    preferences: {
      theme: prefs.theme,
      preferredCountry: prefs.preferredCountry,
      preferredLanguage: prefs.preferredLanguage,
      bangladeshUiLanguage: prefs.bangladeshUiLanguage,
      volume: prefs.volume,
      muted: prefs.muted,
      autoplay: prefs.autoplay,
    },
    ...(includePlaylists ? { localPlaylists: useLocalPlaylists.getState().channels } : {}),
  };
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,120}$/;
const isString = (value: unknown): value is string => typeof value === 'string';

function safeHttpUrl(value: unknown): string | null {
  if (!isString(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Validates an untrusted import file and applies it. Returns a short summary. */
export function importPersonalData(raw: unknown): string {
  if (!raw || typeof raw !== 'object') throw new Error('The file is not a WorldStream TV export.');
  const data = raw as Partial<PersonalDataExport>;
  if (data.format !== EXPORT_FORMAT) throw new Error('The file is not a WorldStream TV export.');

  const favorites = Array.isArray(data.favorites)
    ? [...new Set(data.favorites.filter((id): id is string => isString(id) && ID_RE.test(id)))].slice(0, 2000)
    : [];
  const recent = Array.isArray(data.recent)
    ? data.recent
        .filter(
          (entry): entry is RecentEntry =>
            !!entry &&
            isString(entry.id) &&
            ID_RE.test(entry.id) &&
            isString(entry.watchedAt) &&
            !Number.isNaN(Date.parse(entry.watchedAt)),
        )
        .slice(0, 24)
    : [];
  const searchHistory = Array.isArray(data.searchHistory)
    ? data.searchHistory.filter(isString).map((query) => query.slice(0, 80)).slice(0, 12)
    : [];

  useFavorites.setState({ ids: favorites });
  useRecent.setState({ entries: recent });
  useSearchHistory.setState({ queries: searchHistory });

  const prefs = data.preferences;
  if (prefs && typeof prefs === 'object') {
    const store = usePreferences.getState();
    if (prefs.theme === 'dark' || prefs.theme === 'light' || prefs.theme === 'system') store.setTheme(prefs.theme);
    store.setPreferredCountry(
      isString(prefs.preferredCountry) && /^[A-Z]{2}$/.test(prefs.preferredCountry) ? prefs.preferredCountry : null,
    );
    store.setPreferredLanguage(
      isString(prefs.preferredLanguage) && /^[a-z]{2,3}$/.test(prefs.preferredLanguage)
        ? prefs.preferredLanguage
        : null,
    );
    if (prefs.bangladeshUiLanguage === 'en' || prefs.bangladeshUiLanguage === 'bn') {
      store.setBangladeshUiLanguage(prefs.bangladeshUiLanguage);
    }
    if (typeof prefs.volume === 'number') store.setVolume(prefs.volume);
    if (typeof prefs.muted === 'boolean') store.setMuted(prefs.muted);
    if (typeof prefs.autoplay === 'boolean') store.setAutoplay(prefs.autoplay);
  }

  let playlistCount = 0;
  if (Array.isArray(data.localPlaylists)) {
    const channels: LocalPlaylistChannel[] = [];
    for (const entry of data.localPlaylists.slice(0, 5000)) {
      const url = safeHttpUrl(entry?.url);
      if (!url || !isString(entry.id) || !isString(entry.name)) continue;
      channels.push({
        id: entry.id.slice(0, 64),
        name: entry.name.slice(0, 200),
        url,
        logo: safeHttpUrl(entry.logo),
        group: isString(entry.group) ? entry.group.slice(0, 100) : null,
        importedAt: isString(entry.importedAt) ? entry.importedAt : new Date().toISOString(),
        playlistName: isString(entry.playlistName) ? entry.playlistName.slice(0, 100) : 'Imported',
      });
    }
    useLocalPlaylists.getState().add(channels);
    playlistCount = channels.length;
  }

  return (
    `Imported ${favorites.length} favorites, ${recent.length} recently watched` +
    (playlistCount ? ` and ${playlistCount} local playlist channels.` : '.')
  );
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
