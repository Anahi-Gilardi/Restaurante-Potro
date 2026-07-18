import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const readSource = (path: string) => readFileSync(resolve(path), 'utf8');

const promocionesModule = readSource('src/components/PromocionesModule.tsx');
const clientesService = readSource('src/services/clientesService.ts');
const cajaService = readSource('src/services/cajaService.ts');
const menuService = readSource('src/services/menuService.ts');
const facturacionModule = readSource('src/components/FacturacionModule.tsx');

test('Promociones muestra Supabase vacío sin inventar campañas', () => {
  assert.doesNotMatch(promocionesModule, /DEFAULT_PROMOS|p_1|Combo Ejecutivo El Patrón/);
  assert.match(promocionesModule, /setPromos\(data \|\| \[\]\)/);
  assert.match(promocionesModule, /No se mostrarán campañas ficticias/);
});

test('Clientes no crea personas ficticias en el cache local', () => {
  assert.doesNotMatch(clientesService, /DEFAULT_CLIENTES|Juan Carlos Perez|Maria Laura Rodriguez/);
  assert.match(clientesService, /if \(!raw\) return \[\]/);
  assert.match(clientesService, /removeLegacyDemoClientes/);
});

test('Caja no fabrica cierres históricos si Supabase y el respaldo fallan', () => {
  assert.doesNotMatch(cajaService, /Clara Scaglia|Mariano Closs/);
  assert.match(cajaService, /removeLegacyDemoCierres/);
  assert.match(cajaService, /const raw = safeStorage\.getItem\('el_patron_historial_cierres'\);[\s\S]*?return \[\];/);
});

test('Menú no sustituye una falla de Supabase por productos de demostración', () => {
  assert.match(menuService, /if \(client\) return \[\];[\s\S]*?Local\/Offline Mode seed/);
});

test('Facturación muestra un estado neutral mientras consulta ARCA', () => {
  assert.match(facturacionModule, /arcaStatus === null/);
  assert.match(facturacionModule, /Consultando la configuración fiscal segura del servidor/);
  assert.doesNotMatch(facturacionModule, /arcaStatus\?\.message \|\| 'Firma digital no configurada\.'/);
});
