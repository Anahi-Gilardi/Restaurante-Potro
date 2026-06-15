import React, { Component, ReactNode } from 'react';

interface RetryErrorWrapperProps {
  children: ReactNode;
  maxRetries?: number;
}

interface RetryErrorWrapperState {
  hasError: boolean;
  retries: number;
}

/**
 * RetryErrorWrapper — Envuelve componentes lazy-loaded.
 * Si falla la importación dinámica, reintenta hasta maxRetries veces
 * y fuerza un reload completo como último recurso.
 */
export default class RetryErrorWrapper extends Component<RetryErrorWrapperProps, RetryErrorWrapperState> {
  constructor(props: RetryErrorWrapperProps) {
    super(props);
    this.state = { hasError: false, retries: 0 };
  }

  static getDerivedStateFromError(): Partial<RetryErrorWrapperState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Loading chunk');

    if (isChunkError && this.state.retries < (this.props.maxRetries ?? 2)) {
      console.warn(`[Retry] Chunk load failed (attempt ${this.state.retries + 1}). Retrying...`);
      this.setState(prev => ({ hasError: false, retries: prev.retries + 1 }));
    } else if (isChunkError) {
      console.warn('[Retry] Max retries reached. Reloading page...');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.unregister();
        });
      }
      setTimeout(() => window.location.reload(), 500);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-[#624A3E] border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Cargando módulo...</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
