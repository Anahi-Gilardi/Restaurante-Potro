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

// Candidate wines list from user's request
const targetWines = [
  {
    id_producto: 'prod_vin_escorihuela_gascon_chardonnay',
    nombre: 'Escorihuela Gascón Chardonnay (Botella)',
    descripcion: 'Bodega Escorihuela Gascón. Línea Escorihuela Gascón. Chardonnay elegante y frutado.',
    precio_venta: 11500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_escorihuela_gascon_sauvignon_blanc',
    nombre: 'Escorihuela Gascón Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Escorihuela Gascón. Línea Escorihuela Gascón. Sauvignon Blanc fresco y cítrico.',
    precio_venta: 11500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_saint_felicien_chardonnay',
    nombre: 'Saint Felicien Chardonnay (Botella)',
    descripcion: 'Bodega Catena Zapata. Línea Saint Felicien. Chardonnay aromático con crianza en roble.',
    precio_venta: 16500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_saint_felicien_sauvignon_blanc',
    nombre: 'Saint Felicien Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Catena Zapata. Línea Saint Felicien. Sauvignon Blanc con notas herbales y frescas.',
    precio_venta: 16500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_angelica_zapata_chardonnay',
    nombre: 'Angélica Zapata Chardonnay (Botella)',
    descripcion: 'Bodega Catena Zapata. Línea Angélica Zapata. Chardonnay de alta gama con gran estructura.',
    precio_venta: 32000,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_luca_chardonnay',
    nombre: 'Luca Chardonnay (Botella)',
    descripcion: 'Bodega Catena Zapata. Línea Luca. Exquisito varietal Chardonnay elaborado por Laura Catena.',
    precio_venta: 24500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_sauvignon_blanc',
    nombre: 'Las Perdices Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Las Perdices. Notas cítricas y de ruda.',
    precio_venta: 9500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_torrontes',
    nombre: 'Las Perdices Torrontes (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Las Perdices. Muy aromático y floral.',
    precio_venta: 9500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_torrontes_dulce',
    nombre: 'Las Perdices Torrontes Dulce (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Las Perdices. Dulce natural con notas amables.',
    precio_venta: 9900,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_reserva_chardonnay',
    nombre: 'Las Perdices Reserva Chardonnay (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Las Perdices Reserva. Untuoso con notas a vainilla.',
    precio_venta: 13500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_reserva_sauvignon_blanc',
    nombre: 'Las Perdices Reserva Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Las Perdices Reserva. Sauvignon Blanc refinado y complejo.',
    precio_venta: 13500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_exploracion_albarino',
    nombre: 'Las Perdices Exploración Albariño (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Exploración. Albariño fresco con acidez vibrante.',
    precio_venta: 17500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_exploracion_riesling',
    nombre: 'Las Perdices Exploración Riesling (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Exploración. Riesling con sutiles notas minerales.',
    precio_venta: 17500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_las_perdices_exploracion_gewurztraminer',
    nombre: 'Las Perdices Exploración Gewurztraminer (Botella)',
    descripcion: 'Bodega Las Perdices. Línea Exploración. Gewürztraminer de aromas florales intensos.',
    precio_venta: 18500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_portillo_sauvignon_blanc',
    nombre: 'Portillo Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Salentein. Línea Portillo. Joven, fresco y expresivo.',
    precio_venta: 7200,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_reserva_chardonnay',
    nombre: 'Salentein Reserva Chardonnay (Botella)',
    descripcion: 'Bodega Salentein. Línea Salentein Reserva. Chardonnay elegante con notas frutales.',
    precio_venta: 13900,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_reserva_sauvignon_blanc',
    nombre: 'Salentein Reserva Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Salentein. Línea Salentein Reserva. Sauvignon Blanc equilibrado y persistente.',
    precio_venta: 13900,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_pyros_sauvignon_blanc',
    nombre: 'Pyros Sauvignon Blanc (Botella)',
    descripcion: 'Bodega Salentein. Línea Pyros. Sauvignon Blanc originario del Valle de Pedernal.',
    precio_venta: 19500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_trumpeter_chardonnay',
    nombre: 'Trumpeter Chardonnay (Botella)',
    descripcion: 'Bodega La Rural. Línea Trumpeter. Suave con notas a manzana verde y miel.',
    precio_venta: 12500,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_trumpeter_dulce',
    nombre: 'Trumpeter Dulce (Botella)',
    descripcion: 'Bodega La Rural. Línea Trumpeter. Dulce natural delicado y refinado.',
    precio_venta: 12900,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  }
];

async function run() {
  console.log('Connecting to Supabase:', rawUrl);

  try {
    // 1. Fetch existing products from Supabase
    const { data: existingProducts, error: fetchError } = await supabase
      .from('productos_menu')
      .select('*');

    if (fetchError) {
      throw new Error(`Failed to fetch productos_menu: ${fetchError.message}`);
    }

    console.log(`Found ${existingProducts.length} existing products in Supabase.`);

    // Map existing products by ID and lowercased name for reliable comparison
    const existingIds = new Set(existingProducts.map(p => p.id_producto));
    const existingNames = new Set(existingProducts.map(p => p.nombre.toLowerCase().trim()));

    // 2. Identify missing wines
    const missingWines = targetWines.filter(wine => {
      const isMissingId = !existingIds.has(wine.id_producto);
      const isMissingName = !existingNames.has(wine.nombre.toLowerCase().trim());
      return isMissingId && isMissingName;
    });

    console.log(`Wines to add: ${missingWines.length} of ${targetWines.length}`);

    if (missingWines.length === 0) {
      console.log('All target wines are already present in Supabase. Nothing to add!');
      return;
    }

    // 3. Inspect the actual columns of the table
    const sampleRow = existingProducts[0] || {};
    const tableColumns = new Set(Object.keys(sampleRow));
    console.log('Table columns in Supabase:', Array.from(tableColumns));

    // Construct clean payloads containing only columns present in the Supabase table
    const insertPayload = missingWines.map(wine => {
      const cleanWine: any = {};
      Object.keys(wine).forEach(key => {
        if (tableColumns.has(key)) {
          cleanWine[key] = (wine as any)[key];
        }
      });
      // Fallbacks / required fields if missing
      cleanWine.id_producto = wine.id_producto;
      cleanWine.nombre = wine.nombre;
      cleanWine.precio_venta = wine.precio_venta;
      cleanWine.categoria = wine.categoria;
      cleanWine.activo = wine.activo;
      return cleanWine;
    });

    console.log('Inserting payload size:', insertPayload.length);

    // 4. Insert missing wines into Supabase
    const { error: insertError } = await supabase
      .from('productos_menu')
      .insert(insertPayload);

    if (insertError) {
      throw new Error(`Failed to insert wines: ${insertError.message}`);
    }

    console.log(`Successfully added ${missingWines.length} missing wines to Supabase!`);
    missingWines.forEach(w => console.log(` - ${w.nombre} (${w.id_producto})`));

  } catch (err: any) {
    console.error('CRITICAL ERROR:', err.message || err);
    process.exit(1);
  }
}

run();
