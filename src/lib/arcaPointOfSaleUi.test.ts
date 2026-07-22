import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('el formulario ARCA no muestra un punto de venta provisional', () => {
  const source = readFileSync('src/components/SistemaModule.tsx', 'utf8');

  assert.match(source, /useState\(''\)/);
  assert.match(source, /placeholder=\{arcaLoading \? 'Cargando\.\.\.' : 'Ej\. 1'\}/);
  assert.match(source, /disabled=\{arcaLoading\}/);
  assert.doesNotMatch(source, /setArcaPuntoVenta\] = useState\(['"]2['"]\)/);
});

test('facturacion no inventa el punto 1 y bloquea Factura C hasta validarlo con ARCA', () => {
  const source = readFileSync('src/components/FacturacionModule.tsx', 'utf8');

  assert.doesNotMatch(source, /arcaStatus\?\.puntoVenta \|\| 1/);
  assert.doesNotMatch(source, /arcaStatus\.puntoVenta \|\| 1/);
  assert.match(source, /pointOfSaleValid !== true/);
  assert.match(source, /Puntos CAE activos informados por ARCA/);
});
