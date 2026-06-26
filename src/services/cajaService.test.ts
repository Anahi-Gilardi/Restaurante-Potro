import { test, mock } from 'node:test';
import assert from 'node:assert';
import { cajaService } from './cajaService';

test('getOpenSession defensive normalization works with corrupted or string values', () => {
  // Mock localStorage
  const storage: Record<string, string> = {
    el_patron_caja_activa: JSON.stringify({
      id_cierre: 'cie_123',
      fecha_apertura: '2026-06-26 12:00',
      fecha_cierre: null,
      monto_apertura: '15000', // string, should be parsed to number
      monto_ventas: '2500',   // string, should be parsed to number
      monto_real: null,
      diferencia: null,
      usuario_cajero: 'Tester',
      registros_totales: {
        efectivo: '12000',     // string, should be parsed to number
        debito: '3000'         // string, should be parsed to number
        // other fields are missing
      }
    })
  };

  global.window = {} as any;
  global.localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; }
  } as any;

  const session = cajaService.getOpenSession();
  
  assert.ok(session);
  assert.strictEqual(session.monto_apertura, 15000);
  assert.strictEqual(session.monto_ventas, 2500);
  assert.ok(session.registros_totales);
  assert.strictEqual(session.registros_totales.efectivo, 12000);
  assert.strictEqual(session.registros_totales.debito, 3000);
  // Default fallback values for missing keys
  assert.strictEqual(session.registros_totales.credito, 0);
  assert.strictEqual(session.registros_totales.transferencia, 0);
  assert.strictEqual(session.registros_totales.mercadopago, 0);
});
