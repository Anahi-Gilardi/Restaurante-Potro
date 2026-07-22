import assert from 'node:assert/strict';
import test from 'node:test';
import type { TicketData } from '../types';
import { fiscalReceiverView, validateFiscalTicketData } from './pdfService';

const fiscalTicket = (overrides: Partial<TicketData> = {}): TicketData => ({
  idPedido: 1,
  nroComprobante: 'C-00002-00000042',
  tipoComprobante: 'factura_c',
  fechaHora: '2026-07-21T20:30:00.000Z',
  mesa: 'Mesa 1',
  mozo: 'Mozo',
  cajero: 'Caja',
  nombreComercial: 'El Patron',
  razonSocial: 'Razon Social',
  cuit: '27426946136',
  direccion: 'Domicilio comercial',
  telefono: '',
  email: '',
  items: [{ descripcion: 'Cena', cantidad: 2, precio_unitario: 500, subtotal: 1000 }],
  subtotal: 1000,
  descuento: 0,
  propina: 0,
  iva: 0,
  total: 1000,
  metodosPago: [{ metodo: 'Efectivo', monto: 1000 }],
  vuelto: 0,
  mensajePie: '',
  cae: '74123456789012',
  vto: '20260731',
  qrData: '{"ver":1}',
  ...overrides,
});

test('valida CAE, QR y numeracion antes de generar la factura original', () => {
  assert.deepEqual(validateFiscalTicketData(fiscalTicket()), { pointOfSale: 2, voucherNumber: 42 });
});

test('impide presentar como factura un PDF sin autorizacion fiscal completa', () => {
  assert.throws(() => validateFiscalTicketData(fiscalTicket({ cae: undefined })), /CAE valido/);
  assert.throws(() => validateFiscalTicketData(fiscalTicket({ qrData: undefined })), /QR obligatorio/);
});

test('impide reimprimir un detalle que no coincide con el total autorizado', () => {
  assert.throws(() => validateFiscalTicketData(fiscalTicket({ total: 999 })), /detalle de la factura/);
});

test('Consumidor Final nunca hereda el CUIT del emisor', () => {
  assert.deepEqual(fiscalReceiverView({
    clienteNombre: 'Consumidor Final',
    clienteCuit: '',
    clienteDocumentoTipo: 'Consumidor Final',
  }), {
    isFinalConsumer: true,
    name: 'A CONSUMIDOR FINAL',
    documentLabel: 'Documento',
    documentNumber: 'No requerido',
  });
});
