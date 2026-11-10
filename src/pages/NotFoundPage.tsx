import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { useSeo } from '../lib/seo';

export default function NotFoundPage() {
  useSeo({
    title: 'Page not found | WorldStream TV',
    description: 'The page you requested was not found.',
    noindex: true,
  });
  return (
    <div className="page">
      <EmptyState
        icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
        title="Page not found"
        description="This page does not exist, or the channel or country has no approved streams right now."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/live-tv" className="btn-primary">
              Browse live TV
            </Link>
            <Link to="/search" className="btn-secondary">
              Search
            </Link>
          </div>
        }
      />
    </div>
  );
}
