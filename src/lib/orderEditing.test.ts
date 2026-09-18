import assert from 'node:assert/strict';
import test from 'node:test';
import { Pedido, PedidoItem, ProductoMenu } from '../types';
import { calculatePedidoTotal, resolvePedidoItemUnitPrice } from './orderPricing';
import { serializePedidoHeader, serializePedidoDetails } from '../services/pedidosService';

const mockProductos: ProductoMenu[] = [
  {
    id_producto: 'p_1',
    nombre: 'Aperol Spritz',
    precio_venta: 7800,
    categoria: 'Bebidas con Alcohol',
    activo: true,
    imagen: ''
  },
  {
    id_producto: 'p_2',
    nombre: 'Canelones con salsa mixta',
    precio_venta: 8500,
    categoria: 'Pastas Caseras',
    activo: true,
    imagen: ''
  },
  {
    id_producto: 'p_3',
    nombre: 'Charcutería de elaboración propia',
    precio_venta: 23000,
    categoria: 'Entradas',
    activo: true,
    imagen: ''
  },
  {
    id_producto: 'p_4',
    nombre: 'Vino Malbec Reserva',
    precio_venta: 18000,
    categoria: 'Vinos Tintos',
    activo: true,
    imagen: ''
  }
];

const mockPedidoOriginal: Pedido = {
  id_pedido: 1789735321422307,
  id_mesa: 1,
  numero_mesa: 'Mesa 1',
  mozo: 'Enzo',
  estado_comanda: 'pendiente',
  fecha_hora: new Date('2026-09-18T12:00:00Z'),
  minutos_transcurridos: 5,
  origen: 'Mozo',
  items: [
    { id_producto: 'p_1', nombre: 'Aperol Spritz', cantidad: 1, categoria: 'Bebidas con Alcohol', precio_unitario: 7800 },
    { id_producto: 'p_2', nombre: 'Canelones con salsa mixta', cantidad: 1, categoria: 'Pastas Caseras', precio_unitario: 8500 },
    { id_producto: 'p_3', nombre: 'Charcutería de elaboración propia', cantidad: 1, categoria: 'Entradas', precio_unitario: 23000 }
  ],
  observaciones: 'Sin sal'
};

test('El total del pedido original coincide con la captura de pantalla ($39.300)', () => {
  const total = calculatePedidoTotal(mockPedidoOriginal, mockProductos);
  assert.equal(total, 39300);
});

test('Modificar cantidad de un ítem existente recalcula correctamente el total', () => {
  // Mozo cambia Aperol Spritz de 1 a 2 unidades
  const updatedItems: PedidoItem[] = mockPedidoOriginal.items.map(it => {
    if (it.id_producto === 'p_1') {
      return { ...it, cantidad: 2 };
    }
    return it;
  });

  const pedidoModificado: Pedido = {
    ...mockPedidoOriginal,
    items: updatedItems
  };

  const nuevoTotal = calculatePedidoTotal(pedidoModificado, mockProductos);
  // 39300 + 7800 = 47100
  assert.equal(nuevoTotal, 47100);
});

test('Eliminar un ítem de la comanda reduce el total y excluye el producto', () => {
  // Mozo elimina Canelones ($8.500)
  const updatedItems: PedidoItem[] = mockPedidoOriginal.items.filter(it => it.id_producto !== 'p_2');

  const pedidoModificado: Pedido = {
    ...mockPedidoOriginal,
    items: updatedItems
  };

  assert.equal(pedidoModificado.items.length, 2);
  assert.ok(!pedidoModificado.items.some(it => it.id_producto === 'p_2'));

  const nuevoTotal = calculatePedidoTotal(pedidoModificado, mockProductos);
  // 39300 - 8500 = 30800
  assert.equal(nuevoTotal, 30800);
});

test('Agregar un nuevo producto de la carta a la comanda activa', () => {
  // Mozo agrega Vino Malbec ($18.000)
  const nuevoProducto = mockProductos.find(p => p.id_producto === 'p_4')!;
  assert.ok(nuevoProducto);

  const newItem: PedidoItem = {
    id_producto: nuevoProducto.id_producto,
    nombre: nuevoProducto.nombre,
    cantidad: 1,
    categoria: nuevoProducto.categoria,
    precio_unitario: nuevoProducto.precio_venta,
    estado: 'pendiente'
  };

  const updatedItems: PedidoItem[] = [...mockPedidoOriginal.items, newItem];
  const pedidoModificado: Pedido = {
    ...mockPedidoOriginal,
    items: updatedItems,
    observaciones: 'Carne bien cocida'
  };

  assert.equal(pedidoModificado.items.length, 4);
  const nuevoTotal = calculatePedidoTotal(pedidoModificado, mockProductos);
  // 39300 + 18000 = 57300
  assert.equal(nuevoTotal, 57300);
  assert.equal(pedidoModificado.observaciones, 'Carne bien cocida');
});

test('Serialización para backend y Google Sheets conserva los datos editados', () => {
  const editedPedido: Pedido = {
    ...mockPedidoOriginal,
    items: [
      { id_producto: 'p_1', nombre: 'Aperol Spritz', cantidad: 3, categoria: 'Bebidas con Alcohol', precio_unitario: 7800 }
    ],
    observaciones: 'Hielo aparte'
  };

  const header = serializePedidoHeader(editedPedido);
  assert.equal(header.id_pedido, mockPedidoOriginal.id_pedido);
  assert.equal(header.observaciones, 'Hielo aparte');
  assert.equal(typeof header.items, 'string');
  const parsedHeaderItems = JSON.parse(header.items);
  assert.equal(parsedHeaderItems.length, 1);
  assert.equal(parsedHeaderItems[0].cantidad, 3);

  const details = serializePedidoDetails(editedPedido);
  assert.equal(details.length, 1);
  assert.equal(details[0].id_pedido, mockPedidoOriginal.id_pedido);
  assert.equal(details[0].cantidad, 3);
  assert.equal(details[0].precio_unitario, 7800);
});
