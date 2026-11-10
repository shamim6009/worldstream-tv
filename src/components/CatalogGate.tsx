import type { ReactNode } from 'react';
import { useCatalog } from '../hooks/useCatalog';
import type { Catalog } from '../types/catalog';
import { ErrorState } from './ErrorState';
import { PageLoading } from './Loading';

/** Renders loading and error states for the catalog, then the page body. */
export function CatalogGate({ children }: { children: (catalog: Catalog) => ReactNode }) {
  const { data, isLoading, error, refetch } = useCatalog();

  if (isLoading) {
    return (
      <div className="page">
        <PageLoading />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="page">
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }
  return <>{children(data)}</>;
}
