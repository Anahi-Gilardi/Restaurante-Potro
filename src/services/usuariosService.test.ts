import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeUsuarios } from './usuariosService';

test('combina usuarios locales y remotos sin duplicar ids', () => {
  const local = [
    { id_usuario: 1, nombre: 'Enzo local', apellido: 'A', username: 'enzo-local', password: '1234', rol: 'mozo' as const },
    { id_usuario: 2, nombre: 'Micaela', apellido: 'B', username: 'micaela', password: '1234', rol: 'mozo' as const }
  ];
  const remote = [
    { id_usuario: 1, nombre: 'Enzo remoto', apellido: 'A', username: 'enzo-remoto', password: '1234', rol: 'mozo' as const },
    { id_usuario: 3, nombre: 'Sofía', apellido: 'C', username: 'sofia', password: '1234', rol: 'administrador' as const }
  ];

  const merged = mergeUsuarios(remote, local);
  assert.deepEqual(merged.map(usuario => usuario.id_usuario), [1, 2, 3]);
  assert.equal(merged[0].nombre, 'Enzo remoto');
});
