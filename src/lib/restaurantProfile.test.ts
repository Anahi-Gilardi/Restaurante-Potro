import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_RESTAURANT_PROFILE,
  isLegacyRestaurantProfile,
  normalizeRestaurantProfile,
} from './restaurantProfile';

test('migra el perfil fiscal de demostración guardado por versiones anteriores', () => {
  const migrated = normalizeRestaurantProfile({
    nombreComercial: 'Mi nombre personalizado',
    razonSocial: 'Gastronomía El Patrón S.A.S.',
    cuit: '30-71649251-4',
    condicionIva: 'Responsable Inscripto',
    telefono: '1234',
  });

  assert.equal(isLegacyRestaurantProfile(migrated), false);
  assert.equal(migrated.razonSocial, 'BELLA ORIANA');
  assert.equal(migrated.cuit, '27-42694613-6');
  assert.equal(migrated.condicionIva, 'Monotributo');
  assert.equal(migrated.nombreComercial, 'Mi nombre personalizado');
  assert.equal(migrated.telefono, '1234');
});

test('conserva un perfil vigente personalizado y completa campos faltantes', () => {
  const normalized = normalizeRestaurantProfile({
    ...DEFAULT_RESTAURANT_PROFILE,
    nombreComercial: 'El Patrón Centro',
  });

  assert.equal(normalized.nombreComercial, 'El Patrón Centro');
  assert.equal(normalized.ingresosBrutos, '289734805');
});
