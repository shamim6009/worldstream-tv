import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChannelCard } from '../../src/components/ChannelCard';
import { FavoriteButton } from '../../src/components/FavoriteButton';
import { Highlight } from '../../src/components/Highlight';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useLocalPlaylists } from '../../src/hooks/useLocalPlaylists';
import { useRecent } from '../../src/hooks/useRecent';
import { EXPORT_FORMAT, exportPersonalData, importPersonalData } from '../../src/stores/personalData';
import { usePreferences } from '../../src/stores/preferences';
import { makeChannel } from './factory';

beforeEach(() => {
  useFavorites.setState({ ids: [] });
  useRecent.setState({ entries: [] });
  useLocalPlaylists.setState({ channels: [] });
});

describe('favorites', () => {
  it('toggles and persists to localStorage', async () => {
    render(<FavoriteButton channelId="jamuna-tv" channelName="Jamuna TV" showLabel />);
    const button = screen.getByRole('button', { name: /add jamuna tv to favorites/i });
    await userEvent.click(button);
    expect(useFavorites.getState().ids).toEqual(['jamuna-tv']);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('worldstream:favorites')).toContain('jamuna-tv');
    await userEvent.click(button);
    expect(useFavorites.getState().ids).toEqual([]);
  });

  it('rehydrates saved favorites (survives refresh)', async () => {
    localStorage.setItem('worldstream:favorites', JSON.stringify({ state: { ids: ['nhk-world'] }, version: 1 }));
    await useFavorites.persist.rehydrate();
    expect(useFavorites.getState().ids).toEqual(['nhk-world']);
  });
});

describe('ChannelCard', () => {
  it('shows the honest status label, never a fake LIVE badge for unchecked streams', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ChannelCard channel={makeChannel({ name: 'Example News', status: 'unknown' })} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Example News')).toBeInTheDocument();
    expect(screen.getByText('Unchecked')).toBeInTheDocument();
    expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/channel/example-news');
  });
});

describe('Highlight', () => {
  it('wraps matches in <mark> without injecting HTML', () => {
    const { container } = render(<Highlight text="Somoy <b>TV</b>" query="tv" />);
    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('preferences import/export', () => {
  it('round-trips favorites, history and preferences', () => {
    useFavorites.setState({ ids: ['jamuna-tv'] });
    usePreferences.getState().setVolume(0.3);
    const exported = exportPersonalData(false);
    expect(exported.format).toBe(EXPORT_FORMAT);

    useFavorites.setState({ ids: [] });
    importPersonalData(JSON.parse(JSON.stringify(exported)));
    expect(useFavorites.getState().ids).toEqual(['jamuna-tv']);
    expect(usePreferences.getState().volume).toBe(0.3);
  });

  it('rejects files that are not WorldStream exports', () => {
    expect(() => importPersonalData({ favorites: ['x'] })).toThrow(/not a WorldStream TV export/);
    expect(() => importPersonalData('nope')).toThrow();
  });

  it('sanitizes untrusted values', () => {
    importPersonalData({
      format: EXPORT_FORMAT,
      version: 1,
      favorites: ['ok-id', '<script>', 42],
      recent: [{ id: 'ok-id', watchedAt: 'not-a-date' }],
      preferences: { theme: 'neon', volume: 9, preferredCountry: 'usa' },
      localPlaylists: [
        { id: 'a', name: 'Good', url: 'https://isp.example/a.m3u8' },
        { id: 'b', name: 'Bad', url: 'javascript:alert(1)' },
      ],
    });
    expect(useFavorites.getState().ids).toEqual(['ok-id']);
    expect(useRecent.getState().entries).toEqual([]);
    expect(usePreferences.getState().volume).toBe(1);
    expect(usePreferences.getState().preferredCountry).toBeNull();
    expect(useLocalPlaylists.getState().channels.map((channel) => channel.name)).toEqual(['Good']);
  });
});
