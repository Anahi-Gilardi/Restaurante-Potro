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

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching current products, recipes, and insumos from Supabase...');
  
  const { data: products } = await supabase.from('productos_menu').select('*').eq('categoria', 'Bodega');
  const { data: recetas } = await supabase.from('recetas_escandallo').select('*');
  const { data: insumos } = await supabase.from('insumos').select('*');

  if (!products || !recetas || !insumos) {
    console.error('Failed to load database data.');
    return;
  }

  // Find products that don't have recipes
  const missingProducts = products.filter(p => !recetas.some(r => r.id_producto === p.id_producto));

  console.log(`Found ${missingProducts.length} new wines lacking recipes.`);

  const insumosToInsert: any[] = [];
  const insumosToUpdate: any[] = [];
  const recetasToInsert: any[] = [];

  for (const p of missingProducts) {
    const suffix = p.id_producto.replace('prod_vin_', '');
    const insumoId = `ins_vin_${suffix}`;
    const recetaId = `esc_vin_${suffix}`;

    // Clean up insumo name (remove '(Botella)' or similar)
    const insumoNombre = p.nombre.replace(/\s*\(Botella\)\s*/i, '').replace(/\s*750ml\s*/i, '') + ' Botella';

    // Calculate provider
    let proveedor = 'Proveedor Central';
    if (p.nombre.toLowerCase().includes('perdices')) {
      proveedor = 'Las Perdices S.A.';
    } else if (p.nombre.toLowerCase().includes('salentein')) {
      proveedor = 'Bodegas Salentein';
    } else if (p.nombre.toLowerCase().includes('trumpeter')) {
      proveedor = 'Rutini Wines';
    }

    const insumoData = {
      id_insumo: insumoId,
      nombre: insumoNombre,
      stock_actual: 12, // 12 units requested
      stock_minimo: 4,
      unidad_medida: 'unidades',
      categoria: 'bodega',
      subcategoria: p.subcategoria || 'Vinos blancos',
      proveedor: proveedor,
      costo_unitario: Math.round(p.precio_venta * 0.4), // 40% of retail price
      es_bebida_directa: true
    };

    const exists = insumos.some(i => i.id_insumo === insumoId);
    if (exists) {
      console.log(`Insumo already exists: ${insumoId}. Preparing stock update to 12.`);
      insumosToUpdate.push(insumoData);
    } else {
      console.log(`Insumo is missing: ${insumoId}. Preparing insert.`);
      insumosToInsert.push(insumoData);
    }

    // Prepare recipe
    recetasToInsert.push({
      id_receta: recetaId,
      id_producto: p.id_producto,
      id_insumo: insumoId,
      cantidad_a_descontar: 1,
      unidad_medida: 'unidades',
      merma_estimada_porcentaje: null
    });
  }

  // 1. Insert missing insumos
  if (insumosToInsert.length > 0) {
    console.log(`\nInserting ${insumosToInsert.length} missing insumos...`);
    const { error: insError } = await supabase.from('insumos').insert(insumosToInsert);
    if (insError) {
      console.error('Error inserting insumos:', insError);
      return;
    }
  }

  // 2. Update existing insumos to 12 stock
  if (insumosToUpdate.length > 0) {
    console.log(`\nUpdating stock of ${insumosToUpdate.length} existing insumos to 12...`);
    for (const ins of insumosToUpdate) {
      const { error: updError } = await supabase
        .from('insumos')
        .update({ stock_actual: 12 })
        .eq('id_insumo', ins.id_insumo);
      if (updError) {
        console.error(`Error updating stock for insumo ${ins.id_insumo}:`, updError);
        return;
      }
    }
    console.log('Stock updates completed successfully.');
  }

  // 3. Insert recipes
  if (recetasToInsert.length > 0) {
    console.log(`\nInserting ${recetasToInsert.length} recipes...`);
    const { error: recError } = await supabase.from('recetas_escandallo').insert(recetasToInsert);
    if (recError) {
      console.error('Error inserting recipes:', recError);
      return;
    }
    console.log('Recipes inserted successfully.');
  }

  console.log('\nProcessing completed successfully!');
}

run().catch(console.error);
