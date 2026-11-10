import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Play, Search, X } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { SearchBox } from './SearchBox';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/live-tv', label: 'Live TV' },
  { to: '/sports', label: 'Live Sports' },
  { to: '/bangladesh-tv', label: 'Bangladesh TV' },
  { to: '/countries', label: 'Countries' },
  { to: '/categories', label: 'Categories' },
  { to: '/guide', label: 'TV Guide' },
];

const PROVIDERS = [
  { label: 'Pluto TV', href: 'https://pluto.tv/live-tv' },
  { label: 'Plex Live TV', href: 'https://watch.plex.tv/live-tv' },
  { label: 'Tubi', href: 'https://tubitv.com/live' },
  { label: 'Samsung TV Plus', href: 'https://www.samsungtvplus.com/' },
  { label: 'FIFA+', href: 'https://www.plus.fifa.com/' },
  { label: 'UEFA.tv', href: 'https://www.uefa.tv/' },
];

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="WorldStream TV home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-cyan text-white shadow-glow">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </span>
      <span className="font-heading text-base font-extrabold tracking-tight text-slate-50">
        WorldStream <span className="text-accent-cyan">TV</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition',
              isActive ? 'bg-white/10 text-slate-50' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const favoritesCount = useFavorites((state) => state.ids.length);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Global search shortcuts: "/" or Ctrl/Cmd+K.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slash = event.key === '/' && !isTyping(event.target);
      const commandK = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);
      if (!slash && !commandK) return;
      event.preventDefault();
      const input = document.querySelector<HTMLInputElement>('#global-search');
      if (input) input.focus();
      else navigate('/search');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  function search(value: string) {
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
    setQuery('');
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav className="ml-3 hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/search"
            aria-label="Search (press /)"
            title="Search (/)"
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/25 hover:bg-white/5"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/favorites"
            aria-label={`Favorites${favoritesCount ? `, ${favoritesCount} saved` : ''}`}
            title="Favorites"
            className="relative rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/25 hover:bg-white/5"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            {favoritesCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {favoritesCount > 99 ? '99+' : favoritesCount}
              </span>
            ) : null}
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:border-white/25 hover:bg-white/5 xl:hidden"
          >
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? (
        <div id="mobile-nav" className="border-t border-white/5 bg-ink-950/95 px-4 pb-4 pt-3 xl:hidden">
          <div className="mb-3">
            <SearchBox value={query} onChange={setQuery} onSubmit={search} placeholder="Search channels, countries…" />
          </div>
          <nav className="grid grid-cols-2 gap-1.5" aria-label="Mobile">
            <NavLinks onNavigate={() => setOpen(false)} />
            <NavLink
              to="/favorites"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-white/5"
            >
              Favorites
            </NavLink>
          </nav>
          <div className="mt-3 flex flex-wrap gap-3 border-t border-white/5 pt-3 text-xs text-slate-400">
            <Link to="/about" className="hover:text-slate-200">About</Link>
            <Link to="/legal" className="hover:text-slate-200">Legal</Link>
            <Link to="/admin" className="hover:text-slate-200">Data workflow</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-ink-950">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Brand />
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            A worldwide directory of authorized free live TV, sports and IPTV channels. We link to broadcaster and
            provider sources and never host or re-stream video.
          </p>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Status labels reflect automated checks and are not a guarantee of availability. Channel names, logos and
            trademarks belong to their owners.
          </p>
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-200">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link to="/live-tv" className="hover:text-slate-200">Live TV directory</Link></li>
            <li><Link to="/sports" className="hover:text-slate-200">Live sports</Link></li>
            <li><Link to="/bangladesh-tv" className="hover:text-slate-200">Bangladesh TV</Link></li>
            <li><Link to="/guide" className="hover:text-slate-200">TV guide</Link></li>
            <li><Link to="/favorites" className="hover:text-slate-200">Favorites &amp; playlists</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-200">Categories</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link to="/category/news" className="hover:text-slate-200">News</Link></li>
            <li><Link to="/category/sports" className="hover:text-slate-200">Sports</Link></li>
            <li><Link to="/category/entertainment" className="hover:text-slate-200">Entertainment</Link></li>
            <li><Link to="/category/movies" className="hover:text-slate-200">Movies &amp; series</Link></li>
            <li><Link to="/category/kids" className="hover:text-slate-200">Kids</Link></li>
            <li><Link to="/category/music" className="hover:text-slate-200">Music</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-200">Official providers</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {PROVIDERS.map((provider) => (
              <li key={provider.href}>
                <a href={provider.href} target="_blank" rel="noreferrer noopener" className="hover:text-slate-200">
                  {provider.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} WorldStream TV. Free-to-air listings only.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/about" className="hover:text-slate-300">About</Link>
            <Link to="/legal" className="hover:text-slate-300">Legal &amp; disclaimer</Link>
            <Link to="/legal#copyright" className="hover:text-slate-300">Copyright report</Link>
            <Link to="/admin" className="hover:text-slate-300">Data workflow</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
