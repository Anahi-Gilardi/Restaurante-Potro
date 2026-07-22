import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProviders } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import { forceCleanReload } from './lib/reloadHelper';
import './index.css';
import './styles/mobile.css';

const showChunkRecoveryOverlay = (message: string) => {
  if (document.getElementById('chunk-recovery-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'chunk-recovery-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#FAF7F0;color:#2d211b;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;font-family:sans-serif;z-index:99999';

  const panel = document.createElement('div');
  panel.style.cssText = 'max-width:500px;background:#fff;padding:2rem;border-radius:8px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);border:1px solid rgba(74,45,27,0.15)';

  const title = document.createElement('h2');
  title.textContent = 'Actualizacion pendiente';
  title.style.cssText = 'margin:0 0 .75rem;font-weight:900;color:#684638';

  const description = document.createElement('p');
  description.textContent = 'No pudimos cargar automaticamente la ultima version. Reintenta la carga desde este dispositivo.';
  description.style.cssText = 'margin:0 0 1.25rem;font-size:14px;color:#6b5a50;line-height:1.6';

  const detail = document.createElement('pre');
  detail.textContent = message;
  detail.style.cssText = 'background:#f9f9f7;padding:1rem;border-radius:6px;border:1px solid #e5e7eb;margin:0 0 1.25rem;font-size:11px;white-space:pre-wrap;word-break:break-word;color:#b91c1c;text-align:left';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Reintentar carga';
  retry.style.cssText = 'background:#684638;color:#fff;border:none;padding:.75rem 1.75rem;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px';
  retry.addEventListener('click', () => window.location.reload());

  panel.append(title, description, detail, retry);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
};

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
        showChunkRecoveryOverlay(event.reason?.message || 'Error al cargar un modulo de la aplicacion.');
      }
    }).catch(err => {
      console.error('Failed to run safe reload:', err);
      showChunkRecoveryOverlay(err instanceof Error ? err.message : String(err));
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

// Keep the current session stable when a new service worker takes control.
// A stale lazy chunk is recovered by the bounded handler above.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.info('[PWA] New service worker active. It will be used on the next navigation.');
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
