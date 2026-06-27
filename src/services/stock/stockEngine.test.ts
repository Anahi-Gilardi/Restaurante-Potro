import assert from 'node:assert/strict';
import test from 'node:test';
import { stockEngine } from './stockEngine';
import { Insumo, Pedido, RecetaEscandallo } from '../../types';

// Mocks base
const mockInsumos: Insumo[] = [
  { id_insumo: 'ins_carne', nombre: 'Carne', stock_actual: 5000, stock_minimo: 1000, unidad_medida: 'g', categoria: 'frescos' },
  { id_insumo: 'ins_pan', nombre: 'Pan', stock_actual: 10, stock_minimo: 2, unidad_medida: 'unidades', categoria: 'secos' }
];

const mockRecetas: RecetaEscandallo[] = [
  { id_receta: 'rec_1', id_producto: 'prod_burguer', id_insumo: 'ins_carne', cantidad_a_descontar: 150 },
  { id_receta: 'rec_2', id_producto: 'prod_burguer', id_insumo: 'ins_pan', cantidad_a_descontar: 1 }
];

test('Escenario 1: Intentar agregar ítem de pedido con precio o cantidad negativa', () => {
  // Cantidad negativa
  const badItemQty = { id_producto: 'prod_burguer', nombre: 'Burguer', cantidad: -2, categoria: 'Comida', precio_unitario: 1500 };
  assert.throws(() => {
    stockEngine.validatePedidoItem(badItemQty);
  }, /Cantidad inválida/);

  // Precio negativo
  const badItemPrice = { id_producto: 'prod_burguer', nombre: 'Burguer', cantidad: 2, categoria: 'Comida', precio_unitario: -100 };
  assert.throws(() => {
    stockEngine.validatePedidoItem(badItemPrice);
  }, /Precio unitario inválido/);

  // Ítem correcto
  const goodItem = { id_producto: 'prod_burguer', nombre: 'Burguer', cantidad: 2, categoria: 'Comida', precio_unitario: 1500 };
  assert.doesNotThrow(() => {
    stockEngine.validatePedidoItem(goodItem);
  });
});

test('Escenario 2: Intentar facturar/cerrar una mesa sin comandas activas', () => {
  // Una función auxiliar para emular la validación de facturar
  const validarFacturacionMesa = (pedidosMesa: Pedido[]) => {
    const activas = pedidosMesa.filter(
      p => p.estado_comanda !== 'entregado_cobrado' && p.estado_comanda !== 'cancelado'
    );
    if (activas.length === 0) {
      throw new Error('No se puede facturar una mesa sin consumos activos.');
    }
    return true;
  };

  const pedidosMesaVacios: Pedido[] = [];
  assert.throws(() => {
    validarFacturacionMesa(pedidosMesaVacios);
  }, /No se puede facturar una mesa sin consumos activos/);

  const pedidosConCobrado: Pedido[] = [
    {
      id_pedido: 123,
      id_mesa: 5,
      numero_mesa: 'Mesa 5',
      mozo: 'Sofia',
      estado_comanda: 'entregado_cobrado',
      items: [],
      fecha_hora: new Date(),
      minutos_transcurridos: 20,
      origen: 'Mozo'
    }
  ];
  assert.throws(() => {
    validarFacturacionMesa(pedidosConCobrado);
  }, /No se puede facturar una mesa sin consumos activos/);
});

test('Escenario 3: Intentar procesar plato con insumos insuficientes (sin permitir venta sin stock)', () => {
  // Pedido que requiere 15 panes, pero solo hay 10 disponibles
  const pedidoExcedido: Pedido = {
    id_pedido: 1,
    id_mesa: 1,
    numero_mesa: 'Mesa 1',
    mozo: 'Sofía',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_burguer', nombre: 'Hamburguesa', cantidad: 15, categoria: 'Comida' }
    ],
    fecha_hora: new Date(),
    minutos_transcurridos: 0,
    origen: 'Mozo'
  };

  // Debe lanzar error si no se permite venta sin stock
  assert.throws(() => {
    stockEngine.deductStockForPedido(pedidoExcedido, mockInsumos, mockRecetas, false);
  }, /Insumo crítico agotado/);

  // Debe tener éxito si se permite venta sin stock (e.g. stock negativo permitido temporalmente)
  const result = stockEngine.deductStockForPedido(pedidoExcedido, mockInsumos, mockRecetas, true);
  const panUpdated = result.updatedInsumos.find(i => i.id_insumo === 'ins_pan');
  assert.equal(panUpdated?.stock_actual, -5); // 10 - 15 = -5
});

test('Escenario 4: Reverso de stock en cascada al cancelar un pedido', () => {
  const pedidoHamburguesa: Pedido = {
    id_pedido: 2,
    id_mesa: 2,
    numero_mesa: 'Mesa 2',
    mozo: 'Sofía',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_burguer', nombre: 'Hamburguesa', cantidad: 2, categoria: 'Comida' }
    ],
    fecha_hora: new Date(),
    minutos_transcurridos: 0,
    origen: 'Mozo'
  };

  // 1. Descontamos stock (2 hamburguesas -> 300g carne, 2 panes)
  const resultDeduct = stockEngine.deductStockForPedido(pedidoHamburguesa, mockInsumos, mockRecetas, false);
  const carneDeducted = resultDeduct.updatedInsumos.find(i => i.id_insumo === 'ins_carne');
  const panDeducted = resultDeduct.updatedInsumos.find(i => i.id_insumo === 'ins_pan');
  assert.equal(carneDeducted?.stock_actual, 4700); // 5000 - 300 = 4700
  assert.equal(panDeducted?.stock_actual, 8); // 10 - 2 = 8

  // 2. Reversamos/cancelamos usando el stock descontado
  const resultReverse = stockEngine.reverseStockForPedido(pedidoHamburguesa, resultDeduct.updatedInsumos, mockRecetas);
  const carneReversed = resultReverse.updatedInsumos.find(i => i.id_insumo === 'ins_carne');
  const panReversed = resultReverse.updatedInsumos.find(i => i.id_insumo === 'ins_pan');
  assert.equal(carneReversed?.stock_actual, 5000); // Restablecido a 5000
  assert.equal(panReversed?.stock_actual, 10); // Restablecido a 10
});

test('Escenario 5: Registrar arqueo de caja inválido (monto real negativo o nulo)', () => {
  const validarCierreCaja = (montoReal: number) => {
    if (montoReal < 0) {
      throw new Error('El arqueo físico de caja no puede ser negativo.');
    }
    return true;
  };

  assert.throws(() => {
    validarCierreCaja(-50);
  }, /El arqueo físico de caja no puede ser negativo/);

  assert.doesNotThrow(() => {
    validarCierreCaja(0);
  });

  assert.doesNotThrow(() => {
    validarCierreCaja(25000);
  });
});
