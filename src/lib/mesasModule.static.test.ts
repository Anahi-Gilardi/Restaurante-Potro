import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appModule = readFileSync('src/App.tsx', 'utf8');
const mesasModule = readFileSync('src/components/MesasModule.tsx', 'utf8');

test('App usa el modulo completo de Mesas y no el prototipo anterior', () => {
  assert.match(appModule, /<MesasModule/);
  assert.doesNotMatch(appModule, /MesasProto1/);
});

test('el modo demo no consulta ni modifica mesas y reservas reales', () => {
  assert.match(appModule, /persistenceEnabled=\{!isDemoSession\}/);
  assert.match(
    mesasModule,
    /const hasRemoteDb = \(\) => persistenceEnabled && Boolean\(tryGetActiveSupabaseClient\(\)\)/,
  );
  assert.match(mesasModule, /: Promise\.resolve\(\[\]\),/);
});

test('la hidratacion inicial no reemplaza estados ni comandas de las mesas', () => {
  assert.match(
    mesasModule,
    /useRef<string \| null>\(mesaSnapshotKey\(POSICIONES_INICIALES\)\)/,
  );
  assert.match(mesasModule, /if \(!hydrationReadyRef\.current\) return;/);
  assert.match(mesasModule, /comensales: m\.comensales/);
  assert.match(mesasModule, /generarPosicionNuevaMesa\(zona, acc\)/);
});

test('el plano normaliza nombres y ajusta etiquetas largas de mesas', () => {
  assert.match(mesasModule, /replace\(\/\^mesa\\s\+\/i, ''\)/);
  assert.match(mesasModule, /const planFontSize = Math\.min\(18, Math\.max\(9,/);
  assert.match(mesasModule, /getMesaDisplayName\(m\.numero_mesa\)/);
});
