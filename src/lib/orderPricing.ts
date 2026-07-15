import type { Pedido, PedidoItem, ProductoMenu } from '../types';

const validPrice = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Mantiene el precio capturado al tomar el pedido y usa el menú solo para datos antiguos. */
export const resolvePedidoItemUnitPrice = (
  item: Pick<PedidoItem, 'id_producto' | 'precio_unitario'>,
  productosMenu: readonly Pick<ProductoMenu, 'id_producto' | 'precio_venta'>[],
): number => {
  const snapshot = validPrice(item.precio_unitario);
  if (snapshot !== null) return snapshot;
  const menuPrice = productosMenu.find(producto => producto.id_producto === item.id_producto)?.precio_venta;
  return validPrice(menuPrice) ?? 0;
};

export const calculatePedidoTotal = (
  pedido: Pick<Pedido, 'items'>,
  productosMenu: readonly Pick<ProductoMenu, 'id_producto' | 'precio_venta'>[],
): number => roundCurrency(pedido.items.reduce(
  (total, item) => total + resolvePedidoItemUnitPrice(item, productosMenu) * item.cantidad,
  0,
));

export const canMergePedidoItems = (
  current: Pick<PedidoItem, 'id_producto' | 'precio_unitario' | 'estado'>,
  incoming: Pick<PedidoItem, 'id_producto' | 'precio_unitario'>,
  productosMenu: readonly Pick<ProductoMenu, 'id_producto' | 'precio_venta'>[],
): boolean => current.id_producto === incoming.id_producto
  && (current.estado === 'pendiente' || !current.estado)
  && Math.abs(
    resolvePedidoItemUnitPrice(current, productosMenu)
      - resolvePedidoItemUnitPrice(incoming, productosMenu),
  ) < 0.005;
