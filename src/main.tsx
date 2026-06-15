import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProviders } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import './styles/mobile.css';

// Global error handlers — runs BEFORE React mounts
window.addEventListener('error', (e) => {
  // Catch unhandled runtime errors
  console.error('[Root] Uncaught error:', e.error || e.message);
  // Don't reload here — let ErrorBoundary handle it
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason?.message?.includes('Importing a module script failed') ||
      event.reason?.message?.includes('Loading chunk')) {
    event.preventDefault();
    console.warn('[PWA] Chunk load error — reloading.');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.unregister();
      });
    }
    window.location.reload();
  }
});

// Log render-blocking errors to help debug white screen
try {
  const root = document.getElementById('root');
  if (!root) {
    document.body.innerHTML = `<div style="padding:2rem;text-align:center;font-family:sans-serif">
      <h2>Error: #root no encontrado</h2>
      <p>Verificá que index.html tenga el div correcto.</p>
    </div>`;
  }
} catch (e) {
  document.body.innerHTML = `<div style="padding:2rem;text-align:center">
    <h2>Error crítico al iniciar</h2>
    <pre>${String(e)}</pre>
  </div>`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary moduleName="ROOT">
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>,
);
