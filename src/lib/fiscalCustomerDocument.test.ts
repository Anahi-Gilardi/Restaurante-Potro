import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidArgentineCuit, parseFiscalCustomerDocument } from './fiscalCustomerDocument';

test('normaliza Consumidor Final sin enviar un documento ficticio a ARCA', () => {
  assert.deepEqual(parseFiscalCustomerDocument(''), {
    documentType: 99,
    documentNumber: 0,
    consumerFinal: true,
  });
  assert.deepEqual(parseFiscalCustomerDocument('99-99999999-9'), {
    documentType: 99,
    documentNumber: 0,
    consumerFinal: true,
  });
});

test('acepta DNI y CUIT argentino con dígito verificador válido', () => {
  assert.deepEqual(parseFiscalCustomerDocument('42.694.613'), {
    documentType: 96,
    documentNumber: 42694613,
    consumerFinal: false,
  });
  assert.equal(isValidArgentineCuit('27-42694613-6'), true);
  assert.equal(parseFiscalCustomerDocument('27-42694613-6').documentType, 80);
});

test('rechaza formatos ambiguos y CUIT con verificador inválido', () => {
  assert.throws(() => parseFiscalCustomerDocument('12345'), /DNI/);
  assert.throws(() => parseFiscalCustomerDocument('27-42694613-7'), /verificador/);
});
