import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  key?: React.Key;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public props!: Props;
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
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[50vh]">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-4">Something went wrong</h2>
          <p className="text-white/60 max-w-md mx-auto mb-8">
            An unexpected error occurred. We've been notified. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Refresh Page</span>
          </button>
        </div>
      );
    }

    return this.props.children || null;
  }
}

