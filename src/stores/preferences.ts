import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type UiLanguage = 'en' | 'bn';

export interface PreferencesState {
  theme: Theme;
  preferredCountry: string | null;
  preferredLanguage: string | null;
  bangladeshUiLanguage: UiLanguage;
  volume: number;
  muted: boolean;
  autoplay: boolean;
  setTheme: (theme: Theme) => void;
  setPreferredCountry: (code: string | null) => void;
  setPreferredLanguage: (code: string | null) => void;
  setBangladeshUiLanguage: (language: UiLanguage) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setAutoplay: (autoplay: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: 'dark' as Theme,
  preferredCountry: null as string | null,
  preferredLanguage: null as string | null,
  bangladeshUiLanguage: 'en' as UiLanguage,
  volume: 0.8,
  muted: false,
  autoplay: true,
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.volume;
  return Math.min(1, Math.max(0, value));
}

export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('dark', resolved === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', resolved === 'light' ? '#F4F7FB' : '#080D1B');
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setPreferredCountry: (preferredCountry) => set({ preferredCountry }),
      setPreferredLanguage: (preferredLanguage) => set({ preferredLanguage }),
      setBangladeshUiLanguage: (bangladeshUiLanguage) => set({ bangladeshUiLanguage }),
      setVolume: (volume) => set({ volume: clampVolume(volume) }),
      setMuted: (muted) => set({ muted }),
      setAutoplay: (autoplay) => set({ autoplay }),
      reset: () => {
        applyTheme(DEFAULTS.theme);
        set({ ...DEFAULTS });
      },
    }),
    {
      name: 'worldstream:preferences',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        preferredCountry: state.preferredCountry,
        preferredLanguage: state.preferredLanguage,
        bangladeshUiLanguage: state.bangladeshUiLanguage,
        volume: state.volume,
        muted: state.muted,
        autoplay: state.autoplay,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
