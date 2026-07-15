export interface RestaurantProfile {
  nombreComercial: string;
  razonSocial: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  ingresosBrutos: string;
  inicioActividades: string;
  condicionIva: string;
  mensajePie: string;
  moneda: string;
}

/** Datos públicos del emisor que deben coincidir con la configuración fiscal de ARCA. */
export const DEFAULT_RESTAURANT_PROFILE: RestaurantProfile = {
  nombreComercial: 'El Patrón Restaurante',
  razonSocial: 'BELLA ORIANA',
  cuit: '27-42694613-6',
  direccion: 'Fotheringham 33, CP 5800, Río Cuarto, Córdoba',
  telefono: '+54 9 3584 37-3711',
  email: 'bellaoriana47@gmail.com',
  ingresosBrutos: '289734805',
  inicioActividades: '01/06/2026',
  condicionIva: 'Monotributo',
  mensajePie: 'Gracias por su visita al verdadero rincón criollo.',
  moneda: 'ARS',
};

const LEGACY_CUIT = '30716492514';

const cleanCuit = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

export const isLegacyRestaurantProfile = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return cleanCuit(candidate.cuit) === LEGACY_CUIT
    || String(candidate.razonSocial ?? '').toLowerCase().includes('gastronomía el patrón s.a.s')
    || String(candidate.razonSocial ?? '').toLowerCase().includes('gastronomia el patron s.a.s');
};

/**
 * Conserva personalizaciones operativas válidas y corrige automáticamente el
 * perfil fiscal de demostración que versiones anteriores guardaron en el navegador.
 */
export const normalizeRestaurantProfile = (value: unknown): RestaurantProfile => {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RESTAURANT_PROFILE };
  const candidate = value as Partial<RestaurantProfile>;
  const merged = { ...DEFAULT_RESTAURANT_PROFILE, ...candidate };
  if (!isLegacyRestaurantProfile(candidate)) return merged;
  return {
    ...merged,
    razonSocial: DEFAULT_RESTAURANT_PROFILE.razonSocial,
    cuit: DEFAULT_RESTAURANT_PROFILE.cuit,
    direccion: DEFAULT_RESTAURANT_PROFILE.direccion,
    ingresosBrutos: DEFAULT_RESTAURANT_PROFILE.ingresosBrutos,
    inicioActividades: DEFAULT_RESTAURANT_PROFILE.inicioActividades,
    condicionIva: DEFAULT_RESTAURANT_PROFILE.condicionIva,
  };
};
