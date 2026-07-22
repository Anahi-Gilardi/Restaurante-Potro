import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('la aplicacion no muestra mesas ni comandas de demostracion antes de Supabase', () => {
  assert.match(appSource, /useState<Mesa\[]>\(\[\]\)/);
  assert.match(appSource, /useState<Pedido\[]>\(\[\]\)/);
  assert.doesNotMatch(appSource, /useState<Mesa\[]>\(INITIAL_MESAS\)/);
  assert.doesNotMatch(appSource, /useState<Pedido\[]>\(INITIAL_PEDIDOS\)/);
  assert.match(appSource, /operationalDataStatus !== 'ready'/);
  assert.match(appSource, /Cargando datos reales desde Supabase/);
});

test('la hidratacion usa Supabase como fuente de verdad y conserva todos los campos de mesa', () => {
  assert.match(appSource, /await Promise\.all\(\[/);
  assert.match(appSource, /setMesas\(dbMesas \?\? \[\]\)/);
  assert.match(appSource, /setPedidos\(dbPedidos \?\? \[\]\)/);
  assert.doesNotMatch(appSource, /setMesas\(\(dbMesas \?\? \[\]\)\.map/);
  assert.match(appSource, /refreshed !== null && active/);
});

test('el entorno demo se hidrata solo despues de una sesion demo explicita', () => {
  assert.match(appSource, /el_patron_session_mode/);
  assert.match(appSource, /if \(showCover \|\| !isStreamlitLoggedIn \|\| !isDemoSession\) return/);
  assert.match(appSource, /setMesas\(INITIAL_MESAS\.map/);
  assert.match(appSource, /setPedidos\(INITIAL_PEDIDOS\.map/);
  assert.match(appSource, /window\.localStorage\.setItem\('el_patron_session_mode', mode\)/);
});
