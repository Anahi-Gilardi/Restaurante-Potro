import type { Pedido } from '../types';
import type { Factura } from '../services/facturacionService';

type BillingRecord = Factura & { observaciones?: string };

const facturaType = (factura: BillingRecord): NonNullable<Factura['tipo']> => {
  if (factura.tipo) return factura.tipo;
  if (factura.nro_ticket.startsWith('C-')) return 'C';
  if (factura.nro_ticket.startsWith('NC-')) return 'NC';
  if (factura.nro_ticket.startsWith('A-')) return 'A';
  if (factura.nro_ticket.startsWith('B-')) return 'B';
  if (factura.nro_ticket.startsWith('X-')) return 'X';
  return 'ticket';
};

const referencedPedidoIds = (factura: BillingRecord): number[] => {
  const ids = new Set<number>();
  if (factura.id_pedido) ids.add(factura.id_pedido);
  for (const match of factura.observaciones?.match(/#\d+/g) ?? []) {
    ids.add(Number(match.slice(1)));
  }
  return [...ids];
};

/**
 * Devuelve solo cobros con ticket interno que todavía no fueron convertidos en
 * factura fiscal. Un ticket nunca cuenta como autorización ARCA.
 */
export const getInvoiceablePaidTickets = (
  pedidos: readonly Pedido[],
  facturas: readonly BillingRecord[],
) => {
  const fiscalizedOrderIds = new Set<number>();
  const ticketsByOrderId = new Map<number, BillingRecord>();

  for (const factura of facturas) {
    const type = facturaType(factura);
    const isFiscal = Boolean(factura.afip_cae) || ['A', 'B', 'C', 'NC'].includes(type);
    if (isFiscal) {
      referencedPedidoIds(factura).forEach(id => fiscalizedOrderIds.add(id));
      continue;
    }

    if ((type === 'ticket' || type === 'X') && factura.id_pedido && factura.total > 0) {
      if (!ticketsByOrderId.has(factura.id_pedido)) {
        ticketsByOrderId.set(factura.id_pedido, factura);
      }
    }
  }

  return pedidos
    .filter(pedido => pedido.estado_comanda === 'entregado_cobrado')
    .filter(pedido => !fiscalizedOrderIds.has(pedido.id_pedido))
    .map(pedido => ({ pedido, ticket: ticketsByOrderId.get(pedido.id_pedido) }))
    .filter((entry): entry is { pedido: Pedido; ticket: BillingRecord } => Boolean(entry.ticket))
    .map(entry => ({ ...entry, total: entry.ticket.total }));
};
