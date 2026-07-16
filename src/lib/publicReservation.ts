export interface PublicReservationRequest {
  nombre: string;
  telefono: string;
  personas: string;
  fecha: string;
  hora: string;
}

export const normalizeReservationPhone = (value: string): string => value.replace(/\D/g, '');

export const validatePublicReservation = (
  request: PublicReservationRequest,
  todayIso: string,
): string | null => {
  const name = request.nombre.trim();
  const phone = normalizeReservationPhone(request.telefono);
  const people = Number.parseInt(request.personas, 10);
  if (name.length < 2 || name.length > 120) return 'Ingrese un nombre válido.';
  if (phone.length < 8 || phone.length > 15) return 'Ingrese un teléfono válido con código de área.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.fecha)) return 'Seleccione una fecha válida.';
  if (request.fecha < todayIso) return 'La fecha de la reserva no puede estar en el pasado.';
  if (!Number.isInteger(people) || people < 1 || people > 20) return 'Seleccione una cantidad válida de comensales.';
  if (!/^\d{2}:\d{2}$/.test(request.hora)) return 'Seleccione un horario válido.';
  return null;
};

export const buildReservationWhatsAppUrl = (
  request: PublicReservationRequest,
  restaurantPhone: string,
): string => {
  const [year, month, day] = request.fecha.split('-');
  const formattedDate = year && month && day ? `${day}/${month}/${year}` : request.fecha;
  const people = Number.parseInt(request.personas, 10);
  const text = `*SOLICITUD DE RESERVA - EL PATRÓN*\n\n`
    + `Hola! Me gustaría solicitar una mesa para reservar:\n\n`
    + `• *Nombre:* ${request.nombre.trim()}\n`
    + `• *Teléfono:* ${request.telefono.trim()}\n`
    + `• *Comensales:* ${request.personas} ${people === 1 ? 'persona' : 'personas'}\n`
    + `• *Fecha:* ${formattedDate}\n`
    + `• *Hora:* ${request.hora} hs\n\n`
    + `¡Muchas gracias!`;
  return `https://wa.me/${normalizeReservationPhone(restaurantPhone)}?text=${encodeURIComponent(text)}`;
};
