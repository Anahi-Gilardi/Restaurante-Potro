import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cajaHook = readFileSync('src/features/caja/hooks/useCaja.ts', 'utf8');
const cajaModule = readFileSync('src/components/CajaModule.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const mozoHook = readFileSync('src/features/salon/hooks/useMozoTerminal.ts', 'utf8');

test('Caja bloquea envios repetidos mientras persiste un cobro', () => {
  assert.match(cajaHook, /if \(checkoutInFlightRef\.current\) return;/);
  assert.match(cajaHook, /setIsCheckoutProcessing\(true\)/);
  assert.match(cajaHook, /finally \{[\s\S]*checkoutInFlightRef\.current = false;[\s\S]*setIsCheckoutProcessing\(false\)/);
  assert.match(cajaModule, /disabled=\{isCheckoutProcessing\}/);
});

test('la apertura de Caja queda vinculada al usuario autenticado', () => {
  assert.match(app, /<CajaModule[\s\S]*activeUser=\{activeUser\}/);
  assert.match(cajaModule, /operatorName: `\$\{activeUser\.nombre\} \$\{activeUser\.apellido\}`\.trim\(\)/);
  assert.match(cajaModule, /value=\{cashierNameInput\}[\s\S]*readOnly/);
  assert.match(cajaHook, /cajaService\.open\(amt, operatorName\)/);
});

test('Mozo conserva el carrito cuando la validacion final rechaza el pedido', () => {
  assert.match(mozoHook, /const created = await withCheckoutTimeout/);
  assert.match(mozoHook, /if \(created === false\)/);
  assert.match(mozoHook, /El pedido fue rechazado durante la validacion final/);
});
