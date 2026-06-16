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

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          className="m-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            !
          </div>
          <h2 className="mb-2 text-base font-black text-rose-900">
            No se pudo cargar este módulo
          </h2>
          <p className="mx-auto mb-4 max-w-xl text-sm leading-relaxed text-rose-800/85">
            Vuelva a intentarlo. Si el problema continúa, informe el módulo
            {this.props.moduleName ? ` "${this.props.moduleName}"` : ''} al equipo de soporte.
          </p>
          <details className="mx-auto mb-4 max-w-xl rounded-2xl bg-white/70 p-3 text-left text-xs text-rose-700">
            <summary className="cursor-pointer font-bold text-rose-900">Detalle técnico</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {this.state.error?.message ?? 'Error desconocido'}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl bg-rose-700 px-5 py-2 text-sm font-black text-white shadow-sm transition-colors hover:bg-rose-800 focus-visible-ring"
          >
            Reintentar
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
