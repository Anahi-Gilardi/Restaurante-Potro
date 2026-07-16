import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canIssueFiscalVoucherAsMonotributo,
  fiscalVoucherPreview,
  internalTicketPreview,
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

test('la vista previa fiscal usa el punto de venta real sin inventar numeración ARCA', () => {
  assert.equal(fiscalVoucherPreview('C', 2), 'C-0002-PENDIENTE-ARCA');
  assert.equal(fiscalVoucherPreview('C', null), 'C-PV-PENDIENTE-ARCA');
});

test('los comprobantes X usan una secuencia interna separada desde uno', () => {
  assert.equal(fiscalVoucherPreview('X', 2), 'X-0000-00000001');
  assert.equal(
    fiscalVoucherPreview('X', 2, ['C-0002-00000090', 'X-0001-00000007']),
    'X-0000-00000008',
  );
});

test('identifica el comprobante X como documento interno sin valor fiscal', () => {
  const option = MONOTRIBUTO_INVOICE_OPTIONS.find(item => item.value === 'X');
  assert.equal(option?.fiscal, false);
  assert.equal(option?.disabled, false);
});

test('los tickets de caja usan una secuencia interna separada de ARCA', () => {
  assert.equal(internalTicketPreview(), 'T-00000001');
  assert.equal(
    internalTicketPreview(['C-0002-00000123', 'X-0000-00000007', 'T-00000009']),
    'T-00000010',
  );
});
