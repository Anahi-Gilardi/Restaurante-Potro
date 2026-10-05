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
  assert.strictEqual(session.registros_totales.propina, 0);
  assert.strictEqual(session.efectivo, 12000);
  assert.strictEqual(session.propina, 0);
  assert.strictEqual(session.transferencia, 0);
});

test('updateSales acumula efectivo, propina y transferencia correctamente', async () => {
  const storage: Record<string, string> = {
    el_patron_caja_activa: JSON.stringify({
      id_cierre: 'cie_test_update',
      fecha_apertura: '2026-10-05 10:00',
      fecha_cierre: null,
      monto_apertura: 25000,
      monto_ventas: 0,
      efectivo: 0,
      propina: 0,
      transferencia: 0,
      usuario_cajero: 'Cajero Test',
      registros_totales: {
        efectivo: 0,
        debito: 0,
        credito: 0,
        transferencia: 0,
        mercadopago: 0,
        propina: 0
      }
    })
  };

  const mockStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; }
  };
  global.localStorage = mockStorage as any;
  global.window = {
    localStorage: mockStorage,
    dispatchEvent: () => true
  } as any;

  // 1. Cobro en efectivo con propina
  await cajaService.updateSales(
    11000,
    { efectivo: 11000, debito: 0, credito: 0, transferencia: 0, mercadopago: 0 },
    1000
  );

  let session = cajaService.getOpenSession();
  assert.ok(session);
  assert.strictEqual(session.monto_ventas, 11000);
  assert.strictEqual(session.efectivo, 11000);
  assert.strictEqual(session.propina, 1000);
  assert.strictEqual(session.transferencia, 0);
  assert.strictEqual(session.registros_totales?.efectivo, 11000);
  assert.strictEqual(session.registros_totales?.propina, 1000);

  // 2. Cobro por transferencia
  await cajaService.updateSales(
    15000,
    { efectivo: 0, debito: 0, credito: 0, transferencia: 15000, mercadopago: 0 },
    500
  );

  session = cajaService.getOpenSession();
  assert.ok(session);
  assert.strictEqual(session.monto_ventas, 26000);
  assert.strictEqual(session.efectivo, 11000);
  assert.strictEqual(session.propina, 1500);
  assert.strictEqual(session.transferencia, 15000);
  assert.strictEqual(session.registros_totales?.transferencia, 15000);
  assert.strictEqual(session.registros_totales?.propina, 1500);

  // 3. Cierre de caja
  const closed = await cajaService.close(36000, 'Arqueo exitoso');
  assert.strictEqual(closed.efectivo, 11000);
  assert.strictEqual(closed.propina, 1500);
  assert.strictEqual(closed.transferencia, 15000);
  assert.strictEqual(closed.monto_ventas, 26000);
});


