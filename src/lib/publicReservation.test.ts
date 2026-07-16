import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReservationWhatsAppUrl,
  normalizeReservationPhone,
  validatePublicReservation,
} from './publicReservation';

const validRequest = {
  nombre: 'Oriana Bella',
  telefono: '+54 9 358 400-0000',
  personas: '2',
  fecha: '2026-07-20',
  hora: '21:00',
};

test('valida telefono y bloquea reservas en el pasado', () => {
  assert.equal(normalizeReservationPhone(validRequest.telefono), '5493584000000');
  assert.equal(validatePublicReservation(validRequest, '2026-07-16'), null);
  assert.equal(validatePublicReservation({ ...validRequest, fecha: '2026-07-15' }, '2026-07-16'), 'La fecha de la reserva no puede estar en el pasado.');
  assert.equal(validatePublicReservation({ ...validRequest, telefono: 'abc' }, '2026-07-16'), 'Ingrese un teléfono válido con código de área.');
});

test('genera un enlace de WhatsApp con fecha argentina y texto codificado', () => {
  const url = buildReservationWhatsAppUrl(validRequest, '+54 9 3584 37-3711');
  assert.match(url, /^https:\/\/wa\.me\/5493584373711\?text=/);
  const message = decodeURIComponent(url.split('text=')[1]);
  assert.match(message, /20\/07\/2026/);
  assert.match(message, /Oriana Bella/);
});
