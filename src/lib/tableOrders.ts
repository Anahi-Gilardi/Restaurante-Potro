import type { Mesa, Pedido, PedidoItem, ProductoMenu } from '../types';
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

export interface TableActiveInfo {
  isOcupada: boolean;
  isInCuenta: boolean;
  isReservada: boolean;
  isUnidaHija: boolean;
  isCombinada: boolean;
  activeOrders: Pedido[];
  activeOrder: Pedido | null;
  comensales: number;
  labelText: string;
}

export function isOrderActive(pedido: Pedido): boolean {
  return pedido.estado_comanda !== 'entregado_cobrado' && pedido.estado_comanda !== 'cancelado';
}

export function doesOrderBelongToTable(pedido: Pedido, mesa: TableIdentity & Partial<Mesa>): boolean {
  if (isSameTable(pedido, mesa)) return true;
  if (pedido.id_mesa !== undefined && pedido.id_mesa !== null && mesa.id_mesa !== undefined && mesa.id_mesa !== null && String(pedido.id_mesa) === String(mesa.id_mesa)) {
    return true;
  }
  if (Array.isArray(mesa.mesas_unidas) && mesa.mesas_unidas.some(id => String(id) === String(pedido.id_mesa))) {
    return true;
  }
  return false;
}

export function getTableActiveInfo(mesa: Mesa, pedidos: readonly Pedido[]): TableActiveInfo {
  const isUnidaHija = mesa.estado === 'unida' && Boolean(mesa.parent_id);
  const isCombinada = Boolean(
    mesa.estado === 'unida' ||
    (Array.isArray(mesa.mesas_unidas) && mesa.mesas_unidas.length > 1) ||
    (mesa.parent_id !== undefined && mesa.parent_id !== null) ||
    String(mesa.numero_mesa || '').toLowerCase().includes('unida') ||
    String(mesa.numero_mesa || '').toLowerCase().includes('+') ||
    (String(mesa.numero_mesa || '').toLowerCase().includes(' y ') && /\d/.test(String(mesa.numero_mesa || '')))
  );

  const activeOrders = isUnidaHija
    ? []
    : pedidos.filter(p => isOrderActive(p) && doesOrderBelongToTable(p, mesa));

  const activeOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  const isInCuenta = !isUnidaHija && (
    mesa.estado === 'esperando_cuenta' ||
    activeOrders.some(p => (p as any).estado_comanda === 'esperando_cuenta')
  );

  const isOcupada = !isUnidaHija && (
    mesa.estado === 'ocupada' ||
    activeOrders.length > 0
  );

  const isReservada = !isUnidaHija && !isOcupada && !isInCuenta && mesa.estado === 'reservada';

  let comensales = mesa.comensales || mesa.capacidad || 2;
  if (activeOrder && (activeOrder as any).comensales) {
    comensales = Number((activeOrder as any).comensales) || comensales;
  }

  let labelText = 'Libre';
  if (isUnidaHija) {
    labelText = '🔗 Unida';
  } else if (isInCuenta) {
    labelText = 'En Cuenta';
  } else if (isOcupada) {
    labelText = isCombinada ? 'Unida (Ocup)' : 'Ocupada';
  } else if (isReservada) {
    labelText = 'Reservada';
  } else if (isCombinada) {
    labelText = '🔗 Unida';
  }

  return {
    isOcupada,
    isInCuenta,
    isReservada,
    isUnidaHija,
    isCombinada,
    activeOrders,
    activeOrder,
    comensales,
    labelText
  };
}

export function isTableOccupied(mesa: Mesa, pedidos: readonly Pedido[]): boolean {
  return getTableActiveInfo(mesa, pedidos).isOcupada;
}

