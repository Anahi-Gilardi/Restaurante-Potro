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

test('el movimiento de mesas no reconstruye el modulo en cada pixel', () => {
  assert.match(mesasModule, /setPointerCapture\(e\.pointerId\)/);
  assert.match(mesasModule, /requestAnimationFrame\(\(\) => paintDraggedMesa/);
  assert.match(mesasModule, /onPointerCancel=\{finishDrag\}/);

  const pointerMove = mesasModule.match(
    /const handleSvgPointerMove =[\s\S]*?\n\s*};/,
  );
  assert.ok(pointerMove, 'debe existir el controlador de movimiento por puntero');
  assert.doesNotMatch(pointerMove[0], /setVisualMesas/);
});

test('el historial no duplica el prefijo Mesa', () => {
  assert.match(mesasModule, /getMesaDisplayName\(mov\.mesa\)/);
  assert.doesNotMatch(mesasModule, />Mesa \{mov\.mesa\} - \{mov\.accion\}</);
});
