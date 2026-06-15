import * as React from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', this.props.moduleName, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="m-6 p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
          <p className="text-3xl">⚠️</p>
          <h2 className="text-red-700 font-black text-lg uppercase tracking-tight">
            Error en módulo: {this.props.moduleName?.toUpperCase() ?? 'SISTEMA'}
          </h2>
          <div className="bg-red-100 text-red-600 text-xs font-mono p-3 rounded-xl text-left whitespace-pre-wrap max-w-lg mx-auto border border-red-200">
            {this.state.error?.message ?? 'Error desconocido'}
          </div>
          <p className="text-xs text-red-500 font-medium">
            {this.state.error?.stack?.split('\n').slice(0, 3).join('\n')}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="touch-target px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              Reintentar módulo
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="touch-target px-5 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
