import assert from 'node:assert/strict';
import test from 'node:test';
import { getRestaurantCoverTheme } from './RestaurantCover';

test('getRestaurantCoverTheme devuelve configuraciones correctas para parrilla', () => {
  const theme = getRestaurantCoverTheme('parrilla');
  assert.equal(theme.accentColor, '#B45309');
  assert.equal(theme.hoverAccentColor, '#D97706');
  assert.equal(theme.heroTitleStart, 'EL PATRÓN');
  assert.equal(theme.specSubtitle, 'Nuestra Carta');
  assert.equal(theme.specTitle, 'Especialidades de El Patrón');
});

test('getRestaurantCoverTheme devuelve configuraciones correctas para pizzeria', () => {
  const theme = getRestaurantCoverTheme('pizzeria');
  assert.equal(theme.accentColor, '#9B2226');
  assert.equal(theme.hoverAccentColor, '#B22226');
  assert.equal(theme.heroTitleStart, 'Pizzas de Masa Madre');
  assert.equal(theme.specSubtitle, 'El Horno de Barro');
  assert.equal(theme.specTitle, 'Pizzas & Empanadas');
});
