import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchHistoryState {
  queries: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      queries: [],
      add: (query) => {
        const value = query.trim().slice(0, 80);
        if (!value) return;
        set((state) => ({
          queries: [
            value,
            ...state.queries.filter((entry) => entry.toLowerCase() !== value.toLowerCase()),
          ].slice(0, 12),
        }));
      },
      remove: (query) => set((state) => ({ queries: state.queries.filter((entry) => entry !== query) })),
      clear: () => set({ queries: [] }),
    }),
    {
      name: 'worldstream:search-history',
      version: 1,
      partialize: (state) => ({ queries: state.queries }),
    },
  ),
);
