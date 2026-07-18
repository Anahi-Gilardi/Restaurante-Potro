import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import automaticBackupHandler from '../../api/automatic-backup';
import {
  AUTOMATIC_BACKUP_COLLECTIONS,
  AUTOMATIC_BACKUP_SOURCE_TABLES,
  argentinaDateKey,
  buildAutomaticBackupSnapshot,
  expiredAutomaticBackupIds,
  getAutomaticBackupStatus,
  nextAutomaticBackupRun,
  sanitizeBackupConfiguration,
} from './automaticBackup';

test('el backup automático cubre 20 colecciones y excluye tablas sensibles', () => {
  assert.equal(AUTOMATIC_BACKUP_COLLECTIONS.length, 20);
  assert.equal(new Set(AUTOMATIC_BACKUP_COLLECTIONS).size, 20);
  assert.doesNotMatch(AUTOMATIC_BACKUP_SOURCE_TABLES.join(','), /arca_config|app_login_credentials|backups/);
});

test('convierte las tablas de Supabase al formato restaurable', () => {
  const snapshot = buildAutomaticBackupSnapshot({
    usuarios: [{
      id_usuario: 1,
      nombre: 'Admin',
      apellido: 'Principal',
      username: 'admin',
      rol: 'superadmin',
      activo: true,
      auth_user_id: 'auth-1',
      password: 'no-debe-copiarse'
    }],
    mesas: [{ id_mesa: 1, numero_mesa: 'Mesa 1', comensales_actuales: 3 }],
    pedidos_cabecera: [{
      id_pedido: 10,
      id_mesa: 1,
      numero_mesa: 'Mesa 1',
      mozo: 'Enzo',
      estado_comanda: 'pendiente',
      fecha_hora: '2026-07-17T12:00:00.000Z',
      origen: 'Mozo',
      items: '[]'
    }],
    pedido_detalle: [{
      id_detalle: '10_0000',
      id_pedido: 10,
      id_producto: 'p1',
      nombre: 'Plato',
      cantidad: 2,
      categoria: 'cocina',
      precio_unitario: 1500
    }],
    promociones: [{ id_promo: 'pr1', nombre: 'Cena', descuento: 20, activa: true }],
    facturas: [{
      id_factura: 'f1',
      numero_factura: 'C-0001-00000001',
      tipo_comprobante: 'Factura C',
      total: 3000,
      metodo_pago: 'Efectivo',
      fecha_emision: '2026-07-17T12:10:00.000Z',
      fiscal_status: 'authorized',
      afip_cae: '123'
    }]
  });

  assert.equal(snapshot.usuarios[0].password, '');
  assert.equal(snapshot.mesas[0].comensales, 3);
  assert.equal(snapshot.pedidos[0].items[0].precio_unitario, 1500);
  assert.equal(snapshot.promociones[0].descuento_porcentaje, 20);
  assert.equal(snapshot.facturas[0].tipo, 'C');
  assert.equal(snapshot.facturas[0].estado, 'autorizado');
  assert.equal(snapshot.facturas[0].afip_cae, '123');
  assert.equal(Object.keys(snapshot).length, 20);
});

test('la retención conserva las 30 copias automáticas más recientes', () => {
  const rows = Array.from({ length: 35 }, (_, index) => ({
    id_backup: `auto_${String(index + 1).padStart(2, '0')}`,
    fecha: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
  }));
  rows.push({ id_backup: 'cp_manual', fecha: '2025-01-01T00:00:00.000Z' });

  assert.deepEqual(
    expiredAutomaticBackupIds(rows, 30),
    ['auto_05', 'auto_04', 'auto_03', 'auto_02', 'auto_01']
  );
});

test('la fecha diaria usa el huso horario argentino', () => {
  assert.equal(argentinaDateKey(new Date('2026-07-18T01:30:00.000Z')), '2026-07-17');
});

test('calcula la siguiente ventana diaria configurada a las 06:00 UTC', () => {
  assert.equal(
    nextAutomaticBackupRun(new Date('2026-07-17T05:30:00.000Z')).toISOString(),
    '2026-07-17T06:00:00.000Z'
  );
  assert.equal(
    nextAutomaticBackupRun(new Date('2026-07-17T06:30:00.000Z')).toISOString(),
    '2026-07-18T06:00:00.000Z'
  );
});

test('informa si el respaldo automatico esta saludable, pendiente o demorado', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');
  assert.equal(getAutomaticBackupStatus([], now).health, 'pending');
  assert.equal(getAutomaticBackupStatus([{
    id_cp: 'auto_2026-07-18',
    fechaIso: '2026-07-18T06:02:00.000Z'
  }], now).health, 'healthy');
  assert.equal(getAutomaticBackupStatus([{
    id_cp: 'auto_2026-07-16',
    fechaIso: '2026-07-16T06:02:00.000Z'
  }], now).health, 'delayed');
});

test('no respalda la identidad fiscal ficticia de configuraciones antiguas', () => {
  assert.deepEqual(sanitizeBackupConfiguration([
    { clave: 'cuit', valor: '30-00000000-0' },
    { clave: 'razon_social', valor: 'Demo' },
    { clave: 'tema_visual', valor: 'patron' }
  ]), [{ clave: 'tema_visual', valor: 'patron' }]);
});

test('Vercel agenda una ejecución diaria y el endpoint exige CRON_SECRET', () => {
  const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const endpoint = readFileSync(new URL('../../api/automatic-backup.ts', import.meta.url), 'utf8');
  assert.deepEqual(vercelConfig.crons, [{ path: '/api/automatic-backup', schedule: '0 6 * * *' }]);
  assert.match(endpoint, /process\.env\.CRON_SECRET/);
  assert.match(endpoint, /Bearer \$\{cronSecret\}/);
  assert.match(endpoint, /res\.status\(401\)/);
});

test('el endpoint rechaza llamadas sin la autorización de Vercel', async () => {
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'cron-secret-de-prueba';
  let statusCode = 0;
  let payload: unknown;
  const response = {
    setHeader() {},
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      payload = body;
      return body;
    },
    end() {}
  };

  await automaticBackupHandler({ method: 'GET', body: null, query: {}, headers: {} }, response);
  assert.equal(statusCode, 401);
  assert.deepEqual(payload, { success: false, error: 'No autorizado.' });
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

test('el modulo de Backups muestra salud y descarga el dump solo al restaurar', () => {
  const moduleSource = readFileSync(new URL('../components/BackupsModule.tsx', import.meta.url), 'utf8');
  assert.match(moduleSource, /getAutomaticBackupStatus\(backups\)/);
  assert.match(moduleSource, /Respaldo Autom.tico/);
  assert.match(moduleSource, /backupsService\.getContent\(cp\)/);
  assert.match(moduleSource, /navigator\.storage\.estimate/);
});
