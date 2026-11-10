import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyTheme, usePreferences } from './stores/preferences';
import './styles/index.css';

applyTheme(usePreferences.getState().theme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing.');

// Prerendered HTML is replaced by the client app; it exists for crawlers and no-JS visitors.
container.innerHTML = '';

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
