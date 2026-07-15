import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const operationalSources = [
  'src/components/FacturacionModule.tsx',
  'src/features/caja/hooks/useCaja.ts',
  'src/features/salon/hooks/useMozoTerminal.ts',
  'src/services/clientesService.ts',
].map(path => readFileSync(resolve(path), 'utf8')).join('\n');

test('no reintroduce la identidad fiscal ficticia en comprobantes ni tickets', () => {
  assert.doesNotMatch(operationalSources, /30-71649251-4/);
  assert.doesNotMatch(operationalSources, /Gastronom[ií]a El Patr[oó]n S\.A\.S\./i);
  assert.doesNotMatch(operationalSources, /Figueroa Alcorta 3420/i);
});

test('no recomienda abrir tablas al rol anon de Supabase', () => {
  const source = readFileSync(resolve('src/components/SupabaseManager.tsx'), 'utf8');
  assert.doesNotMatch(source, /habilitar los permisos.+rol.+anon/i);
  assert.match(source, /Mantenga acceso denegado para el rol anon/i);
});

test('no inventa una secuencia fiscal inicial en la interfaz', () => {
  const source = readFileSync(resolve('src/components/FacturacionModule.tsx'), 'utf8');
  assert.doesNotMatch(source, /8320/);
  assert.match(source, /fiscalVoucherPreview/);
});
