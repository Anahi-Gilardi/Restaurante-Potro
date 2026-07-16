export const isSafeOrderItem = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const idProducto = String(item.id_producto ?? '').trim();
  const nombre = String(item.nombre ?? '').trim();
  const cantidad = Number(item.cantidad);
  const precio = item.precio_unitario == null ? null : Number(item.precio_unitario);
  return idProducto.length > 0
    && idProducto.length <= 100
    && nombre.length > 0
    && nombre.length <= 200
    && Number.isInteger(cantidad)
    && cantidad > 0
    && cantidad <= 100
    && (precio === null || (Number.isFinite(precio) && precio >= 0 && precio <= 100_000_000));
};

export const isSafeOrderItems = (value: unknown): value is Array<Record<string, unknown>> => (
  Array.isArray(value)
  && value.length > 0
  && value.length <= 100
  && value.every(isSafeOrderItem)
);
