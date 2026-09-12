import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableActiveInfo, isTableOccupied, doesOrderBelongToTable, isOrderActive } from './tableOrders';
import { parseVoiceCommand } from '../components/MozoTerminal';
import type { Mesa, Pedido, ProductoMenu } from '../types';

const MOCK_MESAS: Mesa[] = [
  { id_mesa: 1, numero_mesa: 'Mesa 1', estado: 'libre', capacidad: 2 },
  { id_mesa: 2, numero_mesa: 'Mesa 2', estado: 'libre', capacidad: 2 },
  { id_mesa: 3, numero_mesa: 'Mesa 3', estado: 'libre', capacidad: 4 },
  { id_mesa: 4, numero_mesa: 'Mesa 4', estado: 'libre', capacidad: 4 }, // en DB esta 'libre'
  { id_mesa: 5, numero_mesa: 'Mesa 5', estado: 'ocupada', comensales: 3, capacidad: 4 },
];

const MOCK_PEDIDOS: Pedido[] = [
  {
    id_pedido: 1023,
    id_mesa: 4,
    numero_mesa: 'Mesa 4',
    mozo: 'Enzo',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod-1', nombre: 'Bife de Chorizo', cantidad: 2, categoria: 'Carnes' },
      { id_producto: 'prod-2', nombre: 'Coca Cola', cantidad: 2, categoria: 'Bebidas' }
    ],
    fecha_hora: new Date(),
    minutos_transcurridos: 5,
    origen: 'Mozo'
  } as any
];

test('una mesa con pedido activo se detecta como ocupada aunque m.estado sea libre', () => {
  const mesa4 = MOCK_MESAS.find(m => m.id_mesa === 4)!;
  
  // En el objeto crudo figura 'libre'
  assert.equal(mesa4.estado, 'libre');

  // getTableActiveInfo debe resolverla como ocupada
  const info = getTableActiveInfo(mesa4, MOCK_PEDIDOS);
  assert.equal(info.isOcupada, true);
  assert.equal(info.labelText, 'Ocupada');
  assert.equal(info.activeOrders.length, 1);
  assert.equal(info.activeOrder?.id_pedido, 1023);

  // isTableOccupied retorna true
  assert.equal(isTableOccupied(mesa4, MOCK_PEDIDOS), true);
});

test('una mesa sin pedidos y con estado libre se detecta como libre', () => {
  const mesa1 = MOCK_MESAS.find(m => m.id_mesa === 1)!;
  const info = getTableActiveInfo(mesa1, MOCK_PEDIDOS);
  
  assert.equal(info.isOcupada, false);
  assert.equal(info.labelText, 'Libre');
  assert.equal(info.activeOrders.length, 0);
  assert.equal(isTableOccupied(mesa1, MOCK_PEDIDOS), false);
});

test('al cobrar o cancelar la comanda, la mesa vuelve a computarse como libre', () => {
  const mesa4 = MOCK_MESAS.find(m => m.id_mesa === 4)!;
  const pedidosCobrados: Pedido[] = [
    {
      ...MOCK_PEDIDOS[0],
      estado_comanda: 'entregado_cobrado'
    }
  ];

  const infoCobrado = getTableActiveInfo(mesa4, pedidosCobrados);
  assert.equal(infoCobrado.isOcupada, false);
  assert.equal(infoCobrado.labelText, 'Libre');

  const pedidosCancelados: Pedido[] = [
    {
      ...MOCK_PEDIDOS[0],
      estado_comanda: 'cancelado'
    }
  ];

  const infoCancelado = getTableActiveInfo(mesa4, pedidosCancelados);
  assert.equal(infoCancelado.isOcupada, false);
});

test('comensales se extraen de la orden activa si existen', () => {
  const mesa4 = MOCK_MESAS.find(m => m.id_mesa === 4)!;
  const pedidosConPax: Pedido[] = [
    {
      ...MOCK_PEDIDOS[0],
      comensales: 5
    } as any
  ];

  const info = getTableActiveInfo(mesa4, pedidosConPax);
  assert.equal(info.comensales, 5);
});

test('mesas unidas: la mesa hija no cuenta como ocupada independiente y muestra enlace', () => {
  const mesaHija: Mesa = {
    id_mesa: 2,
    numero_mesa: 'Mesa 2',
    estado: 'unida',
    parent_id: 1,
    capacidad: 2
  };
  const mesaPadre: Mesa = {
    id_mesa: 1,
    numero_mesa: 'Mesa 1 y 2 (Unidas)',
    estado: 'ocupada',
    mesas_unidas: [1, 2],
    capacidad: 4
  };

  const infoHija = getTableActiveInfo(mesaHija, []);
  assert.equal(infoHija.isUnidaHija, true);
  assert.equal(infoHija.isOcupada, false);
  assert.equal(infoHija.labelText, '🔗 Unida');

  const infoPadre = getTableActiveInfo(mesaPadre, []);
  assert.equal(infoPadre.isCombinada, true);
  assert.equal(infoPadre.isOcupada, true);
  assert.equal(infoPadre.labelText, 'Unida (Ocup)');
});

test('parseVoiceCommand reconoce mesas 11 a 14 por palabra y por digito', () => {
  const mockProds: ProductoMenu[] = [
    { id_producto: '1', nombre: 'Bife de Chorizo', precio_venta: 12000, categoria: 'Carnes', activo: true, imagen: '' },
    { id_producto: '2', nombre: 'Coca Cola', precio_venta: 2500, categoria: 'Bebidas', activo: true, imagen: '' }
  ];

  const res11 = parseVoiceCommand('mesa once dos bife de chorizo y una coca cola', mockProds);
  assert.equal(res11.mesa, 11);
  assert.equal(res11.items.length, 2);
  assert.equal(res11.items[0].product.nombre, 'Bife de Chorizo');
  assert.equal(res11.items[0].quantity, 2);

  const res12 = parseVoiceCommand('mesa 12 una coca cola', mockProds);
  assert.equal(res12.mesa, 12);
  assert.equal(res12.items.length, 1);

  const res14 = parseVoiceCommand('mesa catorce un bife de chorizo', mockProds);
  assert.equal(res14.mesa, 14);
  assert.equal(res14.items.length, 1);
});
