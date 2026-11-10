import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Info, ListVideo, Trash2 } from 'lucide-react';
import { playlistNames, useLocalPlaylists } from '../hooks/useLocalPlaylists';
import { parseLocalPlaylist } from '../lib/playlist';
import { Logo } from './Logo';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Imports a personal M3U/M3U8 file entirely in the browser. The file is read with
 * FileReader and stored in localStorage; nothing is uploaded or fetched by the app.
 */
export function LocalPlaylistManager({ compact = false }: { compact?: boolean }) {
  const channels = useLocalPlaylists((state) => state.channels);
  const add = useLocalPlaylists((state) => state.add);
  const removePlaylist = useLocalPlaylists((state) => state.removePlaylist);
  const removeChannel = useLocalPlaylists((state) => state.removeChannel);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState('');

  async function onFile(file: File) {
    setMessage(null);
    if (file.size > MAX_FILE_BYTES) {
      setMessage({ tone: 'error', text: 'That file is larger than 5 MB. Split the playlist and import it in parts.' });
      return;
    }
    try {
      const text = await file.text();
      if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
        setMessage({ tone: 'error', text: 'This does not look like an M3U playlist (missing #EXTM3U / #EXTINF).' });
        return;
      }
      const name = file.name.replace(/\.(m3u8?|txt)$/i, '') || 'My playlist';
      const parsed = parseLocalPlaylist(text, name);
      add(parsed);
      setMessage({
        tone: parsed.length ? 'ok' : 'error',
        text: parsed.length
          ? `Imported ${parsed.length} channel${parsed.length === 1 ? '' : 's'} from “${name}”. Stored only in this browser.`
          : 'No valid http(s) stream entries were found in that file.',
      });
    } catch {
      setMessage({ tone: 'error', text: 'The file could not be read.' });
    }
  }

  const names = playlistNames(channels);
  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? channels.filter((channel) => `${channel.name} ${channel.group ?? ''}`.toLowerCase().includes(needle))
    : channels;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".m3u,.m3u8,audio/x-mpegurl,application/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
          className="sr-only"
          aria-label="Import M3U playlist file"
          data-testid="playlist-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = '';
          }}
        />
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-primary">
          <FileUp className="h-4 w-4" aria-hidden="true" /> Import M3U file
        </button>
        {names.map((name) => (
          <span key={name} className="chip">
            <ListVideo className="h-3.5 w-3.5" aria-hidden="true" /> {name}
            <button
              type="button"
              onClick={() => removePlaylist(name)}
              aria-label={`Remove playlist ${name}`}
              className="rounded-full p-0.5 text-slate-500 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      {message ? (
        <p
          role="status"
          className={
            message.tone === 'ok'
              ? 'rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200'
              : 'rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200'
          }
        >
          {message.text}
        </p>
      ) : null}

      {!compact ? (
        <div className="flex gap-3 rounded-xl border border-white/10 bg-ink-900/40 p-3 text-xs leading-5 text-slate-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              <strong className="text-slate-200">Network routing and permission are separate.</strong> A BDIX/ISP-local
              stream is only reachable from inside that ISP’s network, and you are responsible for having the right to
              watch what your playlist contains.
            </p>
            <p>
              WorldStream TV never scans private networks, never uploads your playlist and never redistributes ISP-only
              streams. Plain <code>http://</code> streams are blocked by browsers on HTTPS sites; use a local player app
              (e.g. VLC) for those.
            </p>
          </div>
        </div>
      ) : null}

      {channels.length ? (
        <div className="space-y-2">
          {channels.length > 12 ? (
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter imported channels…"
              aria-label="Filter imported channels"
              className="field max-w-sm"
            />
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visible.slice(0, 300).map((channel) => (
              <li key={channel.id} className="panel flex items-center gap-3 p-2.5">
                <Logo name={channel.name} logo={channel.logo} className="h-9 w-12 shrink-0" imgClassName="p-1" />
                <Link to={`/local/${channel.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-100 hover:text-accent-cyan">
                    {channel.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {channel.group ?? channel.playlistName} · {new URL(channel.url).hostname}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeChannel(channel.id)}
                  aria-label={`Remove ${channel.name}`}
                  className="rounded-full p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {visible.length > 300 ? (
            <p className="text-xs text-slate-500">Showing 300 of {visible.length}. Use the filter to narrow the list.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
