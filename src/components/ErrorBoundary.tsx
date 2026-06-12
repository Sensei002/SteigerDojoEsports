import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

/** App-level error boundary so a render crash shows a recoverable screen. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for an error reporting service (Sentry, etc.)
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-black px-6 text-center">
          <FiAlertTriangle className="text-brand-red" size={56} />
          <h1 className="heading-display text-2xl text-white">Something went wrong</h1>
          <p className="max-w-md text-sm text-brand-gray">
            {this.state.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-redDark"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
