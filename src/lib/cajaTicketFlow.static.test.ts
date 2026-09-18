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

test('el modulo Caja y useCaja incorporan el boton y modal de auditoria de tickets para el dueno', () => {
  assert.match(cajaModule, /Reporte de Tickets \(PDF\)/);
  assert.match(cajaModule, /Descargar Tickets del Turno \(PDF\)/);
  assert.match(cajaModule, /showTicketsAuditModal/);
  assert.match(cajaModule, /handleDownloadTicketsAuditPDF/);
  assert.match(cajaHook, /handleDownloadTicketsAuditPDF/);
  assert.match(cajaHook, /showTicketsAuditModal/);
});

test('pdfService cuenta con la funcion oficial exportTicketsAuditReportPDF con soporte para ARCA y sin ARCA', () => {
  assert.match(pdfService, /exportTicketsAuditReportPDF/);
  assert.match(pdfService, /REPORTE OFICIAL DE TICKETS Y COBROS \(CONTROL DEL PROPIETARIO\)/);
  assert.match(pdfService, /CON ARCA \(CAE FISCAL\)/);
  assert.match(pdfService, /TICKETS INTERNOS \(SIN ARCA\)/);
  assert.match(pdfService, /TOTAL AUDITADO/);
});

test('Caja no borra la comanda del salon al imprimir ticket hasta confirmar el cierre de mesa', () => {
  assert.match(cajaHook, /showConfirmCerrarMesaModal/);
  assert.match(cajaHook, /pendingCloseMesaData/);
  assert.match(cajaHook, /handleConfirmCerrarMesa/);
  assert.match(cajaHook, /handleKeepMesaOpen/);
  assert.match(cajaModule, /¿Confirmar comanda cobrada y cerrar mesa\?/);
  assert.match(cajaModule, /Confirmar y Cerrar Mesa/);
  assert.match(cajaModule, /Mantener Mesa Abierta/);

  // onFacturarMesa solo debe ser ejecutado dentro de handleConfirmCerrarMesa indicando alreadyUpdatedInCaja=true
  const confirmCloseIdx = cajaHook.indexOf('const handleConfirmCerrarMesa =');
  const onFacturarIdx = cajaHook.indexOf('onFacturarMesa(pedidoId, true);');
  assert.ok(confirmCloseIdx !== -1, 'handleConfirmCerrarMesa debe existir');
  assert.ok(onFacturarIdx > confirmCloseIdx, 'onFacturarMesa(pedidoId, true) debe ejecutarse dentro de handleConfirmCerrarMesa');
});

test('Caja inicia con propina al 0% por defecto y la restablece a 0% tras cerrar la mesa', () => {
  assert.match(cajaHook, /useState<number>\(0\); \/\/ Default 0% \(manual\)/);
  assert.match(cajaHook, /setPropinaPorcentaje\(0\);/);
  assert.doesNotMatch(cajaModule, /10% \(Rec\.\)/, 'No debe sugerir forzosamente 10%');
});

test('pedidosService y App evitan duplicados en Google Sheets al cobrar y editar', () => {
  const pedidosServiceContent = readFileSync(resolve('src/services/pedidosService.ts'), 'utf8');
  assert.doesNotMatch(pedidosServiceContent, /sheetBatchInsert\('pedido_detalle'/, 'No debe usar batchInsert ciego que duplica filas');
  assert.match(pedidosServiceContent, /sheetUpsertRow\('pedido_detalle', det\)/);
});


