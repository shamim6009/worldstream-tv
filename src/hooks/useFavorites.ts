import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((favorite) => favorite !== id)
            : [...state.ids, id],
        })),
      remove: (id) => set((state) => ({ ids: state.ids.filter((favorite) => favorite !== id) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'worldstream:favorites',
      version: 1,
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);

export function useIsFavorite(id: string): boolean {
  return useFavorites((state) => state.ids.includes(id));
}
