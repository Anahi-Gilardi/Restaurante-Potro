import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const cajaHook = readFileSync(resolve('src/features/caja/hooks/useCaja.ts'), 'utf8');
const cajaModule = readFileSync(resolve('src/components/CajaModule.tsx'), 'utf8');
const facturacionModule = readFileSync(resolve('src/components/FacturacionModule.tsx'), 'utf8');
const pdfService = readFileSync(resolve('src/services/pdfService.ts'), 'utf8');
const printerService = readFileSync(resolve('src/services/printerService.ts'), 'utf8');

test('Caja registra tickets internos sin llamar a la API fiscal', () => {
  assert.doesNotMatch(cajaHook, /createArcaInvoice|getArcaStatus|parseFiscalCustomerDocument/);
  assert.match(cajaHook, /internalTicketPreview/);
  assert.match(cajaHook, /tipoComprobante: 'ticket_consumo'/);
  assert.match(cajaHook, /tipo: 'ticket'/);
});

test('la interfaz separa ticket normal y Factura C real', () => {
  assert.match(cajaModule, /Cobrar e Imprimir Ticket Normal/);
  assert.match(cajaModule, /Ir a Facturación/);
  assert.doesNotMatch(cajaModule, /Factura C con CAE/);
  assert.match(facturacionModule, /getInvoiceablePaidTickets/);
  assert.match(facturacionModule, /Emitir Factura C Real/);
});

test('el PDF térmico no agrega CAE ni QR fiscal', () => {
  const thermalStart = pdfService.indexOf('generateThermalTicket(data: TicketData');
  const thermalEnd = pdfService.indexOf('exportShiftClosePDF', thermalStart);
  const thermalSource = pdfService.slice(thermalStart, thermalEnd);
  assert.match(thermalSource, /TICKET DE CONSUMO/);
  assert.match(thermalSource, /DOCUMENTO NO VALIDO COMO FACTURA/);
  assert.doesNotMatch(thermalSource, /doc\.addImage\(qrImage|CAE:/);
});

test('el ticket interno PDF no expone los datos fiscales del titular', () => {
  const thermalStart = pdfService.indexOf('generateThermalTicket(data: TicketData');
  const thermalEnd = pdfService.indexOf('exportShiftClosePDF', thermalStart);
  const thermalSource = pdfService.slice(thermalStart, thermalEnd);
  assert.doesNotMatch(thermalSource, /data\.razonSocial|data\.cuit|data\.direccion|data\.telefono|data\.email/);
});

test('la impresión térmica ESC-POS tampoco expone datos fiscales del titular', () => {
  const escPosStart = printerService.indexOf('generateEscPosText(data: TicketData');
  const escPosEnd = printerService.indexOf('getFailedPrints()', escPosStart);
  const escPosSource = printerService.slice(escPosStart, escPosEnd);
  assert.match(escPosSource, /TICKET DE CONSUMO/);
  assert.match(escPosSource, /DOCUMENTO NO VALIDO COMO FACTURA/);
  assert.doesNotMatch(escPosSource, /data\.razonSocial|data\.cuit|data\.direccion|data\.telefono|data\.email/);
});

test('la factura A4 mantiene los datos fiscales exigidos', () => {
  const invoiceStart = pdfService.indexOf('generateA4Invoice(data: TicketData');
  const invoiceEnd = pdfService.indexOf('generateThermalTicket(data: TicketData', invoiceStart);
  const invoiceSource = pdfService.slice(invoiceStart, invoiceEnd);
  assert.match(invoiceSource, /data\.razonSocial/);
  assert.match(invoiceSource, /data\.cuit/);
  assert.match(invoiceSource, /data\.direccion/);
  assert.match(invoiceSource, /condicionIvaEmisor/);
  assert.match(invoiceSource, /ingresosBrutos/);
  assert.match(invoiceSource, /inicioActividades/);
});
