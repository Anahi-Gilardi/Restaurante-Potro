/**
 * src/services/ventasPlatosService.ts
 *
 * Servicio para registrar cada plato vendido y calcular estadísticas
 * (Top 5 semanal, mensual, por día y por categoría) vinculado con Google Sheets (hoja 'ventas_platos').
 */

import { sheetFetchTable, sheetBatchInsert, sheetUpsertRow } from '../lib/googleSheetsClient';
import { getArgentinaDateTimeString } from '../lib/argentinaDate';
import { INITIAL_PRODUCTOS_MENU } from '../data/initialData';

export type MacroCategoria =
  | 'Entrantes'
  | 'Pastas'
  | 'Carnes'
  | 'Pescados'
  | 'Comidas Criollas'
  | 'Postres'
  | 'Bebidas';

export const MACRO_CATEGORIAS_ORDEN: MacroCategoria[] = [
  'Entrantes',
  'Pastas',
  'Carnes',
  'Pescados',
  'Comidas Criollas',
  'Postres',
  'Bebidas'
];

export interface CategoriaColorTheme {
  titulo: string;
  headerBg: string;
  headerText: string;
  subHeaderBg: string;
  subHeaderText: string;
  rowEvenBg: string;
  rowOddBg: string;
  subtotalBg: string;
  subtotalText: string;
  borderColor: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
}

export const CATEGORIA_COLOR_THEMES: Record<MacroCategoria, CategoriaColorTheme> = {
  'Entrantes': {
    titulo: '1. ENTRANTES (ENTRADAS)',
    headerBg: '#B45309',
    headerText: '#FFFFFF',
    subHeaderBg: '#D97706',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#FFFBEB',
    rowOddBg: '#FEF3C7',
    subtotalBg: '#FDE68A',
    subtotalText: '#78350F',
    borderColor: '#F59E0B',
    badgeClass: 'bg-amber-600 text-white',
    cardBorderClass: 'border-amber-300 dark:border-amber-800',
    cardBgClass: 'bg-amber-50/70 dark:bg-amber-950/20'
  },
  'Pastas': {
    titulo: '2. PASTAS ARTESANALES',
    headerBg: '#A16207',
    headerText: '#FFFFFF',
    subHeaderBg: '#CA8A04',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#FEFCE8',
    rowOddBg: '#FEF9C3',
    subtotalBg: '#FEF08A',
    subtotalText: '#713F12',
    borderColor: '#EAB308',
    badgeClass: 'bg-yellow-600 text-white',
    cardBorderClass: 'border-yellow-300 dark:border-yellow-800',
    cardBgClass: 'bg-yellow-50/70 dark:bg-yellow-950/20'
  },
  'Carnes': {
    titulo: '3. CARNES Y PARRILLA',
    headerBg: '#991B1B',
    headerText: '#FFFFFF',
    subHeaderBg: '#B91C1C',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#FEF2F2',
    rowOddBg: '#FEE2E2',
    subtotalBg: '#FECACA',
    subtotalText: '#7F1D1D',
    borderColor: '#EF4444',
    badgeClass: 'bg-red-700 text-white',
    cardBorderClass: 'border-red-300 dark:border-red-800',
    cardBgClass: 'bg-red-50/70 dark:bg-red-950/20'
  },
  'Pescados': {
    titulo: '4. PESCADOS Y MARISCOS',
    headerBg: '#0369A1',
    headerText: '#FFFFFF',
    subHeaderBg: '#0284C7',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#F0F9FF',
    rowOddBg: '#E0F2FE',
    subtotalBg: '#BAE6FD',
    subtotalText: '#0C4A6E',
    borderColor: '#38BDF8',
    badgeClass: 'bg-sky-700 text-white',
    cardBorderClass: 'border-sky-300 dark:border-sky-800',
    cardBgClass: 'bg-sky-50/70 dark:bg-sky-950/20'
  },
  'Comidas Criollas': {
    titulo: '5. COMIDAS CRIOLLAS',
    headerBg: '#624A3E',
    headerText: '#FFFFFF',
    subHeaderBg: '#7C5E4F',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#FAF6F0',
    rowOddBg: '#F3ECE3',
    subtotalBg: '#E6D7C3',
    subtotalText: '#3E2C23',
    borderColor: '#A88973',
    badgeClass: 'bg-[#624A3E] text-white',
    cardBorderClass: 'border-stone-300 dark:border-stone-700',
    cardBgClass: 'bg-[#FAF6F0]/80 dark:bg-stone-900/50'
  },
  'Postres': {
    titulo: '6. POSTRES',
    headerBg: '#7E22CE',
    headerText: '#FFFFFF',
    subHeaderBg: '#9333EA',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#FAF5FF',
    rowOddBg: '#F3E8FF',
    subtotalBg: '#E9D5FF',
    subtotalText: '#581C87',
    borderColor: '#C084FC',
    badgeClass: 'bg-purple-700 text-white',
    cardBorderClass: 'border-purple-300 dark:border-purple-800',
    cardBgClass: 'bg-purple-50/70 dark:bg-purple-950/20'
  },
  'Bebidas': {
    titulo: '7. BEBIDAS Y BODEGA',
    headerBg: '#047857',
    headerText: '#FFFFFF',
    subHeaderBg: '#059669',
    subHeaderText: '#FFFFFF',
    rowEvenBg: '#ECFDF5',
    rowOddBg: '#D1FAE5',
    subtotalBg: '#A7F3D0',
    subtotalText: '#064E3B',
    borderColor: '#34D399',
    badgeClass: 'bg-emerald-700 text-white',
    cardBorderClass: 'border-emerald-300 dark:border-emerald-800',
    cardBgClass: 'bg-emerald-50/70 dark:bg-emerald-950/20'
  }
};

const normalizeText = (val: string): string =>
  (val || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const classifyMacroCategoria = (nombrePlato: string, rawCategoria?: string): MacroCategoria => {
  const baseDishName = (nombrePlato || '').split(' - ')[0].split(' (')[0].trim();
  const normBaseName = normalizeText(baseDishName);
  const normFullName = normalizeText(nombrePlato);
  const normCat = normalizeText(rawCategoria || '');

  // 1. Buscar coincidencia exacta o por nombre base en el catálogo oficial INITIAL_PRODUCTOS_MENU
  const matchedProduct = INITIAL_PRODUCTOS_MENU.find(p => {
    const pNorm = normalizeText(p.nombre);
    return pNorm === normBaseName || pNorm === normFullName;
  });

  if (matchedProduct) {
    const id = (matchedProduct.id_producto || '').toLowerCase();
    const cat = normalizeText(matchedProduct.categoria || '');
    const tipo = (matchedProduct.tipo || '').toLowerCase();

    if (id.startsWith('prod_ent_') || cat.includes('entrada')) return 'Entrantes';
    if (id.startsWith('prod_pas_') || cat.includes('pasta')) return 'Pastas';
    if (id.startsWith('prod_car_') || cat.includes('carne') || cat.includes('parrilla')) return 'Carnes';
    if (id.startsWith('prod_pes_') || cat.includes('pescad') || cat.includes('marisc')) return 'Pescados';
    if (id.startsWith('prod_cri_') || cat.includes('criolla')) return 'Comidas Criollas';
    if (id.startsWith('prod_pos_') || cat.includes('postre') || tipo === 'postre') return 'Postres';
    if (tipo === 'vino' || tipo === 'bebida' || cat.includes('bodega') || cat.includes('bebida')) return 'Bebidas';
  }

  // 2. Clasificación por palabras clave del nombre base del plato/bebida
  if (
    normBaseName.includes('charcuteria') ||
    normBaseName.includes('pera asada') ||
    normBaseName.includes('peras asadas') ||
    normBaseName.includes('provolone') ||
    normBaseName.includes('provoleta') ||
    normBaseName.includes('empanada') ||
    normBaseName.includes('carpaccio') ||
    normBaseName.includes('burrata') ||
    normBaseName.includes('molleja') ||
    normBaseName.includes('rabas') ||
    normBaseName.includes('bruschetta')
  ) {
    return 'Entrantes';
  }

  if (
    normBaseName.includes('lasagna') ||
    normBaseName.includes('lasana') ||
    normBaseName.includes('crepe') ||
    normBaseName.includes('cintas') ||
    normBaseName.startsWith('cinta ') ||
    normBaseName.includes('noquis') ||
    normBaseName.includes('rotolo') ||
    normBaseName.includes('risotto') ||
    normBaseName.includes('raviol') ||
    normBaseName.includes('sorrentino') ||
    normBaseName.includes('tallarin')
  ) {
    return 'Pastas';
  }

  if (
    normBaseName.includes('salmon') ||
    normBaseName.includes('trucha') ||
    normBaseName.includes('pacu') ||
    normBaseName.includes('abadejo') ||
    normBaseName.includes('merluza') ||
    normBaseName.includes('marisco') ||
    normBaseName.includes('pescado') ||
    normBaseName.includes('langostino')
  ) {
    return 'Pescados';
  }

  if (
    normBaseName.includes('locro') ||
    normBaseName.includes('lenteja') ||
    normBaseName.includes('guiso') ||
    normBaseName.includes('humita') ||
    normBaseName.includes('carbonada') ||
    normBaseName.includes('tamal')
  ) {
    return 'Comidas Criollas';
  }

  if (
    normBaseName.includes('lomo') ||
    normBaseName.includes('bondiola') ||
    normBaseName.includes('milanesa') ||
    normBaseName.includes('ojo de bife') ||
    normBaseName.includes('bife') ||
    normBaseName.includes('entrecot') ||
    normBaseName.includes('costillar') ||
    normBaseName.includes('entrana') ||
    normBaseName.includes('matambrito') ||
    normBaseName.includes('matambre') ||
    normBaseName.includes('asado') ||
    normBaseName.includes('vacio') ||
    normBaseName.includes('chivito') ||
    normBaseName.includes('cabrito') ||
    normBaseName.includes('cordero') ||
    normBaseName.includes('hamburguesa')
  ) {
    return 'Carnes';
  }

  if (
    normBaseName.includes('lingote') ||
    normBaseName.includes('panna cotta') ||
    normBaseName.includes('pannacotta') ||
    normBaseName.includes('tarta de queso') ||
    normBaseName.includes('tarta vasca') ||
    normBaseName.includes('cheesecake') ||
    normBaseName.includes('tiramisu') ||
    normBaseName.includes('flan') ||
    normBaseName.includes('helado') ||
    normBaseName.includes('brownie') ||
    normBaseName.includes('chocotorta') ||
    normBaseName.includes('panqueque') ||
    normBaseName.includes('vigilante')
  ) {
    return 'Postres';
  }

  if (
    normBaseName.includes('malbec') ||
    normBaseName.includes('cabernet') ||
    normBaseName.includes('chardonnay') ||
    normBaseName.includes('sauvignon') ||
    normBaseName.includes('merlot') ||
    normBaseName.includes('pinot') ||
    normBaseName.includes('torrontes') ||
    normBaseName.includes('blend') ||
    normBaseName.includes('brut') ||
    normBaseName.includes('champagne') ||
    normBaseName.includes('espumante') ||
    normBaseName.includes('trumpeter') ||
    normBaseName.includes('rutini') ||
    normBaseName.includes('salentein') ||
    normBaseName.includes('perdices') ||
    normBaseName.includes('catena') ||
    normBaseName.includes('enemigo') ||
    normBaseName.includes('escorihuela') ||
    normBaseName.includes('nicasia') ||
    normBaseName.includes('alamos') ||
    normBaseName.includes('saint felicien') ||
    normBaseName.includes('portillo') ||
    normBaseName.includes('baron b') ||
    normBaseName.includes('chandon') ||
    normBaseName.includes('alyda') ||
    normBaseName.includes('whisky') ||
    normBaseName.includes('macallan') ||
    normBaseName.includes('gin') ||
    normBaseName.includes('fernet') ||
    normBaseName.includes('aperol') ||
    normBaseName.includes('campari') ||
    normBaseName.includes('vermouth') ||
    normBaseName.includes('cerveza') ||
    normBaseName.includes('stella') ||
    normBaseName.includes('corona') ||
    normBaseName.includes('patagonia') ||
    normBaseName.includes('quilmes') ||
    normBaseName.includes('heineken') ||
    normBaseName.includes('gaseosa') ||
    normBaseName.includes('coca') ||
    normBaseName.includes('sprite') ||
    normBaseName.includes('fanta') ||
    normBaseName.includes('schweppes') ||
    normBaseName.includes('tonica') ||
    normBaseName.includes('pomelo') ||
    normBaseName.includes('soda') ||
    normBaseName.includes('agua') ||
    normBaseName.includes('saborizada') ||
    normBaseName.includes('aquarius') ||
    normBaseName.includes('cepita') ||
    normBaseName.includes('jugo') ||
    normBaseName.includes('limonada') ||
    normBaseName.includes('cafe') ||
    normBaseName.includes('espresso') ||
    normBaseName.includes('cortado') ||
    normBaseName.includes('lagrima') ||
    normBaseName.includes('capuccino') ||
    normBaseName.startsWith('te ') ||
    normBaseName.includes('infusion')
  ) {
    return 'Bebidas';
  }

  // 3. Clasificación por el campo categoría registrado
  if (normCat.includes('entrada') || normCat.includes('entrante')) return 'Entrantes';
  if (normCat.includes('pasta')) return 'Pastas';
  if (normCat.includes('pescad') || normCat.includes('marisc')) return 'Pescados';
  if (normCat.includes('criolla')) return 'Comidas Criollas';
  if (normCat.includes('postre') || normCat.includes('dulce')) return 'Postres';
  if (
    normCat.includes('bebida') ||
    normCat.includes('bodega') ||
    normCat.includes('vino') ||
    normCat.includes('cerveza') ||
    normCat.includes('trago') ||
    normCat.includes('coctel') ||
    normCat.includes('espumante') ||
    normCat.includes('destilado') ||
    normCat.includes('cafeteria') ||
    normCat.includes('gaseosa') ||
    normCat.includes('agua')
  ) {
    return 'Bebidas';
  }
  if (normCat.includes('carne') || normCat.includes('parrilla') || normCat.includes('corte')) return 'Carnes';

  return 'Carnes';
};

export interface VentaPlatoRow {
  id_registro: string;
  fecha: string;
  dia_semana: string;
  numero_mesa: string | number;
  nombre_plato: string;
  categoria: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  cajero_mozo: string;
}

export interface RankingItem {
  nombre: string;
  categoria: MacroCategoria;
  cantidad: number;
  totalVendido: number;
  porcentaje: number;
  precioPromedio: number;
}

export type RankingPeriodo = 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'historico';

export interface RankingResult {
  periodo: RankingPeriodo;
  fechaInicio: string;
  fechaFin: string;
  totalPorciones: number;
  totalFacturado: number;
  top5: RankingItem[];
  todos: RankingItem[];
  porDiaSemana: Record<string, Record<string, number>>; // { 'Lunes': { 'Locro': 2, ... } }
  porCategoria: Record<MacroCategoria, { cantidad: number; total: number; items: RankingItem[] }>;
}

const PLATOS_BASE_CARTA: Array<{ nombre: string; categoria: MacroCategoria; precio: number }> = [
  // 1. Entrantes
  { nombre: 'Tabla', categoria: 'Entrantes', precio: 24600 },
  { nombre: 'Peras asadas', categoria: 'Entrantes', precio: 13300 },
  { nombre: 'Provolone', categoria: 'Entrantes', precio: 16700 },
  { nombre: 'Dúo de empanadas', categoria: 'Entrantes', precio: 9000 },
  // 2. Pastas
  { nombre: 'Lasaña', categoria: 'Pastas', precio: 26300 },
  { nombre: 'Crepes de espinaca y parmesano', categoria: 'Pastas', precio: 23800 },
  { nombre: 'Cintas finas al huevo con filetto y estofado', categoria: 'Pastas', precio: 25600 },
  { nombre: 'Cintas finas al huevo con crema de hongos de pino', categoria: 'Pastas', precio: 25600 },
  { nombre: 'Cintas finas al huevo a la carbonara', categoria: 'Pastas', precio: 25600 },
  { nombre: 'Rotolo di tata', categoria: 'Pastas', precio: 27000 },
  { nombre: 'Cinta anchas de  cepia', categoria: 'Pastas', precio: 31200 },
  { nombre: 'Risotto', categoria: 'Pastas', precio: 26000 },
  // 3. Carnes
  { nombre: 'Lomo en demiglace de pimienta', categoria: 'Carnes', precio: 36700 },
  { nombre: 'Bondiola de cerdo', categoria: 'Carnes', precio: 29900 },
  { nombre: 'Milanesa de entrecot.', categoria: 'Carnes', precio: 33900 },
  { nombre: 'Ojo de bife con aligot de papas - Patrón', categoria: 'Carnes', precio: 39800 },
  // 4. Pescados
  { nombre: 'Salmón rosado', categoria: 'Pescados', precio: 37800 },
  { nombre: 'Trucha salmonada', categoria: 'Pescados', precio: 34500 },
  { nombre: 'Pacú', categoria: 'Pescados', precio: 32000 },
  // 5. Comidas Criollas
  { nombre: 'Humita', categoria: 'Comidas Criollas', precio: 26700 },
  { nombre: 'Guiso de lentejas', categoria: 'Comidas Criollas', precio: 26300 },
  { nombre: 'Locro criollo', categoria: 'Comidas Criollas', precio: 27500 },
  // 6. Postres
  { nombre: 'Lingote de chocolate', categoria: 'Postres', precio: 12800 },
  { nombre: 'Panna cotta con frutos rojos', categoria: 'Postres', precio: 14200 },
  { nombre: 'Tarta de queso vasca', categoria: 'Postres', precio: 13900 },
  { nombre: 'Profiterol de tiramisú', categoria: 'Postres', precio: 12800 },
  { nombre: 'Flan casero tradicional con dulce de leche y crema', categoria: 'Postres', precio: 10500 }
];

/**
 * Unifica variantes de nombres del catálogo local vs histórico de Google Sheets
 * para que cada nueva venta sume siempre sobre la misma fila del plato o bebida.
 */
const canonicalizePlatoName = (rawName: string): { key: string; displayName: string } => {
  const trimmed = (rawName || 'Sin Nombre').trim().replace(/\s+/g, ' ');
  const norm = normalizeText(trimmed).replace(/\.$/, '').replace(/\s+/g, ' ');

  if (norm === 'charcuteria de elaboracion propia' || norm === 'tabla' || norm === 'tabla de fiambres') {
    return { key: 'tabla', displayName: 'Tabla' };
  }
  if (norm.startsWith('pera asada') || norm.startsWith('peras asadas')) {
    return { key: 'peras asadas', displayName: 'Peras asadas' };
  }
  if (norm.startsWith('provolone')) {
    return { key: 'provolone', displayName: 'Provolone' };
  }
  if (norm.startsWith('duo de empanadas')) {
    return { key: 'duo de empanadas', displayName: 'Dúo de empanadas' };
  }
  if (norm.startsWith('lasagna') || norm.startsWith('lasana')) {
    return { key: 'lasana', displayName: 'Lasaña' };
  }
  if (norm.startsWith('rotolo di tata')) {
    return { key: 'rotolo di tata', displayName: 'Rotolo di tata' };
  }
  if (norm.includes('cepia') || norm.includes('sepia')) {
    return { key: 'cinta anchas de cepia', displayName: 'Cinta anchas de  cepia' };
  }
  if (norm === 'bondiola ahumada' || norm === 'bondiola de cerdo') {
    return { key: 'bondiola de cerdo', displayName: 'Bondiola de cerdo' };
  }
  if (norm.startsWith('milanesa de entrecot')) {
    return { key: 'milanesa de entrecot', displayName: 'Milanesa de entrecot.' };
  }
  if (norm === 'trucha' || norm === 'trucha salmonada') {
    return { key: 'trucha salmonada', displayName: 'Trucha salmonada' };
  }
  if (norm === 'pacu' || norm === 'pacu con papas rusticas') {
    return { key: 'pacu', displayName: 'Pacú' };
  }
  if (norm.startsWith('humita')) {
    return { key: 'humita', displayName: 'Humita' };
  }
  if (norm.startsWith('guiso de lentejas')) {
    return { key: 'guiso de lentejas', displayName: 'Guiso de lentejas' };
  }
  if (norm.startsWith('locro')) {
    return { key: 'locro criollo', displayName: 'Locro criollo' };
  }
  if (norm.startsWith('tiramisu') || norm.startsWith('profiterol de tiramisu')) {
    return { key: 'profiterol de tiramisu', displayName: 'Profiterol de tiramisú' };
  }

  return { key: norm || 'sin nombre', displayName: trimmed };
};

const LOCAL_STORAGE_KEY = 'el_patron_ventas_platos';
const RECORDED_ORDERS_STORAGE_KEY = 'el_patron_ventas_platos_recorded_orders';

let memoryVentasRows: VentaPlatoRow[] | null = null;
const recordedOrderIds = new Set<string>();

if (typeof window !== 'undefined') {
  try {
    const savedOrders = window.localStorage.getItem(RECORDED_ORDERS_STORAGE_KEY);
    if (savedOrders) {
      const parsed = JSON.parse(savedOrders);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => recordedOrderIds.add(String(id)));
      }
    }
  } catch {}

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('el_patron_table_sync');
      bc.addEventListener('message', (event) => {
        if (event.data?.type === 'ventas_platos_updated' && Array.isArray(event.data?.payload)) {
          const incoming: VentaPlatoRow[] = event.data.payload;
          const current = ventasPlatosService.getLocalCache();
          const map = new Map<string, VentaPlatoRow>();
          current.forEach(r => map.set(r.id_registro, r));
          incoming.forEach(r => map.set(r.id_registro, r));
          const merged = Array.from(map.values());
          ventasPlatosService.setLocalCache(merged, false);
          window.dispatchEvent(new CustomEvent('el-patron-ventas-platos-updated', { detail: merged }));
        }
      });
    }
  } catch {}
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getDiaSemanaArgentina = (date: Date = new Date()): string => {
  return DIAS_SEMANA[date.getDay()] || 'Lunes';
};

const getStartOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfMonth = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

const parseRowDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  // Formato argentino: DD/MM/YYYY HH:mm o ISO
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      let hour = 0;
      let minute = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10) || 0;
        minute = parseInt(timeParts[1], 10) || 0;
      }
      return new Date(year, month, day, hour, minute);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const escapeHtml = (str: string): string =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const ventasPlatosService = {
  getLocalCache(): VentaPlatoRow[] {
    if (memoryVentasRows && memoryVentasRows.length > 0) {
      return memoryVentasRows;
    }
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryVentasRows = parsed;
          return parsed;
        }
      }
    } catch {}
    return memoryVentasRows || [];
  },

  setLocalCache(items: VentaPlatoRow[], notify = false): void {
    memoryVentasRows = items;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(0, 1000)));
      } catch {}
    }
    if (notify) {
      window.dispatchEvent(new CustomEvent('el-patron-ventas-platos-updated', { detail: items }));
    }
  },

  async list(forceFresh = false): Promise<VentaPlatoRow[]> {
    const local = this.getLocalCache();
    try {
      const sheetData = await sheetFetchTable('ventas_platos', forceFresh);
      if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
        const mapped: VentaPlatoRow[] = sheetData.map((r, index) => {
          const nombrePlato = String(r.nombre_plato || r.plato || r.descripcion || '');
          const rawCat = String(r.categoria || '');
          return {
            id_registro: String(r.id_registro || `vp_sheet_${index}_${nombrePlato}`),
            fecha: String(r.fecha || ''),
            dia_semana: String(r.dia_semana || ''),
            numero_mesa: r.numero_mesa || r.mesa || '',
            nombre_plato: nombrePlato,
            categoria: classifyMacroCategoria(nombrePlato, rawCat),
            cantidad: Number(r.cantidad) || 1,
            precio_unitario: Number(r.precio_unitario || r.precio) || 0,
            subtotal: Number(r.subtotal) || ((Number(r.cantidad) || 1) * (Number(r.precio_unitario) || 0)),
            cajero_mozo: String(r.cajero_mozo || r.cajero || r.mozo || '')
          };
        });

        // Combinar datos locales y remotos por id_registro preservando ventas recién realizadas
        const map = new Map<string, VentaPlatoRow>();
        mapped.forEach(item => map.set(item.id_registro, item));
        local.forEach(item => {
          if (!map.has(item.id_registro)) {
            map.set(item.id_registro, {
              ...item,
              categoria: classifyMacroCategoria(item.nombre_plato, item.categoria)
            });
          }
        });
        const merged = Array.from(map.values());
        this.setLocalCache(merged, true);
        return merged;
      }
    } catch (err) {
      console.warn('[ventasPlatosService.list] Fallback a caché local:', err);
    }
    const fallback = local.map(item => ({
      ...item,
      categoria: classifyMacroCategoria(item.nombre_plato, item.categoria)
    }));
    memoryVentasRows = fallback;
    return fallback;
  },

  async recordSaleItems(
    items: Array<{
      id_producto?: string;
      nombre?: string;
      descripcion?: string;
      cantidad: number;
      precio_unitario?: number;
      subtotal?: number;
      categoria?: string;
    }>,
    metadata: {
      numeroMesa: string | number;
      mozo?: string;
      cajero?: string;
      fecha?: Date | number | string;
      idPedido?: string | number;
    }
  ): Promise<VentaPlatoRow[]> {
    if (!items || items.length === 0) return [];

    // Deduplicación por idPedido para evitar doble conteo si se invoca desde múltiples flujos de cierre
    const orderKey = metadata.idPedido !== undefined && metadata.idPedido !== null
      ? String(metadata.idPedido).trim()
      : '';
    if (orderKey && recordedOrderIds.has(orderKey)) {
      return [];
    }
    if (orderKey) {
      recordedOrderIds.add(orderKey);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            RECORDED_ORDERS_STORAGE_KEY,
            JSON.stringify(Array.from(recordedOrderIds).slice(-500))
          );
        } catch {}
      }
    }

    const saleDate = metadata.fecha ? new Date(metadata.fecha) : new Date();
    const fechaStr = getArgentinaDateTimeString(saleDate);
    const diaSemanaStr = getDiaSemanaArgentina(saleDate);
    const timestamp = Date.now();
    const cajeroMozo = metadata.cajero || metadata.mozo || 'Cajero';
    const baseIdPrefix = orderKey ? `vp_ped_${orderKey}` : `vp_${timestamp}`;

    const rows: VentaPlatoRow[] = items
      .filter(it => (Number(it.cantidad) || 0) > 0)
      .map((it, idx) => {
        const qty = Number(it.cantidad) || 1;
        const unit = Number(it.precio_unitario) || 0;
        const sub = Number(it.subtotal) || (qty * unit);
        const rawName = it.nombre || it.descripcion || 'Plato';
        const { displayName } = canonicalizePlatoName(rawName);
        const cat = classifyMacroCategoria(displayName, it.categoria);

        return {
          id_registro: `${baseIdPrefix}_${idx}`,
          fecha: fechaStr,
          dia_semana: diaSemanaStr,
          numero_mesa: metadata.numeroMesa,
          nombre_plato: displayName,
          categoria: cat,
          cantidad: qty,
          precio_unitario: unit,
          subtotal: sub,
          cajero_mozo: cajeroMozo
        };
      });

    if (rows.length === 0) return [];

    // Guardar inmediatamente en memoria + caché local y notificar a toda la interfaz (0ms)
    const current = this.getLocalCache();
    const map = new Map<string, VentaPlatoRow>();
    rows.forEach(r => map.set(r.id_registro, r));
    current.forEach(r => {
      if (!map.has(r.id_registro)) {
        map.set(r.id_registro, r);
      }
    });
    const updated = Array.from(map.values());
    this.setLocalCache(updated, true);

    // Sincronizar con otras pestañas abiertas
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('el_patron_table_sync');
        bc.postMessage({ type: 'ventas_platos_updated', payload: rows });
        bc.close();
      } catch {}
    }

    // Enviar a Google Sheets en segundo plano sin congelar la app
    (async () => {
      try {
        await sheetBatchInsert('ventas_platos', rows);
      } catch {
        for (const row of rows) {
          try {
            await sheetUpsertRow('ventas_platos', row);
          } catch {}
        }
      }
    })().catch(err => {
      console.warn('[ventasPlatosService.recordSaleItems] Error de persistencia en Sheets:', err);
    });

    return rows;
  },

  calculateRanking(
    ventas: VentaPlatoRow[],
    periodo: RankingPeriodo = 'historico'
  ): RankingResult {
    const now = new Date();
    let startFilter: Date | null = null;
    let endFilter: Date | null = new Date();

    if (periodo === 'hoy') {
      startFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (periodo === 'semana') {
      startFilter = getStartOfWeek(now);
    } else if (periodo === 'mes') {
      startFilter = getStartOfMonth(now);
    } else if (periodo === 'mes_anterior') {
      startFilter = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endFilter = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    const filtered = ventas.filter(row => {
      if (!startFilter) return true;
      const rowDate = parseRowDate(row.fecha);
      if (!rowDate) return true; // Si no parsea, conservamos
      return rowDate >= startFilter && rowDate <= (endFilter || now);
    });

    // Agrupar por clave canónica de plato/bebida para sumar siempre en el mismo ítem
    const grouped = new Map<string, { nombre: string; categoria: MacroCategoria; cantidad: number; total: number }>();
    const porDiaSemana: Record<string, Record<string, number>> = {
      Lunes: {},
      Martes: {},
      Miércoles: {},
      Jueves: {},
      Viernes: {},
      Sábado: {},
      Domingo: {}
    };

    const porCategoria: Record<MacroCategoria, { cantidad: number; total: number; items: RankingItem[] }> = {
      'Entrantes': { cantidad: 0, total: 0, items: [] },
      'Pastas': { cantidad: 0, total: 0, items: [] },
      'Carnes': { cantidad: 0, total: 0, items: [] },
      'Pescados': { cantidad: 0, total: 0, items: [] },
      'Comidas Criollas': { cantidad: 0, total: 0, items: [] },
      'Postres': { cantidad: 0, total: 0, items: [] },
      'Bebidas': { cantidad: 0, total: 0, items: [] }
    };

    let totalPorciones = 0;
    let totalFacturado = 0;

    filtered.forEach(row => {
      const rawName = (row.nombre_plato || 'Sin Nombre').trim();
      const { key, displayName } = canonicalizePlatoName(rawName);
      const qty = Number(row.cantidad) || 0;
      const sub = Number(row.subtotal) || 0;
      const cat = classifyMacroCategoria(displayName, row.categoria);
      const dia = (row.dia_semana || 'Lunes').trim();

      totalPorciones += qty;
      totalFacturado += sub;

      // Sumar cantidad vendida y monto total en el plato o bebida correspondiente
      const prev = grouped.get(key);
      if (prev) {
        grouped.set(key, {
          nombre: prev.nombre,
          categoria: prev.categoria,
          cantidad: prev.cantidad + qty,
          total: prev.total + sub
        });
      } else {
        grouped.set(key, {
          nombre: displayName,
          categoria: cat,
          cantidad: qty,
          total: sub
        });
      }

      // Por dia semana
      const finalName = prev ? prev.nombre : displayName;
      if (porDiaSemana[dia]) {
        porDiaSemana[dia][finalName] = (porDiaSemana[dia][finalName] || 0) + qty;
      }

      // Por categoria
      porCategoria[cat].cantidad += qty;
      porCategoria[cat].total += sub;
    });

    const items: RankingItem[] = Array.from(grouped.values()).map((data) => {
      const pct = totalPorciones > 0 ? (data.cantidad / totalPorciones) * 100 : 0;
      const avgPrice = data.cantidad > 0 ? data.total / data.cantidad : 0;
      return {
        nombre: data.nombre,
        categoria: data.categoria,
        cantidad: data.cantidad,
        totalVendido: data.total,
        porcentaje: Math.round(pct * 10) / 10,
        precioPromedio: Math.round(avgPrice)
      };
    });

    // Ordenar de mayor a menor cantidad vendida
    items.sort((a, b) => b.cantidad - a.cantidad || b.totalVendido - a.totalVendido);

    // Poblar los items ordenados dentro de cada bloque de categoría
    items.forEach(item => {
      if (porCategoria[item.categoria]) {
        porCategoria[item.categoria].items.push(item);
      }
    });

    // Asegurar que los platos fijos de la carta (como Humita, Guiso de lentejas y Locro criollo en Comidas Criollas)
    // siempre figuren en su bloque correspondiente aunque tengan 0 ventas en el período filtrado
    PLATOS_BASE_CARTA.forEach(platoBase => {
      const catList = porCategoria[platoBase.categoria]?.items;
      if (!catList) return;
      const { key: baseKey } = canonicalizePlatoName(platoBase.nombre);
      const alreadyExists = catList.some(it => {
        const { key: itemKey } = canonicalizePlatoName(it.nombre);
        return itemKey === baseKey || itemKey.includes(baseKey) || baseKey.includes(itemKey);
      });
      if (!alreadyExists) {
        catList.push({
          nombre: platoBase.nombre,
          categoria: platoBase.categoria,
          cantidad: 0,
          totalVendido: 0,
          porcentaje: 0,
          precioPromedio: platoBase.precio
        });
      }
    });

    const top5 = items.slice(0, 5);

    return {
      periodo,
      fechaInicio: startFilter ? startFilter.toLocaleDateString('es-AR') : 'Octubre - Noviembre (Todo)',
      fechaFin: (endFilter || now).toLocaleDateString('es-AR'),
      totalPorciones,
      totalFacturado,
      top5,
      todos: items,
      porDiaSemana,
      porCategoria
    };
  },

  async syncAndExportRankingToExcel(periodo: RankingPeriodo = 'historico'): Promise<RankingResult> {
    const freshRows = await this.list(true);
    const freshRanking = this.calculateRanking(freshRows, periodo);
    this.exportRankingToExcel(freshRanking);
    return freshRanking;
  },

  exportRankingToExcel(ranking: RankingResult): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const periodoLabel =
      ranking.periodo === 'hoy'
        ? 'HOY'
        : ranking.periodo === 'semana'
        ? 'ESTA SEMANA'
        : ranking.periodo === 'mes'
        ? 'MES ACTUAL (NOVIEMBRE)'
        : ranking.periodo === 'mes_anterior'
        ? 'MES ANTERIOR (OCTUBRE)'
        : 'HISTÓRICO COMPLETO (OCTUBRE + NOVIEMBRE)';

    const fechaEmision = getArgentinaDateTimeString(new Date());

    // Construir bloques por categoría con color en una misma hoja
    const categoryBlocksHtml = MACRO_CATEGORIAS_ORDEN.map(catKey => {
      const theme = CATEGORIA_COLOR_THEMES[catKey];
      const catData = ranking.porCategoria?.[catKey] || {
        cantidad: 0,
        total: 0,
        items: ranking.todos.filter(i => classifyMacroCategoria(i.nombre, i.categoria) === catKey)
      };
      const itemsCat = catData.items || [];
      const catTotalQty = itemsCat.reduce((sum, i) => sum + i.cantidad, 0);
      const catTotalMonto = itemsCat.reduce((sum, i) => sum + i.totalVendido, 0);

      const rowsHtml =
        itemsCat.length > 0
          ? itemsCat
              .map((item, idx) => {
                const rowBg = idx % 2 === 0 ? theme.rowEvenBg : theme.rowOddBg;
                const pctRubro = catTotalQty > 0 ? Math.round((item.cantidad / catTotalQty) * 1000) / 10 : 0;
                return `
                  <tr>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:center; font-weight:bold; color:#333333; padding:6px;">${idx + 1}</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:left; font-weight:bold; color:#1C1917; padding:6px;">${escapeHtml(item.nombre)}</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:center; color:#44403C; padding:6px;">${escapeHtml(catKey)}</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:center; font-weight:bold; color:#1C1917; padding:6px;">${item.cantidad}</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:center; color:#57534E; padding:6px;">${pctRubro}%</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:right; color:#44403C; padding:6px;">$${Math.round(item.precioPromedio).toLocaleString('es-AR')}</td>
                    <td style="background-color:${rowBg}; border:1px solid ${theme.borderColor}; text-align:right; font-weight:bold; color:#1C1917; padding:6px;">$${Math.round(item.totalVendido).toLocaleString('es-AR')}</td>
                  </tr>
                `;
              })
              .join('')
          : `
            <tr>
              <td colspan="7" style="background-color:${theme.rowEvenBg}; border:1px solid ${theme.borderColor}; text-align:center; font-style:italic; color:#78716C; padding:8px;">
                Sin ventas registradas en ${escapeHtml(catKey)} durante este período
              </td>
            </tr>
          `;

      return `
        <tr><td colspan="7" style="height:14px; border:none;"></td></tr>
        <tr>
          <td colspan="7" style="background-color:${theme.headerBg}; color:${theme.headerText}; font-size:13pt; font-weight:bold; text-align:left; padding:8px 10px; border:1px solid ${theme.headerBg};">
            ${escapeHtml(theme.titulo)}
          </td>
        </tr>
        <tr>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:6px;">#</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:left; border:1px solid ${theme.borderColor}; padding:6px;">PLATO / BEBIDA</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:6px;">RUBRO</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:6px;">CANTIDAD VENDIDA</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:6px;">% DEL RUBRO</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:right; border:1px solid ${theme.borderColor}; padding:6px;">PRECIO PROMEDIO</td>
          <td style="background-color:${theme.subHeaderBg}; color:${theme.subHeaderText}; font-weight:bold; text-align:right; border:1px solid ${theme.borderColor}; padding:6px;">TOTAL VENDIDO ($)</td>
        </tr>
        ${rowsHtml}
        <tr>
          <td colspan="3" style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; font-weight:bold; text-align:right; border:1px solid ${theme.borderColor}; padding:7px;">
            SUBTOTAL ${escapeHtml(catKey.toUpperCase())}:
          </td>
          <td style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:7px; font-size:11pt;">
            ${catTotalQty}
          </td>
          <td style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; font-weight:bold; text-align:center; border:1px solid ${theme.borderColor}; padding:7px;">
            100%
          </td>
          <td style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; border:1px solid ${theme.borderColor}; padding:7px;"></td>
          <td style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; font-weight:bold; text-align:right; border:1px solid ${theme.borderColor}; padding:7px; font-size:11pt;">
            $${Math.round(catTotalMonto).toLocaleString('es-AR')}
          </td>
        </tr>
      `;
    }).join('');

    // Resumen superior por rubro con colores
    const summaryRowsHtml = MACRO_CATEGORIAS_ORDEN.map(catKey => {
      const theme = CATEGORIA_COLOR_THEMES[catKey];
      const itemsCat = ranking.porCategoria?.[catKey]?.items || ranking.todos.filter(i => classifyMacroCategoria(i.nombre, i.categoria) === catKey);
      const catQty = itemsCat.reduce((sum, i) => sum + i.cantidad, 0);
      const catTotal = itemsCat.reduce((sum, i) => sum + i.totalVendido, 0);
      const pctGlobal = ranking.totalPorciones > 0 ? Math.round((catQty / ranking.totalPorciones) * 1000) / 10 : 0;

      return `
        <tr>
          <td colspan="2" style="background-color:${theme.headerBg}; color:${theme.headerText}; font-weight:bold; padding:6px 10px; border:1px solid ${theme.borderColor};">
            ${escapeHtml(theme.titulo)}
          </td>
          <td style="background-color:${theme.rowEvenBg}; color:#1C1917; font-weight:bold; text-align:center; padding:6px; border:1px solid ${theme.borderColor};">
            ${itemsCat.length} variedades
          </td>
          <td style="background-color:${theme.rowOddBg}; color:#1C1917; font-weight:bold; text-align:center; padding:6px; border:1px solid ${theme.borderColor};">
            ${catQty}
          </td>
          <td style="background-color:${theme.rowEvenBg}; color:#44403C; text-align:center; padding:6px; border:1px solid ${theme.borderColor};">
            ${pctGlobal}%
          </td>
          <td colspan="2" style="background-color:${theme.subtotalBg}; color:${theme.subtotalText}; font-weight:bold; text-align:right; padding:6px 10px; border:1px solid ${theme.borderColor};">
            $${Math.round(catTotal).toLocaleString('es-AR')}
          </td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Recuento Platos y Bebidas</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body, table, td, th {
            font-family: Calibri, Arial, sans-serif;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <table cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%;">
          <colgroup>
            <col width="55" />
            <col width="360" />
            <col width="150" />
            <col width="140" />
            <col width="110" />
            <col width="145" />
            <col width="160" />
          </colgroup>

          <!-- ENCABEZADO PRINCIPAL -->
          <tr>
            <td colspan="7" style="background-color:#2E190E; color:#FFFDF8; font-size:15pt; font-weight:bold; text-align:center; padding:12px;">
              EL PATRÓN — RECUENTO DE PLATOS Y BEBIDAS VENDIDAS POR RUBRO
            </td>
          </tr>
          <tr>
            <td colspan="3" style="background-color:#F5F1E9; color:#2E190E; font-weight:bold; padding:7px; border:1px solid #D6CFC2;">
              PERÍODO: ${escapeHtml(periodoLabel)} (${escapeHtml(ranking.fechaInicio)} al ${escapeHtml(ranking.fechaFin)})
            </td>
            <td colspan="2" style="background-color:#F5F1E9; color:#2E190E; font-weight:bold; text-align:center; padding:7px; border:1px solid #D6CFC2;">
              TOTAL UNIDADES: ${ranking.totalPorciones}
            </td>
            <td colspan="2" style="background-color:#ECFDF5; color:#065F46; font-weight:bold; text-align:right; padding:7px; border:1px solid #6EE7B7;">
              TOTAL FACTURADO: $${Math.round(ranking.totalFacturado).toLocaleString('es-AR')}
            </td>
          </tr>
          <tr>
            <td colspan="7" style="background-color:#FAF8F5; color:#78716C; font-size:9pt; padding:5px 8px; border:1px solid #E7E5E4;">
              Reporte emitido el ${escapeHtml(fechaEmision)} hs • Separado en bloques con color: Entrantes, Pastas, Carnes, Pescados, Comidas Criollas, Postres y Bebidas.
            </td>
          </tr>

          <tr><td colspan="7" style="height:12px; border:none;"></td></tr>

          <!-- CUADRO RESUMEN EJECUTIVO POR RUBRO -->
          <tr>
            <td colspan="7" style="background-color:#44403C; color:#FFFFFF; font-size:11pt; font-weight:bold; padding:7px 10px; border:1px solid #44403C;">
              RESUMEN GENERAL POR CATEGORÍA
            </td>
          </tr>
          <tr>
            <td colspan="2" style="background-color:#E7E5E4; color:#1C1917; font-weight:bold; padding:6px; border:1px solid #A8A29E;">CATEGORÍA / BLOQUE</td>
            <td style="background-color:#E7E5E4; color:#1C1917; font-weight:bold; text-align:center; padding:6px; border:1px solid #A8A29E;">VARIEDADES</td>
            <td style="background-color:#E7E5E4; color:#1C1917; font-weight:bold; text-align:center; padding:6px; border:1px solid #A8A29E;">CANT. VENDIDA</td>
            <td style="background-color:#E7E5E4; color:#1C1917; font-weight:bold; text-align:center; padding:6px; border:1px solid #A8A29E;">% DEL TOTAL</td>
            <td colspan="2" style="background-color:#E7E5E4; color:#1C1917; font-weight:bold; text-align:right; padding:6px; border:1px solid #A8A29E;">SUBTOTAL ($)</td>
          </tr>
          ${summaryRowsHtml}

          <!-- BLOQUES DETALLADOS CON COLOR EN LA MISMA HOJA -->
          ${categoryBlocksHtml}

          <tr><td colspan="7" style="height:16px; border:none;"></td></tr>

          <!-- TOTAL GENERAL FINAL -->
          <tr>
            <td colspan="3" style="background-color:#1C1917; color:#FFFFFF; font-size:12pt; font-weight:bold; text-align:right; padding:10px; border:2px solid #1C1917;">
              TOTAL GENERAL (PLATOS + BEBIDAS):
            </td>
            <td style="background-color:#1C1917; color:#FBBF24; font-size:12pt; font-weight:bold; text-align:center; padding:10px; border:2px solid #1C1917;">
              ${ranking.totalPorciones}
            </td>
            <td style="background-color:#1C1917; color:#FFFFFF; font-weight:bold; text-align:center; padding:10px; border:2px solid #1C1917;">
              100%
            </td>
            <td style="background-color:#1C1917; color:#FFFFFF; padding:10px; border:2px solid #1C1917;"></td>
            <td style="background-color:#1C1917; color:#34D399; font-size:12pt; font-weight:bold; text-align:right; padding:10px; border:2px solid #1C1917;">
              $${Math.round(ranking.totalFacturado).toLocaleString('es-AR')}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', excelHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDate = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Recuento_Platos_y_Bebidas_${ranking.periodo}_${safeDate}.xls`;
    document.body.appendChild(link);
    link.click();
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
};

