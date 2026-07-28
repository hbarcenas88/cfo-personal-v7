import assert from 'node:assert/strict';
import { recordPayload, validateRecordFlow } from '../src/screens/recordFlow.js';

const base = { type: 'expense', date: '2026-07-26', account: 'BAC', amount: 12.5, amountExpression: '12.5' };

assert.deepEqual(validateRecordFlow(base, { value: 12.5, error: '' }), { ok: true });
assert.deepEqual(validateRecordFlow({ ...base, amountExpression: '12+' }, { value: null, error: 'Cálculo incompleto' }), {
  ok: false, field: 'amount', message: 'Completa el cálculo'
});
assert.deepEqual(validateRecordFlow({ ...base, account: '' }, { value: 12.5, error: '' }), {
  ok: false, field: 'account', message: 'Cuenta requerida'
});
assert.equal(recordPayload({ ...base, isExtraordinary: true }).isExtraordinary, true);

console.log('record-flow.test.mjs passed');
