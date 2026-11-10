import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageLoading } from './components/Loading';

const HomePage = lazy(() => import('./pages/HomePage'));
const LiveTvPage = lazy(() => import('./pages/LiveTvPage'));
const ChannelPage = lazy(() => import('./pages/ChannelPage'));
const CountriesPage = lazy(() => import('./pages/CountriesPage'));
const CountryPage = lazy(() => import('./pages/CountryPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SportsPage = lazy(() => import('./pages/SportsPage'));
const BangladeshPage = lazy(() => import('./pages/BangladeshPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const LocalPlayerPage = lazy(() => import('./pages/LocalPlayerPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Fallback() {
  return (
    <div className="page">
      <PageLoading label="Loading…" />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="live-tv" element={<LiveTvPage />} />
          <Route path="channel/:slug" element={<ChannelPage />} />
          <Route path="countries" element={<CountriesPage />} />
          <Route path="country/:slug" element={<CountryPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="sports" element={<SportsPage />} />
          <Route path="sports/:sport" element={<SportsPage />} />
          <Route path="bangladesh-tv" element={<BangladeshPage />} />
          <Route path="bangladesh" element={<Navigate to="/bangladesh-tv" replace />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="local/:id" element={<LocalPlayerPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="legal" element={<LegalPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
