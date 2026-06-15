import * as React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', this.props.moduleName, error, info);
    this.setState({ errorInfo: info.componentStack || null });
    // Report to Vercel analytics or console
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: this.props.moduleName,
          message: error.message,
          stack: error.stack?.slice(0, 500),
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      window.sessionStorage.clear();
      window.localStorage.clear();
    } catch {}
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Failed to fetch') ||
                           this.state.error?.message?.includes('Importing a module') ||
                           this.state.error?.message?.includes('Loading chunk');
      const isAuthError = this.state.error?.message?.includes('Supabase') ||
                          this.state.error?.message?.includes('auth') ||
                          this.state.error?.message?.includes('session');

      return (
        <div className="min-h-screen bg-[#F5F1E9] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full text-center space-y-5 shadow-xl border border-stone-200">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
              isChunkError ? 'bg-amber-100' : isAuthError ? 'bg-purple-100' : 'bg-red-100'
            }`}>
              <span className="text-3xl">
                {isChunkError ? '🔄' : isAuthError ? '🔐' : '⚠️'}
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h2 className="text-lg font-black text-stone-800 tracking-tight">
                {isChunkError ? 'Actualización disponible' :
                 isAuthError ? 'Error de conexión' :
                 `Error en ${this.props.moduleName?.toUpperCase() || 'la aplicación'}`}
              </h2>
              <p className="text-sm text-stone-500">
                {isChunkError ? 'Se detectó una nueva versión. Recargá la página para actualizar.' :
                 isAuthError ? 'Verificá la conexión a Internet y recargá.' :
                 'Ocurrió un error inesperado. Podés reintentarlo o recargar.'}
              </p>
            </div>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details className="text-left bg-stone-50 rounded-xl p-3 border border-stone-200">
                <summary className="text-[11px] font-bold text-stone-500 cursor-pointer select-none">
                  Detalles del error
                </summary>
                <pre className="mt-2 text-[10px] font-mono text-red-600 whitespace-pre-wrap break-all leading-relaxed">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack?.split('\n').slice(0, 4).join('\n')}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-center gap-3">
                <button onClick={this.handleRetry}
                  className="px-5 py-2.5 bg-[#624A3E] hover:bg-[#503C32] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-sm">
                  Reintentar
                </button>
                <button onClick={this.handleReload}
                  className="px-5 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer">
                  Recargar página
                </button>
              </div>
              <button onClick={this.handleResetStorage}
                className="text-[10px] text-stone-400 hover:text-red-500 underline transition-colors cursor-pointer">
                Limpiar cache local y recargar
              </button>
            </div>

            {/* Module info */}
            <p className="text-[9px] text-stone-400 font-mono">
              {this.props.moduleName ? `${this.props.moduleName} · ` : ''}
              {new Date().toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
