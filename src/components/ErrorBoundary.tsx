import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--bg-base)] text-[var(--text-primary)]">
          <h1 className="text-4xl font-serif text-[var(--accent-ember)] mb-4">Something went wrong.</h1>
          <p className="text-[var(--text-secondary)] font-mono max-w-lg">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="mt-8 px-6 py-2 bg-[var(--bg-hover)] border border-[var(--border-default)] rounded-md font-mono text-sm hover:border-[var(--accent-gold)] transition-colors text-[var(--text-primary)]"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
