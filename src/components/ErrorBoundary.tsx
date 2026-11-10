import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('WorldStream TV error boundary:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-300">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-50">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
