import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RetryErrorWrapperProps {
  children: ReactNode;
  maxRetries?: number;
}

interface RetryErrorWrapperState {
  hasError: boolean;
  retries: number;
  errorMessage: string;
}

/**
 * RetryErrorWrapper — Envuelve componentes lazy-loaded.
 * Si falla la importación dinámica, reintenta hasta maxRetries veces
 * y fuerza un reload completo como último recurso.
 * Para errores de props/lógica, muestra mensaje con botón de reintentar.
 */
export default class RetryErrorWrapper extends Component<RetryErrorWrapperProps, RetryErrorWrapperState> {
  constructor(props: RetryErrorWrapperProps) {
    super(props);
    this.state = { hasError: false, retries: 0, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<RetryErrorWrapperState> {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error): void {
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.message.includes('Loading chunk') ||
      error.message.toLowerCase().includes('mime type') ||
      error.message.toLowerCase().includes('mime');

    if (isChunkError && this.state.retries < (this.props.maxRetries ?? 2)) {
      console.warn(`[Retry] Chunk load failed (attempt ${this.state.retries + 1}). Retrying...`);
      this.setState(prev => ({ hasError: false, retries: prev.retries + 1, errorMessage: '' }));
    } else if (isChunkError) {
      console.warn('[Retry] Max retries reached. Reloading page...');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.unregister();
        });
      }
      setTimeout(() => window.location.reload(), 500);
    } else {
      console.error('[RetryErrorWrapper] Error en módulo:', error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, retries: 0, errorMessage: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 min-h-[300px]">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-stone-800">Error al cargar el módulo</p>
              <p className="text-xs text-stone-500 font-mono bg-stone-50 p-2 rounded-lg border border-stone-200 break-all">
                {this.state.errorMessage || 'Error desconocido'}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-[#4A2D1B] hover:bg-[#6B4A35] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
