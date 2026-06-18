import * as React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RecetasErrorBoundaryProps {
  children: ReactNode;
}

interface RecetasErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class RecetasErrorBoundary extends React.Component<RecetasErrorBoundaryProps, RecetasErrorBoundaryState> {
  constructor(props: RecetasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): RecetasErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Error desconocido en el recetario.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RecetasErrorBoundary]', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-black text-red-900">No se pudo cargar este recetario</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-red-700">
          Detectamos datos incompletos o un error inesperado al mostrar las recetas. El resto del sistema sigue disponible.
        </p>
        <details className="mx-auto mt-4 max-w-xl rounded-xl border border-red-100 bg-white p-3 text-left">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-red-700">
            Detalle técnico
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600">{this.state.message}</pre>
        </details>
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-red-800"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar recetario
        </button>
      </section>
    );
  }
}
