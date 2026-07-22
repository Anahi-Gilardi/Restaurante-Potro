import type { Pedido, PedidoItem, ProductoMenu } from '../types';
import { resolvePedidoItemUnitPrice } from './orderPricing';

type TableIdentity = {
  id_mesa?: unknown;
  numero_mesa?: string;
};

const normalizeTableName = (value: unknown): string => String(value ?? '')
  .toLowerCase()
  .replace(/^mesa\s+/i, '')
  .trim();

export function isSameTable(first: TableIdentity, second: TableIdentity): boolean {
  const firstName = String(first.numero_mesa ?? '').trim();
  const secondName = String(second.numero_mesa ?? '').trim();
  const isDelivery = firstName.toUpperCase().startsWith('DELIVERY')
    || secondName.toUpperCase().startsWith('DELIVERY');

  if (isDelivery) {
    return firstName.length > 0 && firstName.toLowerCase() === secondName.toLowerCase();
  }

  if (first.id_mesa !== undefined && first.id_mesa !== null
    && second.id_mesa !== undefined && second.id_mesa !== null
    && String(first.id_mesa) === String(second.id_mesa)) {
    return true;
  }

  const normalizedFirst = normalizeTableName(firstName);
  const normalizedSecond = normalizeTableName(secondName);
  return normalizedFirst.length > 0 && normalizedFirst === normalizedSecond;
}

function canAggregateForBilling(
  current: PedidoItem,
  incoming: PedidoItem,
  productosMenu: readonly Pick<ProductoMenu, 'id_producto' | 'precio_venta'>[],
): boolean {
  return current.id_producto === incoming.id_producto
    && Math.abs(
      resolvePedidoItemUnitPrice(current, productosMenu)
        - resolvePedidoItemUnitPrice(incoming, productosMenu),
    ) < 0.005;
}

/**
 * Consolida comandas de una mesa para mostrarlas y cobrarlas. Mantiene líneas
 * separadas cuando el mismo producto fue vendido a precios distintos.
 */
export function mergeTableOrders(
  tableOrders: readonly Pedido[],
  productosMenu: readonly Pick<ProductoMenu, 'id_producto' | 'precio_venta'>[],
): Pedido | null {
  if (tableOrders.length === 0) return null;

  const base = tableOrders[0];
  const mergedItems: PedidoItem[] = [];

  tableOrders.forEach(order => {
    (order.items ?? []).forEach(item => {
      const existingIndex = mergedItems.findIndex(current => canAggregateForBilling(current, item, productosMenu));
      if (existingIndex === -1) {
        mergedItems.push({ ...item });
        return;
      }

      mergedItems[existingIndex] = {
        ...mergedItems[existingIndex],
        cantidad: mergedItems[existingIndex].cantidad + item.cantidad,
      };
    });
  });

  const observations = tableOrders
    .map(order => order.observaciones?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' | ');

  const oldestDate = tableOrders.reduce((oldest, current) => {
    const currentTime = new Date(current.fecha_hora).getTime();
    const oldestTime = new Date(oldest).getTime();
    if (!Number.isFinite(currentTime)) return oldest;
    if (!Number.isFinite(oldestTime) || currentTime < oldestTime) return current.fecha_hora;
    return oldest;
  }, base.fecha_hora);

  return {
    ...base,
    items: mergedItems,
    observaciones: observations || undefined,
    fecha_hora: oldestDate,
  };
}
