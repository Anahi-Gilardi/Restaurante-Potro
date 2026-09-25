import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTableDisplayTitle } from './tableUnions';

test('formatTableDisplayTitle maneja números, strings y valores vacíos', () => {
  assert.equal(formatTableDisplayTitle(7), 'Mesa 7');
  assert.equal(formatTableDisplayTitle('7'), 'Mesa 7');
  assert.equal(formatTableDisplayTitle('Mesa 7'), 'Mesa 7');
  assert.equal(formatTableDisplayTitle('Delivery'), 'Delivery');
  assert.equal(formatTableDisplayTitle(null), 'Mesa');
  assert.equal(formatTableDisplayTitle(undefined), 'Mesa');
});

test('agrupamiento y ordenamiento de mesas resiste numero_mesa numérico sin error de localeCompare', () => {
  const pagosPendientes = [
    { pedido: { numero_mesa: 10 as any }, total: 5000 },
    { pedido: { numero_mesa: 2 as any }, total: 3000 },
    { pedido: { numero_mesa: 'Mesa 1' }, total: 1500 },
    { pedido: { numero_mesa: null as any }, total: 2000 },
    { pedido: { numero_mesa: 10 as any }, total: 2000 },
  ];

  const groups: Record<string, { mesa: string; pedidos: typeof pagosPendientes; total: number }> = {};
  pagosPendientes.forEach(p => {
    const rawMesa = p.pedido?.numero_mesa;
    const mesa = rawMesa !== undefined && rawMesa !== null && String(rawMesa).trim() !== ''
      ? formatTableDisplayTitle(rawMesa)
      : 'Sin Mesa';
    if (!groups[mesa]) {
      groups[mesa] = { mesa, pedidos: [], total: 0 };
    }
    groups[mesa].pedidos.push(p);
    groups[mesa].total += p.total;
  });

  const sorted = Object.values(groups).sort((a, b) => String(a.mesa || '').localeCompare(String(b.mesa || ''), undefined, { numeric: true }));

  assert.equal(sorted.length, 4);
  assert.equal(sorted[0].mesa, 'Mesa 1');
  assert.equal(sorted[1].mesa, 'Mesa 2');
  assert.equal(sorted[2].mesa, 'Mesa 10');
  assert.equal(sorted[3].mesa, 'Sin Mesa');
  assert.equal(sorted[2].total, 7000);
});
