import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProviders } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import { forceCleanReload } from './lib/reloadHelper';
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
    console.warn('[PWA] Chunk load error — reloading safely.');
    
    forceCleanReload().then(success => {
      if (!success) {
        // Show user-friendly overlay since auto-reload loop was blocked
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#FAF7F0;color:#4A2D1B;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center;font-family:sans-serif;z-index:99999;border:4px solid #C8956A';
        overlay.innerHTML = `
          <div style="max-width:500px;background:#fff;padding:2rem;border-radius:24px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);border:1px solid rgba(74,45,27,0.1)">
            <span style="font-size:3rem;display:block;margin-bottom:1rem">🔄</span>
            <h2 style="margin-bottom:0.75rem;font-weight:900;font-family:Cinzel,serif;color:#4A2D1B">Actualización Pendiente</h2>
            <p style="margin-bottom:1.5rem;font-size:14px;color:#6b5a50;line-height:1.6">No pudimos cargar automáticamente la última versión del sistema. Por favor, forzá una recarga manual en tu navegador.</p>
            <div style="background:#f9f9f7;padding:1rem;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:1.5rem;font-size:11px;font-family:monospace;word-break:break-all;color:#b91c1c;text-align:left">
              ${event.reason?.message || 'Error de importación dinámica de componentes (Vite Chunk Error)'}
            </div>
            <button onclick="window.location.reload(true)" style="background:#4A2D1B;color:#FAF7F0;border:none;padding:0.75rem 1.75rem;border-radius:12px;font-weight:bold;cursor:pointer;font-size:13px;box-shadow:0 4px 6px -1px rgba(74,45,27,0.2);transition:all 0.2s">
              Recargar página manualmente
            </button>
          </div>
        `;
        document.body.appendChild(overlay);
      }
    }).catch(err => {
      console.error('Failed to run safe reload:', err);
      window.location.reload();
    });
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

import { syncQueueService } from './services/syncQueueService';

// Initialize offline background sync queue
syncQueueService.initBackgroundSync();

// Auto-reload page when new service worker takes control (PWA autoUpdate)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
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
