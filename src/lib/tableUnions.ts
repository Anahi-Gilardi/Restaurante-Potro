import type { Mesa } from '../types';

/**
 * Extrae el número base de una mesa (ej: 'Mesa 1' -> '1', '1' -> '1', 1 -> '1').
 */
export function extractTableNumber(tableRef: number | string | undefined | null): string {
  if (tableRef === undefined || tableRef === null) return '';
  const str = String(tableRef).trim();
  const match = str.match(/\d+/);
  return match ? match[0] : str;
}

/**
 * Genera el nombre canónico para mesas unidas (ej: 'Mesa 1 y 2 (Unidas)').
 */
export function formatUnitedTableName(tableRefs: (number | string)[]): string {
  const numberSet = new Set<string>();
  tableRefs.forEach(ref => {
    if (ref === undefined || ref === null) return;
    const str = String(ref).trim();
    const matches = str.match(/\d+/g);
    if (matches) {
      matches.forEach(m => numberSet.add(m));
    }
  });

  const numbers = Array.from(numberSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (numbers.length === 0) return 'Mesa Unida';
  if (numbers.length === 1) return `Mesa ${numbers[0]}`;
  if (numbers.length === 2) {
    return `Mesa ${numbers[0]} y ${numbers[1]} (Unidas)`;
  }
  const allButLast = numbers.slice(0, -1).join(', ');
  const last = numbers[numbers.length - 1];
  return `Mesa ${allButLast} y ${last} (Unidas)`;
}

/**
 * Determina si una mesa es una mesa combinada/unida.
 */
export function isUnitedTable(table: Partial<Mesa> | null | undefined): boolean {
  if (!table) return false;
  if (table.estado === 'unida') return true;
  if (table.mesas_unidas && table.mesas_unidas.length > 1) return true;
  if (table.parent_id !== undefined && table.parent_id !== null) return true;
  const num = String(table.numero_mesa || '').toLowerCase();
  return num.includes('unida') || num.includes('+') || (num.includes(' y ') && /\d/.test(num));
}

/**
 * Formatea el nombre de la mesa para el ticket de impresión (caja o comanda).
 * Si la mesa está unida: 'MESA 1 Y 2 (UNIDAS)'
 * Si está separada: 'MESA 1'
 */
export function formatTicketTableName(mesaRef: string | number | undefined | null): string {
  if (!mesaRef) return 'MESA 1';
  const str = String(mesaRef).trim();
  const upper = str.toUpperCase();

  const isUnited = upper.includes('UNIDA') || upper.includes('+') || (upper.includes(' Y ') && /\d/.test(upper));
  if (isUnited) {
    const numbers = (upper.match(/\d+/g) || []).filter((v, idx, arr) => arr.indexOf(v) === idx);
    numbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (numbers.length >= 2) {
      if (numbers.length === 2) {
        return `MESA ${numbers[0]} Y ${numbers[1]} (UNIDAS)`;
      }
      const allButLast = numbers.slice(0, -1).join(', ');
      const last = numbers[numbers.length - 1];
      return `MESA ${allButLast} Y ${last} (UNIDAS)`;
    }
    return upper.includes('(UNIDAS)') ? upper : `${upper} (UNIDAS)`;
  }

  // Mesa individual
  const singleMatch = upper.match(/\d+/);
  if (singleMatch) {
    return `MESA ${singleMatch[0]}`;
  }
  if (upper.startsWith('MESA')) {
    return upper;
  }
  return `MESA ${upper}`;
}

/**
 * Une dos mesas (m1 y m2) en una lista de mesas.
 * La de menor ID se convierte en la mesa principal con capacidad combinada.
 * La otra pasa a estado 'unida' referenciando a la principal.
 */
export function uniteTablesInList(
  m1: Mesa,
  m2: Mesa,
  allTables: Mesa[]
): Mesa[] {
  const [primary, secondary] = m1.id_mesa <= m2.id_mesa ? [m1, m2] : [m2, m1];
  const combinedName = formatUnitedTableName([primary.numero_mesa, secondary.numero_mesa]);
  const combinedCap = (primary.capacidad || 2) + (secondary.capacidad || 2);
  const combinedComensales = (primary.comensales || 0) + (secondary.comensales || 0);

  const unitedIds = new Set<number>();
  if (primary.mesas_unidas && primary.mesas_unidas.length > 0) {
    primary.mesas_unidas.forEach(id => unitedIds.add(id));
  }
  unitedIds.add(primary.id_mesa);
  unitedIds.add(secondary.id_mesa);
  const finalUnitedIds = Array.from(unitedIds).sort((a, b) => a - b);

  return allTables.map(m => {
    if (m.id_mesa === primary.id_mesa) {
      return {
        ...m,
        numero_mesa: combinedName,
        capacidad: combinedCap,
        comensales: combinedComensales > 0 ? combinedComensales : m.comensales,
        mesas_unidas: finalUnitedIds,
        parent_id: null,
      };
    }
    if (m.id_mesa === secondary.id_mesa) {
      return {
        ...m,
        estado: 'unida' as const,
        parent_id: primary.id_mesa,
        mesas_unidas: [],
      };
    }
    return m;
  });
}

/**
 * Desune una mesa combinada y todas sus mesas secundarias en una lista de mesas,
 * restaurando los nombres individuales canónicos ('Mesa X') y liberando sus vínculos.
 */
export function separateTablesInList(
  tableToSeparate: Mesa,
  allTables: Mesa[]
): Mesa[] {
  const unitedIds = new Set<number>();
  if (tableToSeparate.mesas_unidas && tableToSeparate.mesas_unidas.length > 0) {
    tableToSeparate.mesas_unidas.forEach(id => unitedIds.add(id));
  }
  unitedIds.add(tableToSeparate.id_mesa);
  if (tableToSeparate.parent_id) {
    unitedIds.add(tableToSeparate.parent_id);
  }

  allTables.forEach(m => {
    if (m.parent_id === tableToSeparate.id_mesa || (tableToSeparate.parent_id && m.parent_id === tableToSeparate.parent_id)) {
      unitedIds.add(m.id_mesa);
    }
    if (m.mesas_unidas && m.mesas_unidas.some(id => unitedIds.has(id))) {
      unitedIds.add(m.id_mesa);
    }
  });

  return allTables.map(m => {
    if (unitedIds.has(m.id_mesa)) {
      const originalNumber = extractTableNumber(m.id_mesa) || String(m.id_mesa);
      return {
        ...m,
        numero_mesa: `Mesa ${originalNumber}`,
        capacidad: m.capacidad ? Math.min(m.capacidad, 4) : 4,
        parent_id: null,
        mesas_unidas: [],
        estado: (m.estado === 'unida' ? 'libre' : m.estado) as Mesa['estado'],
      };
    }
    return m;
  });
}

/**
 * Formatea el título legible de la mesa para la UI (evitando duplicar 'Mesa Mesa').
 * Si ya comienza con 'Mesa', 'Delivery', 'Mostrador', 'Para llevar', etc., lo preserva.
 * Si es un número o texto sin prefijo (ej: '1' o 1), devuelve 'Mesa 1'.
 */
export function formatTableDisplayTitle(tableRef: string | number | undefined | null): string {
  if (tableRef === undefined || tableRef === null || String(tableRef).trim() === '') return 'Mesa';
  const str = String(tableRef).trim();
  if (/^(mesa|delivery|mostrador|take away|para llevar)/i.test(str)) {
    return str;
  }
  return `Mesa ${str}`;
}

