import { Component, type ReactNode } from "react";

// Catches render-time crashes so users see a friendly message instead of a
// blank white screen, and reports to Sentry IF it's loaded (drop the Sentry
// loader script into index.html with your DSN to enable — no code change here).
declare global {
  interface Window {
    Sentry?: { captureException: (e: unknown) => void };
  }
}

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (typeof window !== "undefined" && window.Sentry?.captureException) {
      window.Sentry.captureException(error);
    } else {
      // eslint-disable-next-line no-console
      console.error("Unhandled UI error:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground px-6 text-center gap-4">
          <span className="text-3xl font-bold text-primary">₿</span>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            We hit an unexpected error. Reloading usually fixes it — if it keeps happening, reach out from your member portal.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
