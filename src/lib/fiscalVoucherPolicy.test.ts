import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canIssueFiscalVoucherAsMonotributo,
  MONOTRIBUTO_INVOICE_OPTIONS,
} from './fiscalVoucherPolicy';

test('muestra Factura A y B pero no permite emitirlas como monotributista', () => {
  const byType = Object.fromEntries(MONOTRIBUTO_INVOICE_OPTIONS.map(option => [option.value, option]));
  assert.equal(byType.A.disabled, true);
  assert.equal(byType.B.disabled, true);
  assert.equal(byType.C.disabled, false);
  assert.equal(canIssueFiscalVoucherAsMonotributo('A'), false);
  assert.equal(canIssueFiscalVoucherAsMonotributo('B'), false);
  assert.equal(canIssueFiscalVoucherAsMonotributo('C'), true);
});

test('identifica el comprobante X como documento interno sin valor fiscal', () => {
  const option = MONOTRIBUTO_INVOICE_OPTIONS.find(item => item.value === 'X');
  assert.equal(option?.fiscal, false);
  assert.equal(option?.disabled, false);
});
