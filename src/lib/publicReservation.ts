export interface PublicReservationRequest {
  nombre: string;
  telefono: string;
  personas: string;
  fecha: string;
  hora: string;
}

export const normalizeReservationPhone = (value: string): string => value.replace(/\D/g, '');

/**
 * Normaliza un número argentino para WhatsApp, asegurando el código de país 549
 * tanto si se ingresa como 3584303541, +54 9 358 430-3541 o 5493584303541.
 */
export const normalizeWhatsAppPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('549')) return digits;
  if (digits.startsWith('54') && digits.length >= 12) return `549${digits.slice(2)}`;
  if (digits.length === 10) return `549${digits}`;
  return digits;
};

export const validatePublicReservation = (
  request: PublicReservationRequest,
  todayIso: string,
): string | null => {
  const name = request.nombre.trim();
  const phone = normalizeReservationPhone(request.telefono);
  const people = Number.parseInt(request.personas, 10);
  if (name.length < 2 || name.length > 120) return 'Ingrese su nombre y apellido completo.';
  if (phone.length < 8 || phone.length > 15) return 'Ingrese un teléfono válido con código de área.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.fecha)) return 'Seleccione una fecha válida.';
  if (request.fecha < todayIso) return 'La fecha de la reserva no puede estar en el pasado.';
  if (!Number.isInteger(people) || people < 1 || people > 20) return 'Seleccione una cantidad válida de comensales.';
  if (!/^\d{2}:\d{2}$/.test(request.hora)) return 'Seleccione un horario válido.';
  return null;
};

export const DEFAULT_RESERVATION_COMPANY_PHONE = '5493584303541';

export const buildReservationWhatsAppUrl = (
  request: PublicReservationRequest,
  restaurantPhone: string = DEFAULT_RESERVATION_COMPANY_PHONE,
): string => {
  const [year, month, day] = request.fecha.split('-');
  const formattedDate = year && month && day ? `${day}/${month}/${year}` : request.fecha;
  const people = Number.parseInt(request.personas, 10);
  const peopleLabel = people === 1 ? '1 persona' : `${request.personas} personas`;

  const text = `*SOLICITUD DE RESERVA - RESTAURANTE EL PATRÓN* 🍷🥩\n\n`
    + `¡Hola! Quiero solicitar una reserva de mesa:\n\n`
    + `👤 *DATOS DEL CLIENTE:*\n`
    + `• *Nombre y Apellido:* ${request.nombre.trim()}\n`
    + `• *Número de Teléfono:* ${request.telefono.trim()}\n\n`
    + `🍽️ *DETALLE DE LA RESERVA:*\n`
    + `• *Cantidad de Comensales:* ${peopleLabel}\n`
    + `• *Fecha:* ${formattedDate}\n`
    + `• *Hora:* ${request.hora} hs\n\n`
    + `Quedo a la espera de la confirmación para tomar el pedido de la reserva. ¡Muchas gracias!`;

  return `https://wa.me/${normalizeWhatsAppPhone(restaurantPhone)}?text=${encodeURIComponent(text)}`;
};
