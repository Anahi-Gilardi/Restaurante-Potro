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
  console.log('Testing update of costo_unitario on a dummy insumo...');

  const dummy = {
    id_insumo: 'ins_test_cost_update',
    nombre: 'Dummy Insumo for Cost Update',
    stock_actual: 10,
    stock_minimo: 2,
    unidad_medida: 'unidades',
    categoria: 'bodega',
    subcategoria: 'Vinos blancos',
    proveedor: 'Test',
    costo_unitario: 100, // Initial cost
    es_bebida_directa: true
  };

  console.log('Inserting dummy insumo...');
  const { error: insertError } = await supabase.from('insumos').insert([dummy]);
  if (insertError) {
    console.error('Insert failed:', insertError);
    return;
  }
  console.log('Insert succeeded.');

  console.log('Updating costo_unitario to 120...');
  const { error: updateError } = await supabase
    .from('insumos')
    .update({ costo_unitario: 120 })
    .eq('id_insumo', 'ins_test_cost_update');

  if (updateError) {
    console.error('Update failed with error:', updateError);
  } else {
    console.log('Update succeeded!');
  }

  // Cleanup
  console.log('Cleaning up...');
  await supabase.from('insumos').delete().eq('id_insumo', 'ins_test_cost_update');
}

run().catch(console.error);
