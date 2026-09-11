import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReservationWhatsAppUrl,
  normalizeReservationPhone,
  normalizeWhatsAppPhone,
  validatePublicReservation,
  DEFAULT_RESERVATION_COMPANY_PHONE,
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

test('normalizeWhatsAppPhone formatea números locales y con prefijo para Argentina', () => {
  assert.equal(normalizeWhatsAppPhone('3584303541'), '5493584303541');
  assert.equal(normalizeWhatsAppPhone('+54 9 358 430-3541'), '5493584303541');
  assert.equal(normalizeWhatsAppPhone('5493584303541'), '5493584303541');
  assert.equal(normalizeWhatsAppPhone('+54 9 3584 37-3711'), '5493584373711');
});

test('genera un enlace de WhatsApp con fecha argentina y texto codificado', () => {
  const url = buildReservationWhatsAppUrl(validRequest, '+54 9 3584 37-3711');
  assert.match(url, /^https:\/\/wa\.me\/5493584373711\?text=/);
  const message = decodeURIComponent(url.split('text=')[1]);
  assert.match(message, /20\/07\/2026/);
  assert.match(message, /Oriana Bella/);
});

test('buildReservationWhatsAppUrl utiliza el número oficial 3584303541 y contiene todos los datos requeridos', () => {
  const request = {
    nombre: 'Carlos Gómez',
    telefono: '3584112233',
    personas: '4',
    fecha: '2026-09-15',
    hora: '21:30'
  };

  const url = buildReservationWhatsAppUrl(request, '3584303541');
  assert.match(url, /^https:\/\/wa\.me\/5493584303541\?text=/);

  const decoded = decodeURIComponent(url.split('text=')[1]);
  assert.match(decoded, /SOLICITUD DE RESERVA - RESTAURANTE EL PATRÓN/);
  assert.match(decoded, /Carlos Gómez/);
  assert.match(decoded, /3584112233/);
  assert.match(decoded, /4 personas/);
  assert.match(decoded, /15\/09\/2026/);
  assert.match(decoded, /21:30 hs/);
  assert.match(decoded, /tomar el pedido de la reserva/);
});

