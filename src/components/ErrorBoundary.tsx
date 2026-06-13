import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
  console.error('[ErrorBoundary]', this.props.moduleName ?? 'unknown', error, info);
}

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          margin: '24px', padding: '24px',
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '16px', textAlign: 'center'
        }}>
          <p style={{ fontSize: '2rem', margin: '0 0 8px' }}>⚠️</p>
          <h2 style={{ color: '#b91c1c', fontWeight: 900, margin: '0 0 12px' }}>
            Error en: {this.props.moduleName?.toUpperCase() ?? 'MÓDULO'}
          </h2>
          <pre style={{
            color: '#ef4444', fontSize: '0.75rem', background: '#fee2e2',
            padding: '12px', borderRadius: '8px',
            textAlign: 'left', whiteSpace: 'pre-wrap', margin: '0 0 12px'
          }}>
            {this.state.error?.message ?? 'Error desconocido'}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', background: '#dc2626',
              color: 'white', border: 'none', borderRadius: '10px',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            Reintentar módulo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}