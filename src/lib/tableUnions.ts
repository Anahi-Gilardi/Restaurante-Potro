import type { Mesa } from '../types';
import { INITIAL_MESAS } from '../data/initialData';

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
 * Une dos o más mesas en una lista de mesas.
 * La de menor ID se convierte en la mesa principal con la capacidad combinada de todas.
 * Las demás pasan a estado 'unida' referenciando a la principal (parent_id).
 */
export function uniteTablesInList(
  m1: Mesa | Mesa[],
  m2OrAllTables: Mesa | Mesa[],
  maybeAllTables?: Mesa[]
): Mesa[] {
  let tablesToUnite: Mesa[] = [];
  let allTables: Mesa[] = [];

  if (Array.isArray(m1)) {
    tablesToUnite = m1;
    allTables = Array.isArray(m2OrAllTables) ? m2OrAllTables : [];
  } else if (Array.isArray(m2OrAllTables) && !maybeAllTables) {
    tablesToUnite = [m1];
    allTables = m2OrAllTables;
  } else {
    tablesToUnite = [m1, m2OrAllTables as Mesa];
    allTables = maybeAllTables || [];
  }

  if (tablesToUnite.length < 2) return allTables;

  // Recolectar todos los IDs constituyentes
  const allUnitedIdsSet = new Set<number>();
  tablesToUnite.forEach(t => {
    allUnitedIdsSet.add(t.id_mesa);
    if (t.mesas_unidas && Array.isArray(t.mesas_unidas) && t.mesas_unidas.length > 0) {
      t.mesas_unidas.forEach(id => allUnitedIdsSet.add(Number(id)));
    }
    if (t.parent_id !== undefined && t.parent_id !== null) {
      allUnitedIdsSet.add(Number(t.parent_id));
    }
  });

  const finalUnitedIds = Array.from(allUnitedIdsSet).sort((a, b) => a - b);
  const primaryId = finalUnitedIds[0];
  const primary = allTables.find(t => t.id_mesa === primaryId) || tablesToUnite.find(t => t.id_mesa === primaryId) || tablesToUnite[0];

  // Calcular la capacidad combinada sumando la capacidad base de cada mesa constituyente
  let combinedCap = 0;
  finalUnitedIds.forEach(id => {
    const tableObj = allTables.find(t => t.id_mesa === id);
    const baseCap = (tableObj?.parent_id ? tableObj.capacidad : undefined) ||
                    INITIAL_MESAS.find(im => im.id_mesa === id)?.capacidad ||
                    tableObj?.capacidad ||
                    2;
    combinedCap += baseCap;
  });

  const combinedComensales = tablesToUnite.reduce((acc, t) => acc + (t.comensales || 0), 0);

  const constituentNames = finalUnitedIds.map(id => {
    const t = allTables.find(x => x.id_mesa === id);
    return t ? t.numero_mesa : `Mesa ${id}`;
  });
  const combinedName = formatUnitedTableName(constituentNames);

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
    if (allUnitedIdsSet.has(m.id_mesa)) {
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
      const initCap = INITIAL_MESAS.find(im => im.id_mesa === m.id_mesa)?.capacidad;
      return {
        ...m,
        numero_mesa: `Mesa ${originalNumber}`,
        capacidad: initCap || (m.capacidad ? Math.min(m.capacidad, 4) : 4),
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

/**
 * Hidrata y reconstruye la estructura de unión de mesas a partir de los datos
 * leídos desde Google Sheets, caché local o Supabase.
 * Normaliza tipos numéricos, interpreta 'mesas_unidas' y 'parent_id',
 * y si las columnas no existen aún en la hoja, deduce la unión a partir del
 * nombre canónico ('Mesa 1 y 2 (Unidas)') y estado ('unida').
 */
export function hydrateTableUnions(mesas: Mesa[]): Mesa[] {
  if (!Array.isArray(mesas) || mesas.length === 0) return [];

  // 1. Paso: Normalización básica de tipos
  const list: Mesa[] = mesas.map(m => {
    const rawUnidas = (m as any).mesas_unidas;
    let mesas_unidas: number[] = [];
    if (Array.isArray(rawUnidas)) {
      mesas_unidas = rawUnidas.map(Number).filter(n => !isNaN(n));
    } else if (typeof rawUnidas === 'string' && rawUnidas.trim()) {
      try {
        const parsed = JSON.parse(rawUnidas);
        if (Array.isArray(parsed)) {
          mesas_unidas = parsed.map(Number).filter(n => !isNaN(n));
        }
      } catch {
        mesas_unidas = rawUnidas.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
      }
    }

    let parent_id: number | null = null;
    if (m.parent_id !== undefined && m.parent_id !== null && String(m.parent_id).trim() !== '') {
      const p = Number(m.parent_id);
      if (!isNaN(p)) parent_id = p;
    }

    return {
      ...m,
      id_mesa: Number(m.id_mesa),
      capacidad: Number(m.capacidad || 2),
      comensales: m.comensales ? Number(m.comensales) : undefined,
      mesas_unidas: mesas_unidas.length > 0 ? mesas_unidas : undefined,
      parent_id
    };
  });

  // 2. Paso: Deducir uniones a partir de nombres combinados si mesas_unidas está vacío
  list.forEach(m => {
    const name = String(m.numero_mesa || '').toLowerCase();
    const isUnitedName = name.includes('unida') || name.includes('+') || (name.includes(' y ') && /\d/.test(name));

    if (isUnitedName && (!m.mesas_unidas || m.mesas_unidas.length === 0)) {
      const numbersInName = (String(m.numero_mesa).match(/\d+/g) || []).map(Number);
      if (numbersInName.length >= 2) {
        const matchingIds: number[] = [];
        numbersInName.forEach(n => {
          const match = list.find(t => t.id_mesa === n || extractTableNumber(t.numero_mesa) === String(n));
          if (match) matchingIds.push(match.id_mesa);
        });

        if (matchingIds.length >= 2) {
          m.mesas_unidas = Array.from(new Set(matchingIds)).sort((a, b) => a - b);
          m.mesas_unidas.forEach(secId => {
            if (secId !== m.id_mesa) {
              const sec = list.find(t => t.id_mesa === secId);
              if (sec) {
                sec.estado = 'unida';
                sec.parent_id = m.id_mesa;
                sec.mesas_unidas = [];
              }
            }
          });
        }
      }
    }
  });

  // 3. Paso: Reconstruir parent_id para mesas con estado 'unida' si falta
  list.forEach(m => {
    if (m.estado === 'unida' && (m.parent_id === undefined || m.parent_id === null)) {
      const parent = list.find(p =>
        p.id_mesa !== m.id_mesa && (
          (p.mesas_unidas && p.mesas_unidas.includes(m.id_mesa)) ||
          String(p.numero_mesa || '').includes(String(m.id_mesa)) ||
          String(p.numero_mesa || '').includes(extractTableNumber(m.numero_mesa))
        )
      );
      if (parent) {
        m.parent_id = parent.id_mesa;
        if (!parent.mesas_unidas) parent.mesas_unidas = [parent.id_mesa];
        if (!parent.mesas_unidas.includes(m.id_mesa)) {
          parent.mesas_unidas.push(m.id_mesa);
          parent.mesas_unidas.sort((a, b) => a - b);
        }
      }
    }
  });

  return list;
}

