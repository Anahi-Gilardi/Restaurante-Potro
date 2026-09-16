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
  const nowIso = new Date().toISOString();
  const store: Record<string, string> = {
    'el_patron_failed_prints': JSON.stringify([
      { id: 'p1', data: sampleTicket, timestamp: nowIso },
      { id: 'p2', data: sampleTicket, timestamp: nowIso }
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

test('getFailedPrints descarta ítems con más de 24 horas y acota a un máximo de 5', () => {
  const now = Date.now();
  const oldTimestamp = new Date(now - 30 * 60 * 60 * 1000).toISOString(); // 30 horas atrás
  const recentTimestamp = new Date(now - 10 * 60 * 1000).toISOString(); // 10 min atrás

  const store: Record<string, string> = {
    'el_patron_failed_prints': JSON.stringify([
      { id: 'old1', data: sampleTicket, timestamp: oldTimestamp },
      { id: 'r1', data: sampleTicket, timestamp: recentTimestamp },
      { id: 'r2', data: sampleTicket, timestamp: recentTimestamp },
      { id: 'r3', data: sampleTicket, timestamp: recentTimestamp },
      { id: 'r4', data: sampleTicket, timestamp: recentTimestamp },
      { id: 'r5', data: sampleTicket, timestamp: recentTimestamp },
      { id: 'r6', data: sampleTicket, timestamp: recentTimestamp }
    ])
  };

  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  const prints = printerService.getFailedPrints();
  // El viejo debe ser descartado, y de los 6 recientes solo quedan los últimos 5
  assert.equal(prints.length, 5);
  assert.equal(prints[0].id, 'r2');
  assert.equal(prints[4].id, 'r6');
});

test('generateSingleTicketEscPos formatea correctamente una Factura C ARCA para ticketera termica', () => {
  const fiscalTicket: TicketData = {
    nombreComercial: 'El Patron Restaurante',
    razonSocial: 'BELLA ORIANA',
    cuit: '27-42694613-6',
    direccion: 'Fotheringham 33, CP 5800, Río Cuarto, Córdoba',
    telefono: '+54 9 358 430-3541',
    email: 'bellaoriana47@gmail.com',
    nroComprobante: 'FC-0004-00000012',
    idPedido: 501,
    mesa: 'Mesa 7',
    mozo: 'Lucas',
    cajero: 'Caja 1',
    fechaHora: '16/09/2026 14:30',
    tipoComprobante: 'factura_c',
    puntoVenta: 4,
    numeroFiscal: 12,
    cae: '74392819284729',
    vto: '20260926',
    clienteNombre: 'JUAN PEREZ',
    clienteCuit: '20-30405060-7',
    clienteDocumentoTipo: 'CUIT',
    condicionIvaReceptor: 'Consumidor Final',
    items: [
      { cantidad: 2, descripcion: 'Empanadas de Carne', precio_unitario: 4500, subtotal: 9000 },
      { cantidad: 1, descripcion: 'Ojo de bife al aligot', precio_unitario: 38600, subtotal: 38600 }
    ],
    subtotal: 47600,
    descuento: 0,
    propina: 0,
    iva: 0,
    total: 47600,
    metodosPago: [{ metodo: 'efectivo', monto: 47600 }],
    vuelto: 0,
    mensajePie: 'Comprobante electrónico autorizado por ARCA.'
  };

  const config: PrinterConfig = {
    printerName: 'POS58 Printer',
    paperWidth: '58mm',
    autoCut: true,
    openDrawer: true,
    copies: 1
  };

  const esc = printerService.generateSingleTicketEscPos(fiscalTicket, config, 'cliente', true);

  // Nombre comercial "EL PATRON" destacado
  assert.match(esc, /EL PATRON/);
  // Datos del emisor
  assert.match(esc, /BELLA ORIANA/);
  assert.match(esc, /27-42694613-6/);
  // Recuadro fiscal de Letra C
  assert.match(esc, /\[ C \]  COD\. 011/);
  // Comprobante y numeración
  assert.match(esc, /FACTURA C/);
  assert.match(esc, /PUNTO VTA: 0004  NRO: 00000012/);
  // Datos receptor
  assert.match(esc, /SEÑOR\/ES: JUAN PEREZ/);
  assert.match(esc, /CUIT: 20-30405060-7/);
  // Artículos y total
  assert.match(esc, /Empanadas de Carne/);
  assert.match(esc, /TOTAL:/);
  // Datos fiscales ARCA
  assert.match(esc, /ARCA - Comprobante Autorizado/);
  assert.match(esc, /CAE Nº: 74392819284729/);
  assert.match(esc, /Fecha Vto\. CAE: 26\/09\/2026/);
  assert.match(esc, /www\.afip\.gob\.ar\/fe\/qr\//);
});


