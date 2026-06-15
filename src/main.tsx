import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProviders } from './context/AppContext';
import './index.css';
import './styles/mobile.css';

// Global handler for dynamic import failures (chunk loading errors after deploy)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
      event.reason?.message?.includes('Importing a module script failed') ||
      event.reason?.message?.includes('Loading chunk')) {
    event.preventDefault();
    console.warn('[PWA] Chunk load error detected — reloading for new version.');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.unregister();
      });
    }
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
