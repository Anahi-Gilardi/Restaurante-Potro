import assert from 'node:assert/strict';
import test from 'node:test';
import { hydratePedido, serializePedidoHeader } from './pedidosService';
import type { Pedido } from '../types';

const pedido: Pedido = {
  id_pedido: 1201,
  idempotency_key: 'mozo-4-123-test',
  id_mesa: 4,
  numero_mesa: 'Mesa 4',
  mozo: 'Micaela',
  estado_comanda: 'en_cocina',
  items: [{
    id_producto: 'prod_bife',
    nombre: 'Bife',
    cantidad: 2,
    categoria: 'Carnes',
    precio_unitario: 18500
  }],
  fecha_hora: new Date('2026-06-14T12:00:00.000Z'),
  minutos_transcurridos: 8,
  origen: 'Mozo',
  stock_descontado: true,
  fecha_descuento_stock: new Date('2026-06-14T12:01:00.000Z')
};

test('preserva el estado de descuento de stock al persistir e hidratar', () => {
  const header = serializePedidoHeader(pedido);
  const hydrated = hydratePedido(header, []);

  assert.equal(hydrated.stock_descontado, true);
  assert.equal(hydrated.fecha_descuento_stock?.toISOString(), '2026-06-14T12:01:00.000Z');
});

test('prioriza el snapshot JSON para no perder el precio historico', () => {
  const header = serializePedidoHeader(pedido);
  const hydrated = hydratePedido(header, [{
    id_detalle: '1201_0000',
    id_pedido: 1201,
    id_producto: 'prod_bife',
    nombre: 'Bife',
    cantidad: 2,
    categoria: 'Carnes'
  }]);

  assert.equal(hydrated.items[0].precio_unitario, 18500);
});

test('preserva idempotency_key para evitar comandas duplicadas', () => {
  const header = serializePedidoHeader(pedido);
  const hydrated = hydratePedido(header, []);

  assert.equal(header.idempotency_key, 'mozo-4-123-test');
  assert.equal(hydrated.idempotency_key, 'mozo-4-123-test');
});
