import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_MESAS } from '../data/initialData';
import {
  extractTableNumber,
  formatUnitedTableName,
  isUnitedTable,
  formatTicketTableName,
  formatTableDisplayTitle,
  uniteTablesInList,
  separateTablesInList
} from './tableUnions';
import { printerService } from '../services/printerService';
import type { TicketData, Mesa } from '../types';

test('El sistema dispone de un total de 14 mesas configuradas en INITIAL_MESAS', () => {
  assert.equal(INITIAL_MESAS.length, 14);
  for (let i = 1; i <= 14; i++) {
    const mesa = INITIAL_MESAS.find(m => m.id_mesa === i);
    assert.ok(mesa, `Mesa ${i} debe existir en INITIAL_MESAS`);
    assert.equal(mesa.numero_mesa, `Mesa ${i}`);
    assert.equal(mesa.estado, 'libre');
  }
});

test('extractTableNumber extrae correctamente el identificador numérico', () => {
  assert.equal(extractTableNumber(1), '1');
  assert.equal(extractTableNumber('1'), '1');
  assert.equal(extractTableNumber('Mesa 1'), '1');
  assert.equal(extractTableNumber('Mesa 14'), '14');
});

test('formatUnitedTableName genera el nombre canónico para mesas unidas', () => {
  assert.equal(formatUnitedTableName([1, 2]), 'Mesa 1 y 2 (Unidas)');
  assert.equal(formatUnitedTableName(['Mesa 2', 'Mesa 1']), 'Mesa 1 y 2 (Unidas)');
  assert.equal(formatUnitedTableName(['Mesa 1', 'Mesa 2', 'Mesa 3']), 'Mesa 1, 2 y 3 (Unidas)');
});

test('formatTicketTableName formatea mesas unidas y simples para comandas y tickets', () => {
  // Mesas unidas
  assert.equal(formatTicketTableName('Mesa 1 y 2 (Unidas)'), 'MESA 1 Y 2 (UNIDAS)');
  assert.equal(formatTicketTableName('1 y 2'), 'MESA 1 Y 2 (UNIDAS)');
  assert.equal(formatTicketTableName('Mesa 1 + Mesa 2'), 'MESA 1 Y 2 (UNIDAS)');
  assert.equal(formatTicketTableName('Mesa 2 y Mesa 1 (Unidas)'), 'MESA 1 Y 2 (UNIDAS)');

  // Mesas individuales
  assert.equal(formatTicketTableName('Mesa 1'), 'MESA 1');
  assert.equal(formatTicketTableName('Mesa 2'), 'MESA 2');
  assert.equal(formatTicketTableName('1'), 'MESA 1');
  assert.equal(formatTicketTableName(1), 'MESA 1');
  assert.equal(formatTicketTableName('Mesa 14'), 'MESA 14');
});

test('uniteTablesInList une dos mesas correctamente con capacidad combinada y estado unida', () => {
  const m1 = INITIAL_MESAS.find(m => m.id_mesa === 1);
  const m2 = INITIAL_MESAS.find(m => m.id_mesa === 2);
  assert.ok(m1 && m2);

  const result = uniteTablesInList(m1, m2, INITIAL_MESAS);
  const updatedM1 = result.find(m => m.id_mesa === 1);
  const updatedM2 = result.find(m => m.id_mesa === 2);
  assert.ok(updatedM1 && updatedM2);

  assert.equal(updatedM1.numero_mesa, 'Mesa 1 y 2 (Unidas)');
  assert.deepEqual(updatedM1.mesas_unidas, [1, 2]);
  assert.equal(updatedM1.capacidad, (m1.capacidad || 2) + (m2.capacidad || 2));
  assert.equal(updatedM1.parent_id, null);

  assert.equal(updatedM2.estado, 'unida');
  assert.equal(updatedM2.parent_id, 1);
});

test('separateTablesInList separa las mesas unidas restaurando nombres individuales', () => {
  const m1 = INITIAL_MESAS.find(m => m.id_mesa === 1);
  const m2 = INITIAL_MESAS.find(m => m.id_mesa === 2);
  assert.ok(m1 && m2);

  const unitedList = uniteTablesInList(m1, m2, INITIAL_MESAS);
  const tableToSeparate = unitedList.find(m => m.id_mesa === 1);
  assert.ok(tableToSeparate);

  const separatedList = separateTablesInList(tableToSeparate, unitedList);
  const sepM1 = separatedList.find(m => m.id_mesa === 1);
  const sepM2 = separatedList.find(m => m.id_mesa === 2);
  assert.ok(sepM1 && sepM2);

  assert.equal(sepM1.numero_mesa, 'Mesa 1');
  assert.equal(sepM1.estado, 'libre');
  assert.deepEqual(sepM1.mesas_unidas, []);
  assert.equal(sepM1.parent_id, null);

  assert.equal(sepM2.numero_mesa, 'Mesa 2');
  assert.equal(sepM2.estado, 'libre');
  assert.deepEqual(sepM2.mesas_unidas, []);
  assert.equal(sepM2.parent_id, null);
});

test('printerService genera ticket ESC/POS con MESA 1 Y 2 (UNIDAS) al unir y MESA 1 o MESA 2 al separar', () => {
  const config = printerService.getDefaultConfig();

  const baseTicket: TicketData = {
    nombreComercial: 'El Patrón',
    razonSocial: 'El Patron SRL',
    cuit: '30-71234567-8',
    direccion: 'Ruta 148 Km 9.5',
    telefono: '+54 9 3584 37-3711',
    email: 'contacto@elpatron.com.ar',
    nroComprobante: 'TICK-001-00100',
    idPedido: 100,
    mesa: 'Mesa 1 y 2 (Unidas)',
    mozo: 'Enzo',
    cajero: 'Admin',
    fechaHora: '12/09/2026 21:30',
    items: [
      { cantidad: 1, descripcion: 'Bife de Chorizo', precio_unitario: 24000, subtotal: 24000 }
    ],
    subtotal: 24000,
    descuento: 0,
    propina: 0,
    iva: 0,
    total: 24000,
    metodosPago: [{ metodo: 'efectivo', monto: 24000 }],
    vuelto: 0,
    tipoComprobante: 'ticket_consumo',
    mensajePie: 'GRACIAS POR SU VISITA'
  };

  // Ticket con mesas unidas
  const escUnited = printerService.generateEscPosText(baseTicket, config);
  assert.match(escUnited, /MESA: MESA 1 Y 2 \(UNIDAS\)/);

  // Ticket con mesa 1 separada
  const ticketMesa1 = { ...baseTicket, mesa: 'Mesa 1' };
  const escMesa1 = printerService.generateEscPosText(ticketMesa1, config);
  assert.match(escMesa1, /MESA: MESA 1/);
  assert.doesNotMatch(escMesa1, /UNIDAS/);

  // Ticket con mesa 2 separada
  const ticketMesa2 = { ...baseTicket, mesa: 'Mesa 2' };
  const escMesa2 = printerService.generateEscPosText(ticketMesa2, config);
  assert.match(escMesa2, /MESA: MESA 2/);
  assert.doesNotMatch(escMesa2, /UNIDAS/);
});

test('formatTableDisplayTitle formatea títulos legibles sin duplicar prefijos de mesa', () => {
  assert.equal(formatTableDisplayTitle('1'), 'Mesa 1');
  assert.equal(formatTableDisplayTitle(1), 'Mesa 1');
  assert.equal(formatTableDisplayTitle('14'), 'Mesa 14');
  assert.equal(formatTableDisplayTitle('Mesa 1'), 'Mesa 1');
  assert.equal(formatTableDisplayTitle('Mesa 14'), 'Mesa 14');
  assert.equal(formatTableDisplayTitle('Mesa 1 y 2 (Unidas)'), 'Mesa 1 y 2 (Unidas)');
  assert.equal(formatTableDisplayTitle('Delivery Rappi 10'), 'Delivery Rappi 10');
  assert.equal(formatTableDisplayTitle('Mostrador'), 'Mostrador');
  assert.equal(formatTableDisplayTitle(''), 'Mesa');
  assert.equal(formatTableDisplayTitle(null), 'Mesa');
});

