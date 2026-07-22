/**
 * Utility to force a clean page reload by:
 * 1. Clearing all registered Service Workers.
 * 2. Clearing all cache storages.
 * 3. Appending a cache-busting timestamp query parameter.
 * 4. Guarding against infinite reload loops using sessionStorage (max 1 reload per minute).
 */
export async function forceCleanReload(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const lastReload = sessionStorage.getItem('last_auto_reload');
  const now = Date.now();

  // Do not trigger another automatic recovery while the current one is settling.
  if (lastReload && now - parseInt(lastReload, 10) < 60000) {
    console.error('[PWA] Infinite reload loop prevented. Last auto-reload was less than one minute ago.');
    return false;
  }

  sessionStorage.setItem('last_auto_reload', String(now));

  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    // 2. Clear all cache storages
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    
  } catch (e) {
    console.warn('[PWA] Error clearing SW or caches:', e);
  }

  // 3. Force clean reload with cache buster query parameter
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('cb', String(now));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  
  return true;
}
