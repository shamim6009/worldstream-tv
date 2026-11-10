import { useQuery } from '@tanstack/react-query';
import { fetchCatalog, fetchEpg, fetchSportsEvents } from '../lib/catalog';

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useEpg() {
  return useQuery({
    queryKey: ['epg'],
    queryFn: fetchEpg,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useSportsEvents() {
  return useQuery({
    queryKey: ['sports-events'],
    queryFn: fetchSportsEvents,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
