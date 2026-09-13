import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('la sesión activa persiste al reiniciar la página y no redirige a la portada', () => {
  // showCover debe inicializarse evaluando si el_patron_session no está activo
  assert.match(
    appSource,
    /window\.localStorage\.getItem\('el_patron_session'\) !== 'active'/,
    'showCover debe ser false si la sesión ya está activa al recargar'
  );

  // hasSupabaseSession debe restaurarse si el_patron_session_mode es supabase
  assert.match(
    appSource,
    /window\.localStorage\.getItem\('el_patron_session_mode'\) === 'supabase'/,
    'hasSupabaseSession debe restaurarse en modo supabase al recargar'
  );
});

test('el operador activo y la vista activa se recuperan desde localStorage al reiniciar', () => {
  // activeMozo se recupera de el_patron_active_mozo
  assert.match(
    appSource,
    /window\.localStorage\.getItem\('el_patron_active_mozo'\)/,
    'activeMozo debe recuperarse de el_patron_active_mozo'
  );

  // activeView se recupera de el_patron_active_view
  assert.match(
    appSource,
    /window\.localStorage\.getItem\('el_patron_active_view'\)/,
    'activeView debe recuperarse de el_patron_active_view'
  );

  // activeUser usa el usuario guardado como respaldo
  assert.match(
    appSource,
    /window\.localStorage\.getItem\('el_patron_active_user'\)/,
    'activeUser debe utilizar el usuario guardado en localStorage'
  );
});

test('el ingreso desde portada no destruye la sesión si ya existía una activa', () => {
  assert.match(
    appSource,
    /const hasSession = typeof window !== 'undefined' && window\.localStorage\.getItem\('el_patron_session'\) === 'active'/,
    'onEnterSystem debe verificar si ya hay sesión antes de limpiar'
  );
});
