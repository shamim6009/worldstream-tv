import { Monitor, Moon, Sun } from 'lucide-react';
import { usePreferences, type Theme } from '../stores/preferences';

const NEXT: Record<Theme, Theme> = { dark: 'light', light: 'system', system: 'dark' };
const LABEL: Record<Theme, string> = { dark: 'Dark theme', light: 'Light theme', system: 'System theme' };

export function ThemeToggle() {
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`${LABEL[theme]} (click to switch to ${LABEL[NEXT[theme]].toLowerCase()})`}
      title={LABEL[theme]}
      className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/25 hover:bg-white/5"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
