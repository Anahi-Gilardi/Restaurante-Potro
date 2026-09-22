import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { uniteTablesInList, getIndividualPhysicalTables } from './tableUnions';
import { INITIAL_MESAS } from '../data/initialData';

test('getIndividualPhysicalTables desacopla cualquier mesa unida activa en el salón', () => {
  // Simulamos mesas 1 y 2 unidas en el salón para el almuerzo
  const mesasSalon = uniteTablesInList(INITIAL_MESAS[0], INITIAL_MESAS[1], INITIAL_MESAS);
  
  // En el salón, la mesa 1 está unida con la 2
  assert.equal(mesasSalon[0].numero_mesa, 'Mesa 1 y 2 (Unidas)');
  assert.equal(mesasSalon[0].capacidad, 4);
  assert.equal(mesasSalon[1].estado, 'unida');
  assert.equal(mesasSalon[1].parent_id, 1);

  // Al pasar al módulo de reservas, se obtienen las mesas físicas individuales por su número
  const mesasReservas = getIndividualPhysicalTables(mesasSalon);

  assert.equal(mesasReservas.length, INITIAL_MESAS.length);
  assert.equal(mesasReservas[0].id_mesa, 1);
  assert.equal(mesasReservas[0].numero_mesa, 'Mesa 1');
  assert.equal(mesasReservas[0].capacidad, 2);
  assert.equal(mesasReservas[0].mesas_unidas?.length ?? 0, 0);
  assert.equal(mesasReservas[0].parent_id, null);

  assert.equal(mesasReservas[1].id_mesa, 2);
  assert.equal(mesasReservas[1].numero_mesa, 'Mesa 2');
  assert.equal(mesasReservas[1].capacidad, 2);
  assert.equal(mesasReservas[1].estado, 'libre');
  assert.equal(mesasReservas[1].parent_id, null);
});

test('ReservasModule utiliza siempre mesas físicas individuales desacopladas de las uniones del salón', () => {
  const reservasSource = readFileSync(resolve('src/components/ReservasModule.tsx'), 'utf8');

  // Importa y utiliza getIndividualPhysicalTables
  assert.match(reservasSource, /getIndividualPhysicalTables/);
  assert.match(reservasSource, /const physicalMesas = useMemo\(\(\) => getIndividualPhysicalTables\(mesas\), \[mesas\]\);/);

  // No filtra mesas por 'ocupada' en el salón en mesasDisponiblesEnFechaHora
  assert.doesNotMatch(reservasSource, /m\.estado === 'ocupada'/);

  // La disponibilidad hoy y los badges usan physicalMesas
  assert.match(reservasSource, /physicalMesas\.filter/);
  assert.match(reservasSource, /physicalMesas\.map/);
});

test('App handleReservaEstadoChange no altera el salón hoy si la reserva es para otra fecha futura', () => {
  const appSource = readFileSync(resolve('src/App.tsx'), 'utf8');
  assert.match(appSource, /const isToday = reserva\.fecha === todayStr;/);
  assert.match(appSource, /if \(!isToday && estado !== 'sentada'\)/);
});
