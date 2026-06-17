export function createClientPedidoId(existingIds: number[] = [], now = Date.now(), random = Math.random()): number {
  const randomPart = Math.floor(random * 1000);
  const candidate = now * 1000 + randomPart;
  const maxExisting = Math.max(1000, ...existingIds);
  return candidate > maxExisting ? candidate : maxExisting + 1;
}
