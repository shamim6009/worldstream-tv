import type { Catalog, EpgData, SportsEventData } from '../types/catalog';

export type { Catalog, EpgData, SportsEventData };

function dataUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}data/${file}`;
}

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(dataUrl(file), {
    headers: { accept: 'application/json' },
    cache: 'no-cache',
  });
  if (!response.ok) {
    throw new Error(`Could not load ${file} (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

export async function fetchCatalog(): Promise<Catalog> {
  const catalog = await fetchJson<Catalog>('catalog.json');
  if (!catalog || !Array.isArray(catalog.channels) || !Array.isArray(catalog.countries)) {
    throw new Error('The catalog file is malformed.');
  }
  return catalog;
}

export async function fetchEpg(): Promise<EpgData> {
  return fetchJson<EpgData>('epg.json');
}

export async function fetchSportsEvents(): Promise<SportsEventData> {
  return fetchJson<SportsEventData>('sports-events.json');
}
