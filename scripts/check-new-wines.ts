import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key. Check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching products, recipes, and insumos from Supabase...');
  
  const { data: dbProducts } = await supabase.from('productos_menu').select('*').eq('categoria', 'Bodega');
  const { data: dbRecetas } = await supabase.from('recetas_escandallo').select('*');
  const { data: dbInsumos } = await supabase.from('insumos').select('*');

  if (!dbProducts || !dbRecetas || !dbInsumos) {
    console.error('Failed to load database.');
    return;
  }

  // Import local data to check what is missing
  const { INITIAL_PRODUCTOS_MENU, INITIAL_INSUMOS, INITIAL_RECETAS_ESCANDALLO } = await import('../src/data/initialData.js');

  const missingProducts = dbProducts.filter(p => !INITIAL_PRODUCTOS_MENU.some(ip => ip.id_producto === p.id_producto));

  console.log(`\nFound ${missingProducts.length} products in Supabase that are missing locally in INITIAL_PRODUCTOS_MENU:\n`);

  if (missingProducts.length === 0) {
    console.log('No missing products in local initialData.ts!');
    return;
  }

  // 1. Generate ProductoMenu[] entries
  console.log('// --- ADD TO INITIAL_PRODUCTOS_MENU ---');
  missingProducts.forEach(p => {
    const entry = {
      id_producto: p.id_producto,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      categoria: p.categoria,
      activo: p.activo,
      imagen: p.imagen,
      descripcion: p.descripcion,
      subcategoria: p.subcategoria,
      tipo: p.tipo,
      tiempo_preparacion_estimado: p.tiempo_preparacion_estimado,
      requiere_cocina: p.requiere_cocina,
      precio_original: p.precio_original,
      precio_final: p.precio_final,
      descuento_aplicado: p.descuento_aplicado
    };
    console.log(`  ${JSON.stringify(entry, null, 4)},`);
  });

  // 2. Generate Insumo[] entries
  console.log('\n// --- ADD TO INITIAL_INSUMOS ---');
  missingProducts.forEach(p => {
    const suffix = p.id_producto.replace('prod_vin_', '');
    const insumoId = `ins_vin_${suffix}`;
    const dbInsumo = dbInsumos.find(i => i.id_insumo === insumoId);
    if (dbInsumo) {
      console.log(`  ${JSON.stringify(dbInsumo, null, 4)},`);
    }
  });

  // 3. Generate RecetaEscandallo[] entries
  console.log('\n// --- ADD TO INITIAL_RECETAS_ESCANDALLO ---');
  missingProducts.forEach(p => {
    const suffix = p.id_producto.replace('prod_vin_', '');
    const recetaId = `esc_vin_${suffix}`;
    const dbReceta = dbRecetas.find(r => r.id_receta === recetaId);
    if (dbReceta) {
      console.log(`  ${JSON.stringify(dbReceta, null, 4)},`);
    }
  });
}

run().catch(console.error);
