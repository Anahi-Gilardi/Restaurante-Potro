import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_INSUMOS,
  INITIAL_MESAS,
  INITIAL_PRODUCTOS_MENU,
  INITIAL_RECETAS_ESCANDALLO
} from '../src/data/initialData';

type SecretMap = Record<string, string>;

const repoRoot = process.cwd();
const secretsPath = path.join(repoRoot, '.streamlit', 'secrets.toml');

function readStreamlitSecrets(): SecretMap {
  if (!fs.existsSync(secretsPath)) return {};

  const content = fs.readFileSync(secretsPath, 'utf8');
  const secrets: SecretMap = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["'](.+)["']\s*$/);
    if (match) {
      secrets[match[1]] = match[2];
    }
  }

  return secrets;
}

function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

async function upsertTable<T extends object>(
  tableName: string,
  rows: T[],
  onConflict: string
) {
  if (!rows.length) return 0;

  const { error } = await supabase
    .from(tableName)
    .upsert(rows as any[], { onConflict });

  if (error) {
    throw new Error(`${tableName}: ${error.message}`);
  }

  return rows.length;
}

async function countTable(tableName: string) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`${tableName}: ${error.message}`);
  }

  return count || 0;
}

const secrets = readStreamlitSecrets();
const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  secrets.SUPABASE_URL ||
  secrets.VITE_SUPABASE_URL ||
  '';

const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  secrets.SUPABASE_ANON_KEY ||
  secrets.VITE_SUPABASE_ANON_KEY ||
  '';

if (!rawUrl || !anonKey) {
  throw new Error('Falta SUPABASE_URL o SUPABASE_ANON_KEY. Configuralos en .streamlit/secrets.toml o variables de entorno.');
}

const supabase = createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const productos = INITIAL_PRODUCTOS_MENU.map(producto => {
  const { subcategoria, ...rest } = producto;
  return {
    ...rest,
    imagen: producto.imagen || null
  };
});

const recetas = INITIAL_RECETAS_ESCANDALLO.map(receta => {
  const { merma_estimada_porcentaje, ...rest } = receta;
  return {
    ...rest,
    unidad_medida: receta.unidad_medida || null
  };
});

const OLD_PRODUCT_IDS = [
  'prod_ent_burrata', 'prod_ent_mollejas', 'prod_ent_provoleta',
  'prod_pas_sorrentinos_cordero', 'prod_pas_ravioles_calabaza', 'prod_pas_gnocchis',
  'prod_car_bife_madurado', 'prod_car_costillar', 'prod_car_entrana', 'prod_car_matambrito',
  'prod_pes_abadejo', 'prod_pes_cazuela', 'prod_pes_merluza',
  'prod_cri_milanesa', 'prod_cri_hamburguesa', 'prod_cri_pastel_papa',
  'prod_pos_volcan', 'prod_pos_peras', 'prod_pos_panqueque'
];

console.log('Iniciando carga de datos base en Supabase...');

console.log('Eliminando platos antiguos obsoletos...');
const { error: deleteRecetasError } = await supabase
  .from('recetas_escandallo')
  .delete()
  .in('id_producto', OLD_PRODUCT_IDS);

if (deleteRecetasError) {
  console.warn('Advertencia al eliminar recetas antiguas:', deleteRecetasError.message);
}

const { error: deleteProductsError } = await supabase
  .from('productos_menu')
  .delete()
  .in('id_producto', OLD_PRODUCT_IDS);

if (deleteProductsError) {
  console.warn('Advertencia al eliminar productos antiguos:', deleteProductsError.message);
}

const mesasMapped = INITIAL_MESAS.map(m => ({
  id_mesa: m.id_mesa,
  numero_mesa: m.numero_mesa,
  estado: m.estado,
  comensales_actuales: m.comensales || null,
  capacidad: m.capacidad || 4,
  zona: m.zona || 'salon',
  x: m.x ?? null,
  y: m.y ?? null,
  width: m.width ?? null,
  height: m.height ?? null,
  rx: m.rx ?? 6,
  mesas_unidas: m.mesas_unidas || [],
}));

const summary = {
  mesas: await upsertTable('mesas', mesasMapped, 'id_mesa'),
  insumos: await upsertTable('insumos', INITIAL_INSUMOS, 'id_insumo'),
  productos_menu: await upsertTable('productos_menu', productos, 'id_producto'),
  recetas_escandallo: await upsertTable('recetas_escandallo', recetas, 'id_receta')
};

const counts = {
  mesas: await countTable('mesas'),
  insumos: await countTable('insumos'),
  productos_menu: await countTable('productos_menu'),
  recetas_escandallo: await countTable('recetas_escandallo')
};

console.log('Carga completada.');
console.table(summary);
console.log('Totales actuales en Supabase:');
console.table(counts);
