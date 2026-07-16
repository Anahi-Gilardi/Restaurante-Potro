import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pedido } from '../types';
import type { Factura } from '../services/facturacionService';
import { getInvoiceablePaidTickets } from './ticketBillingPolicy';

const pedido = (id: number, estado: Pedido['estado_comanda'] = 'entregado_cobrado'): Pedido => ({
  id_pedido: id,
  id_mesa: 1,
  numero_mesa: 'Mesa 1',
  mozo: 'Admin',
  estado_comanda: estado,
  items: [],
  fecha_hora: new Date('2026-07-16T12:00:00-03:00'),
  minutos_transcurridos: 0,
  origen: 'Mozo',
});

const factura = (overrides: Partial<Factura>): Factura => ({
  id_factura: 'fac_1',
  id_pedido: 1,
  nro_ticket: 'T-00000001',
  cliente: 'Consumidor Final',
  cuit: '99-99999999-9',
  total: 1000,
  iva_veintiuno: 0,
  medio_pago: 'efectivo',
  fecha: '12:00 hs',
  estado: 'borrador',
  tipo: 'ticket',
  ...overrides,
});

test('un ticket pagado queda disponible para emitir Factura C', () => {
  const result = getInvoiceablePaidTickets([pedido(1)], [factura({})]);
  assert.equal(result.length, 1);
  assert.equal(result[0].total, 1000);
  assert.equal(result[0].ticket.nro_ticket, 'T-00000001');
});

test('una factura fiscal posterior evita duplicar la emisión del ticket', () => {
  const result = getInvoiceablePaidTickets([pedido(1)], [
    factura({}),
    factura({ id_factura: 'fac_2', nro_ticket: 'C-0002-00000001', tipo: 'C', afip_cae: '70123456789012' }),
  ]);
  assert.equal(result.length, 0);
});

test('no ofrece comandas sin cobrar ni cobros sin ticket interno', () => {
  assert.equal(getInvoiceablePaidTickets([pedido(1, 'entregado')], [factura({})]).length, 0);
  assert.equal(getInvoiceablePaidTickets([pedido(2)], [factura({ id_pedido: 1 })]).length, 0);
});
