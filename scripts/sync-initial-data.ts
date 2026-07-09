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
  console.log('Fetching database data from Supabase...');
  const { data: dbProducts } = await supabase.from('productos_menu').select('*').eq('categoria', 'Bodega');
  const { data: dbRecetas } = await supabase.from('recetas_escandallo').select('*');
  const { data: dbInsumos } = await supabase.from('insumos').select('*');

  if (!dbProducts || !dbRecetas || !dbInsumos) {
    console.error('Failed to load database.');
    return;
  }

  // Load local file
  const initialDataPath = path.resolve(process.cwd(), 'src/data/initialData.ts');
  let fileText = fs.readFileSync(initialDataPath, 'utf8');

  // Load local arrays using dynamic import (compiled by tsx)
  const { INITIAL_PRODUCTOS_MENU, INITIAL_INSUMOS, INITIAL_RECETAS_ESCANDALLO } = await import('../src/data/initialData.js');

  const missingProducts = dbProducts.filter(p => !INITIAL_PRODUCTOS_MENU.some(ip => ip.id_producto === p.id_producto));

  if (missingProducts.length === 0) {
    console.log('All Supabase wines are already in initialData.ts!');
    return;
  }

  console.log(`Syncing ${missingProducts.length} missing wines to local initialData.ts...`);

  // 1. Build string for products
  let productsStr = '';
  missingProducts.forEach(p => {
    const entry: any = {
      id_producto: p.id_producto,
      nombre: p.nombre,
      precio_venta: p.precio_venta,
      categoria: p.categoria,
      activo: p.activo,
      imagen: p.imagen
    };
    if (p.subcategoria !== undefined && p.subcategoria !== null) entry.subcategoria = p.subcategoria;
    if (p.descripcion !== undefined && p.descripcion !== null) entry.descripcion = p.descripcion;
    if (p.tipo !== undefined && p.tipo !== null) entry.tipo = p.tipo;
    if (p.requiere_cocina !== undefined && p.requiere_cocina !== null) entry.requiere_cocina = p.requiere_cocina;
    if (p.tiempo_preparacion_estimado !== undefined && p.tiempo_preparacion_estimado !== null) {
      entry.tiempo_preparacion_estimado = p.tiempo_preparacion_estimado;
    }
    productsStr += `  ${JSON.stringify(entry, null, 4)},\n`;
  });

  // 2. Build string for insumos
  let insumosStr = '';
  const missingInsumos: any[] = [];
  missingProducts.forEach(p => {
    const suffix = p.id_producto.replace('prod_vin_', '');
    const insumoId = `ins_vin_${suffix}`;
    
    // Check if it already exists in local INITIAL_INSUMOS
    if (!INITIAL_INSUMOS.some(ii => ii.id_insumo === insumoId)) {
      const dbInsumo = dbInsumos.find(i => i.id_insumo === insumoId);
      if (dbInsumo) {
        missingInsumos.push(dbInsumo);
        insumosStr += `  ${JSON.stringify(dbInsumo, null, 4)},\n`;
      }
    }
  });

  // 3. Build string for recipes
  let recetasStr = '';
  const missingRecetas: any[] = [];
  missingProducts.forEach(p => {
    const suffix = p.id_producto.replace('prod_vin_', '');
    const recetaId = `esc_vin_${suffix}`;
    
    // Check if it already exists in local INITIAL_RECETAS_ESCANDALLO
    if (!INITIAL_RECETAS_ESCANDALLO.some(ir => ir.id_receta === recetaId)) {
      const dbReceta = dbRecetas.find(r => r.id_receta === recetaId);
      if (dbReceta) {
        const entry: any = {
          id_receta: dbReceta.id_receta,
          id_producto: dbReceta.id_producto,
          id_insumo: dbReceta.id_insumo,
          cantidad_a_descontar: dbReceta.cantidad_a_descontar
        };
        if (dbReceta.unidad_medida !== undefined && dbReceta.unidad_medida !== null) entry.unidad_medida = dbReceta.unidad_medida;
        if (dbReceta.rendimiento !== undefined && dbReceta.rendimiento !== null) entry.rendimiento = dbReceta.rendimiento;

        missingRecetas.push(entry);
        recetasStr += `  ${JSON.stringify(entry, null, 4)},\n`;
      }
    }
  });

  // Let's insert these strings into the fileText
  // For INITIAL_PRODUCTOS_MENU, find its declaration and then its closing ];
  const prodDecl = 'export const INITIAL_PRODUCTOS_MENU: ProductoMenu[] = [';
  const prodIndex = fileText.indexOf(prodDecl);
  if (prodIndex === -1) {
    console.error('Could not find INITIAL_PRODUCTOS_MENU declaration in file.');
    return;
  }
  // Find the next ]; after the declaration
  const prodClosingIndex = fileText.indexOf('];', prodIndex);
  if (prodClosingIndex === -1) {
    console.error('Could not find closing ]; for INITIAL_PRODUCTOS_MENU.');
    return;
  }

  // Check if we need a comma before inserting products
  const prodBefore = fileText.slice(0, prodClosingIndex).trim();
  const prodNeedsComma = prodBefore.endsWith('}') && !prodBefore.endsWith('},') && !prodBefore.endsWith(',');
  const finalProductsStr = prodNeedsComma ? `,\n${productsStr}` : productsStr;

  // Insert products
  fileText = fileText.slice(0, prodClosingIndex) + finalProductsStr + fileText.slice(prodClosingIndex);

  // Now, since file indices changed, let's search again for INITIAL_INSUMOS
  const insDecl = 'export const INITIAL_INSUMOS: Insumo[] = [';
  const insIndex = fileText.indexOf(insDecl);
  if (insIndex === -1) {
    console.error('Could not find INITIAL_INSUMOS declaration in file.');
    return;
  }
  const insClosingIndex = fileText.indexOf('];', insIndex);
  if (insClosingIndex === -1) {
    console.error('Could not find closing ]; for INITIAL_INSUMOS.');
    return;
  }

  // Check if we need a comma before inserting insumos
  const insBefore = fileText.slice(0, insClosingIndex).trim();
  const insNeedsComma = insBefore.endsWith('}') && !insBefore.endsWith('},') && !insBefore.endsWith(',');
  const finalInsumosStr = insNeedsComma ? `,\n${insumosStr}` : insumosStr;

  // Insert insumos
  fileText = fileText.slice(0, insClosingIndex) + finalInsumosStr + fileText.slice(insClosingIndex);

  // Now search for INITIAL_RECETAS_ESCANDALLO
  const recDecl = 'export const INITIAL_RECETAS_ESCANDALLO: RecetaEscandallo[] = [';
  const recIndex = fileText.indexOf(recDecl);
  if (recIndex === -1) {
    console.error('Could not find INITIAL_RECETAS_ESCANDALLO declaration in file.');
    return;
  }
  const recClosingIndex = fileText.indexOf('];', recIndex);
  if (recClosingIndex === -1) {
    console.error('Could not find closing ]; for INITIAL_RECETAS_ESCANDALLO.');
    return;
  }

  // Check if we need a comma before inserting recipes
  const recBefore = fileText.slice(0, recClosingIndex).trim();
  const recNeedsComma = recBefore.endsWith('}') && !recBefore.endsWith('},') && !recBefore.endsWith(',');
  const finalRecetasStr = recNeedsComma ? `,\n${recetasStr}` : recetasStr;

  // Insert recipes
  fileText = fileText.slice(0, recClosingIndex) + finalRecetasStr + fileText.slice(recClosingIndex);

  // Write file back
  fs.writeFileSync(initialDataPath, fileText, 'utf8');
  console.log(`Successfully synchronized initialData.ts:`);
  console.log(`  Added ${missingProducts.length} products`);
  console.log(`  Added ${missingInsumos.length} insumos`);
  console.log(`  Added ${missingRecetas.length} recipes`);
}

run().catch(console.error);
