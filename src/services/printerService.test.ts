import assert from 'node:assert/strict';
import test from 'node:test';
import { printerService } from './printerService';
import type { TicketData, PrinterConfig } from '../types';

const sampleTicket: TicketData = {
  nombreComercial: 'El Patron Restaurante',
  razonSocial: 'El Patron S.R.L.',
  cuit: '30-71829340-9',
  direccion: 'Ruta 148 Km 9.5',
  telefono: '+54 9 3584 37-3711',
  email: 'contacto@elpatron.com.ar',
  nroComprobante: 'TICK-001-00042',
  idPedido: 1042,
  mesa: 'Mesa 4',
  mozo: 'Enzo',
  cajero: 'Admin',
  fechaHora: '11/09/2026 18:30',
  items: [
    { cantidad: 2, descripcion: 'Ojo de bife al aligot', precio_unitario: 38600, subtotal: 77200 },
    { cantidad: 1, descripcion: 'Provolone parrillero', precio_unitario: 16700, subtotal: 16700 }
  ],
  subtotal: 93900,
  descuento: 0,
  propina: 9390,
  iva: 0,
  total: 103290,
  metodosPago: [{ metodo: 'efectivo', monto: 103290 }],
  vuelto: 0,
  tipoComprobante: 'ticket_consumo',
  mensajePie: 'GRACIAS POR SU VISITA'
};

test('getDefaultConfig devuelve 2 copias por defecto para Global TP-POS58-USB', () => {
  const config = printerService.getDefaultConfig();
  assert.equal(config.copies, 2);
  assert.equal(config.paperWidth, '58mm');
  assert.equal(config.printerName, 'POS58 Printer');
});

test('generateEscPosText con 2 copias genera 1 ticket para el cliente y 1 ticket para el dueño con corte intermedio', () => {
  const config: PrinterConfig = {
    printerName: 'POS58 Printer',
    paperWidth: '58mm',
    autoCut: true,
    openDrawer: true,
    copies: 2
  };

  const esc = printerService.generateEscPosText(sampleTicket, config);

  // Verificaciones de Copia 1 (Cliente)
  assert.match(esc, /\*\*\* ORIGINAL - CLIENTE \*\*\*/);
  assert.match(esc, /DESTINO: COMPROBANTE CLIENTE/);
  assert.match(esc, /¡Muchas gracias por su visita!/);

  // Verificaciones de Corte Intermedio
  assert.match(esc, /\[ESC\/POS: PARTIAL_CUT_FEED_3LINES\]/);

  // Verificaciones de Copia 2 (Dueño)
  assert.match(esc, /\*\*\* DUPLICADO - CONTROL DUEÑO \*\*\*/);
  assert.match(esc, /DESTINO: CONTROL CAJA \/ DUEÑO/);
  assert.match(esc, /-- COPIA CONTROL CAJA \/ DUEÑO --/);

  // Verificación de apertura de cajón: sólo debe aparecer 1 vez
  const drawerKicks = (esc.match(/\[ESC\/POS: KICK OUT DRAWER_PORT1\]/g) || []).length;
  assert.equal(drawerKicks, 1, 'La apertura de gaveta debe ejecutarse únicamente en el primer ticket');

  // Verificación de ambos cortes (uno por cada copia)
  const cuts = (esc.match(/\[ESC\/POS: PARTIAL_CUT_FEED_3LINES\]/g) || []).length;
  assert.equal(cuts, 2, 'Debe emitir un corte por cada ticket');
});

test('generateEscPosText con 1 copia genera un único ticket', () => {
  const config: PrinterConfig = {
    printerName: 'POS58 Printer',
    paperWidth: '58mm',
    autoCut: true,
    openDrawer: true,
    copies: 1
  };

  const esc = printerService.generateEscPosText(sampleTicket, config);

  assert.doesNotMatch(esc, /\*\*\* DUPLICADO - CONTROL DUEÑO \*\*\*/);
  const cuts = (esc.match(/\[ESC\/POS: PARTIAL_CUT_FEED_3LINES\]/g) || []).length;
  assert.equal(cuts, 1);
});

test('getDefaultConfig migra copias antiguas de 1 a 2 copias en localStorage', () => {
  const store: Record<string, string> = {
    'el_patron_printer_config': JSON.stringify({
      printerName: 'POS58 Printer',
      paperWidth: '58mm',
      autoCut: true,
      openDrawer: true,
      copies: 1
    })
  };

  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  const config = printerService.getDefaultConfig();
  assert.equal(config.copies, 2, 'Debe migrar copies: 1 a 2 automáticamente');
  const persisted = JSON.parse(store['el_patron_printer_config']);
  assert.equal(persisted.copies, 2, 'Debe haber guardado el valor 2 en localStorage');
});

test('clearFailedPrints vacía la cola de tickets fallidos de localStorage', () => {
  const store: Record<string, string> = {
    'el_patron_failed_prints': JSON.stringify([
      { id: 'p1', data: sampleTicket, timestamp: '2026-09-11T12:00:00Z' },
      { id: 'p2', data: sampleTicket, timestamp: '2026-09-11T12:05:00Z' }
    ])
  };

  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  assert.equal(printerService.getFailedPrints().length, 2);
  printerService.clearFailedPrints();
  assert.equal(printerService.getFailedPrints().length, 0);
  assert.equal(store['el_patron_failed_prints'], undefined);
});

