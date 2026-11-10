import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentEntry {
  id: string;
  watchedAt: string;
}

interface RecentState {
  entries: RecentEntry[];
  record: (id: string) => void;
  clear: () => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      entries: [],
      record: (id) =>
        set((state) => ({
          entries: [
            { id, watchedAt: new Date().toISOString() },
            ...state.entries.filter((entry) => entry.id !== id),
          ].slice(0, 24),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'worldstream:recent',
      version: 1,
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
