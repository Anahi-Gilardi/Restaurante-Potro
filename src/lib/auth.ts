import type { Usuario } from '../types';

const normalizeIdentifier = (value: string) => (
  value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

export const resolveLocalLoginUser = (
  identifier: string,
  demoUser: string,
  usuarios: Usuario[]
): Usuario | null => {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return null;

  const activeUsers = usuarios.filter(usuario => usuario.activo !== false);

  if (normalizedIdentifier === normalizeIdentifier(demoUser)) {
    return activeUsers.find(usuario => usuario.rol === 'administrador')
      || activeUsers[0]
      || null;
  }

  return activeUsers.find(usuario => {
    const shortName = normalizeIdentifier(usuario.nombre);
    const fullName = normalizeIdentifier(`${usuario.nombre} ${usuario.apellido}`);
    return normalizedIdentifier === shortName || normalizedIdentifier === fullName;
  }) || null;
};
