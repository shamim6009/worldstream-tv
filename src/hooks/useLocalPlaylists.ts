import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalPlaylistChannel } from '../types/catalog';

interface LocalPlaylistState {
  channels: LocalPlaylistChannel[];
  add: (channels: LocalPlaylistChannel[]) => void;
  removeChannel: (id: string) => void;
  removePlaylist: (playlistName: string) => void;
  clear: () => void;
}

export const useLocalPlaylists = create<LocalPlaylistState>()(
  persist(
    (set) => ({
      channels: [],
      add: (incoming) =>
        set((state) => {
          const existing = new Set(state.channels.map((channel) => channel.id));
          const merged = [...state.channels];
          for (const channel of incoming) {
            if (!existing.has(channel.id)) {
              existing.add(channel.id);
              merged.push(channel);
            }
          }
          return { channels: merged.slice(0, 5000) };
        }),
      removeChannel: (id) =>
        set((state) => ({ channels: state.channels.filter((channel) => channel.id !== id) })),
      removePlaylist: (playlistName) =>
        set((state) => ({
          channels: state.channels.filter((channel) => channel.playlistName !== playlistName),
        })),
      clear: () => set({ channels: [] }),
    }),
    {
      name: 'worldstream:local-playlists',
      version: 1,
      partialize: (state) => ({ channels: state.channels }),
    },
  ),
);

export function playlistNames(channels: LocalPlaylistChannel[]): string[] {
  return [...new Set(channels.map((channel) => channel.playlistName))].sort();
}
