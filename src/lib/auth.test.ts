import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocalLoginUser } from './auth';
import type { Usuario } from '../types';

const usuarios: Usuario[] = [
  { id_usuario: 1, nombre: 'Enzo', apellido: 'Fernández', rol: 'mozo', activo: true },
  { id_usuario: 2, nombre: 'Damián', apellido: 'Martínez', rol: 'cocina', activo: true },
  { id_usuario: 3, nombre: 'Sofía', apellido: 'Alegre', rol: 'administrador', activo: true },
  { id_usuario: 4, nombre: 'Inactivo', apellido: 'Prueba', rol: 'mozo', activo: false }
];

test('el usuario técnico local abre la cuenta administradora', () => {
  assert.equal(resolveLocalLoginUser(' sistema ', 'sistema', usuarios)?.nombre, 'Sofía');
});

test('acepta nombre operativo, nombre completo y texto sin tildes', () => {
  assert.equal(resolveLocalLoginUser('enzo', 'sistema', usuarios)?.rol, 'mozo');
  assert.equal(resolveLocalLoginUser('Damian Martinez', 'sistema', usuarios)?.rol, 'cocina');
  assert.equal(resolveLocalLoginUser('SOFIA', 'sistema', usuarios)?.rol, 'administrador');
});

test('rechaza usuarios inexistentes o inactivos', () => {
  assert.equal(resolveLocalLoginUser('desconocido', 'sistema', usuarios), null);
  assert.equal(resolveLocalLoginUser('Inactivo', 'sistema', usuarios), null);
});
