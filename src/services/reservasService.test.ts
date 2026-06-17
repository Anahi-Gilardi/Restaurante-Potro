import assert from 'node:assert/strict';
import test from 'node:test';
import { __reservasServiceTestables } from './reservasService';

const { mapRowToReserva, normalizarFecha, toDbPayload } = __reservasServiceTestables;

test('toDbPayload limpia id_mesa cuando una reserva pasa a lista de espera', () => {
  const payload = toDbPayload({
    lista_espera: true,
    nombre_mesa: 'En espera',
  });

  assert.equal(payload.id_mesa, null);
  assert.equal(payload.lista_espera, true);
});

test('mapRowToReserva normaliza valores inseguros de Supabase', () => {
  const reserva = mapRowToReserva({
    id_reserva: 'res_1',
    cliente: 'Sofia',
    telefono: 123,
    personas: '4',
    id_mesa: '7',
    hora: '9:30',
    fecha: '17/06/2026',
    estado: 'estado_invalido',
    lista_espera: false,
  });

  assert.equal(reserva.nombre_cliente, 'Sofia');
  assert.equal(reserva.telefono, '');
  assert.equal(reserva.pax, 4);
  assert.equal(reserva.id_mesa, 7);
  assert.equal(reserva.hora, '09:30 hs');
  assert.equal(reserva.fecha, '2026-06-17');
  assert.equal(reserva.estado, 'confirmada');
  assert.equal(reserva.prioridad_espera, undefined);
});

test('normalizarFecha acepta fechas ISO y formato argentino', () => {
  assert.equal(normalizarFecha('2026-06-17'), '2026-06-17');
  assert.equal(normalizarFecha('05/07/2026'), '2026-07-05');
});
