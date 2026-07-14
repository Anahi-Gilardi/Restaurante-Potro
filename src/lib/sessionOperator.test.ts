import assert from 'node:assert/strict';
import test from 'node:test';
import { Usuario } from '../types';
import { resolveSessionOperator } from './sessionOperator';

const users: Usuario[] = [
  { id_usuario: 1, nombre: 'Mozo', apellido: 'Turno', username: 'mozo', password: '', rol: 'mozo', activo: true },
  {
    id_usuario: 9,
    nombre: 'Admin',
    apellido: 'Principal',
    username: 'admin',
    password: '',
    auth_user_id: 'auth-admin',
    mail: 'admin@usuarios.elpatron.internal',
    rol: 'superadmin',
    activo: true,
  },
];

test('mantiene al administrador vinculado durante eventos de Supabase Auth', () => {
  const result = resolveSessionOperator(users, {
    id: 'auth-admin',
    email: 'admin@usuarios.elpatron.internal',
  }, 'Mozo');

  assert.equal(result?.nombre, 'Admin');
  assert.equal(result?.rol, 'superadmin');
});

test('una notificacion sin metadatos conserva el operador ya autenticado', () => {
  const result = resolveSessionOperator(users, { id: 'sesion-sin-vinculo' }, 'Admin');
  assert.equal(result?.nombre, 'Admin');
});

test('una sesion desconocida no obtiene permisos por elegir el primer usuario', () => {
  const result = resolveSessionOperator(users, { id: 'desconocido' });
  assert.equal(result, null);
});
