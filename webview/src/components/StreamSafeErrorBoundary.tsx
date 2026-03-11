import { Component, ErrorInfo, ReactNode } from 'react';

interface SuppressedError {
  message: string;
  stack?: string;
  componentStack?: string;
  renderKey: string | number;
  timestamp: number;
}

declare global {
  interface Window {
    __suppressedRenderErrors?: SuppressedError[];
  }
}

interface Props {
  children: ReactNode;
  renderKey: string | number;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorRenderKey: string | number | null;
}

export class StreamSafeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorRenderKey: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (state.hasError && props.renderKey !== state.errorRenderKey) {
      return { hasError: false, errorRenderKey: null };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const entry: SuppressedError = {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      renderKey: this.props.renderKey,
      timestamp: Date.now(),
    };

    const errors = window.__suppressedRenderErrors ??= [];
    errors.push(entry);

    console.error(
      '[StreamSafe] Suppressed render error (%d total):',
      errors.length,
      error.message,
    );

    this.setState({ errorRenderKey: this.props.renderKey });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
