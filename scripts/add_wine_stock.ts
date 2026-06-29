import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const secrets = readStreamlitSecrets();
const rawUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  secrets.SUPABASE_URL ||
  secrets.VITE_SUPABASE_URL ||
  'https://sqczmyaoqplrmrgyczjy.supabase.co';

const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  secrets.SUPABASE_ANON_KEY ||
  secrets.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxY3pteWFvcXBscm1yZ3ljemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNzQ5NzQsImV4cCI6MjA5Njg1MDk3NH0.R5bPwot9KCMJ9OXWcokL705ZD7_0ujH9fGY_GcqxjYY';

const supabase = createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// The insumos representing the 11 added wines
const targetInsumoIds = [
  'ins_vin_las_perdices_sauvignon_blanc',
  'ins_vin_las_perdices_torrontes',
  'ins_vin_las_perdices_torrontes_dulce',
  'ins_vin_las_perdices_reserva_chardonnay',
  'ins_vin_las_perdices_reserva_sauvignon_blanc',
  'ins_vin_las_perdices_exploracion_albarino',
  'ins_vin_las_perdices_exploracion_riesling',
  'ins_vin_las_perdices_exploracion_gewurztraminer',
  'ins_vin_salentein_reserva_chardonnay',
  'ins_vin_salentein_reserva_sauvignon_blanc',
  'ins_vin_trumpeter_doux' // Insumo representing Trumpeter Dulce
];

async function run() {
  console.log('Connecting to Supabase:', rawUrl);

  try {
    // 1. Fetch current stock of these insumos from Supabase
    const { data: insumos, error: fetchError } = await supabase
      .from('insumos')
      .select('id_insumo, nombre, stock_actual')
      .in('id_insumo', targetInsumoIds);

    if (fetchError) {
      throw new Error(`Failed to fetch insumos: ${fetchError.message}`);
    }

    console.log(`Found ${insumos.length} matching insumos in Supabase out of ${targetInsumoIds.length}.`);

    if (insumos.length === 0) {
      console.log('No matching insumos found in database to update!');
      return;
    }

    // 2. Perform updates
    for (const insumo of insumos) {
      const currentStock = Number(insumo.stock_actual) || 0;
      const newStock = currentStock + 12;

      console.log(`Updating ${insumo.nombre} (${insumo.id_insumo}): ${currentStock} -> ${newStock}`);

      const { error: updateError } = await supabase
        .from('insumos')
        .update({ stock_actual: newStock })
        .eq('id_insumo', insumo.id_insumo);

      if (updateError) {
        console.error(`Error updating ${insumo.id_insumo}:`, updateError.message);
      }
    }

    console.log('Successfully completed Supabase stock updates!');

  } catch (err: any) {
    console.error('CRITICAL ERROR:', err.message || err);
    process.exit(1);
  }
}

run();
