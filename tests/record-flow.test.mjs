import assert from 'node:assert/strict';
import { clearRecordValidation, recordPayload, validateRecordFlow } from '../src/screens/recordFlow.js';

const base = { type: 'expense', date: '2026-07-26', account: 'BAC', amount: 12.5, amountExpression: '12.5' };

assert.deepEqual(validateRecordFlow(base, { value: 12.5, error: '' }), { ok: true });
assert.deepEqual(validateRecordFlow({ ...base, amountExpression: '12+' }, { value: null, error: 'Cálculo incompleto' }), {
  ok: false, field: 'amount', message: 'Completa el cálculo'
});
assert.deepEqual(validateRecordFlow({ ...base, account: '' }, { value: 12.5, error: '' }), {
  ok: false, field: 'account', message: 'Cuenta requerida'
});
assert.deepEqual(validateRecordFlow({ ...base, date: '' }, { value: 12.5, error: '' }), {
  ok: false, field: 'date', message: 'Fecha requerida'
});
assert.deepEqual(validateRecordFlow(base, { value: 0, error: '' }), {
  ok: false, field: 'amount', message: 'Monto requerido'
});
assert.deepEqual(validateRecordFlow({ ...base, type: 'transfer', accountTo: 'BAC' }, { value: 12.5, error: '' }), {
  ok: false, field: 'accountTo', message: 'Selecciona cuentas distintas'
});
assert.equal(recordPayload({ ...base, isExtraordinary: true }).isExtraordinary, true);

const income = { ...base, type: 'income', account: 'Caja', category: 'Salario', description: 'Nómina' };
assert.deepEqual(recordPayload(income), {
  movement: 'Ingreso', date: '2026-07-26', account: 'Caja', accountTo: '', amount: 12.5,
  category: 'Salario', subcategory: '', description: 'Nómina', isExtraordinary: false
});
assert.deepEqual(validateRecordFlow(income, { value: 12.5, error: '' }), { ok: true });

const transfer = { ...base, type: 'transfer', account: 'Caja', accountTo: 'BAC', description: 'Ahorro' };
assert.deepEqual(recordPayload(transfer), {
  movement: 'Transferencia', date: '2026-07-26', account: 'Caja', accountTo: 'BAC', amount: 12.5,
  category: '', subcategory: '', description: 'Ahorro', isExtraordinary: false
});
assert.deepEqual(validateRecordFlow(transfer, { value: 12.5, error: '' }), { ok: true });

const budget = { ...base, type: 'budget', account: '', category: 'Hogar', subcategory: 'Supermercado' };
assert.deepEqual(recordPayload(budget), {
  movement: 'Presupuesto', date: '2026-07-26', account: '', accountTo: '', amount: 12.5,
  category: 'Hogar', subcategory: 'Supermercado', description: '', isExtraordinary: false
});
assert.deepEqual(validateRecordFlow(budget, { value: 12.5, error: '' }), { ok: true });

const provision = { ...base, type: 'provision', account: 'BAC', category: 'Reserva', description: 'Vacaciones' };
assert.deepEqual(recordPayload(provision), {
  movement: 'Provisión', date: '2026-07-26', account: 'BAC', accountTo: '', amount: 12.5,
  category: 'Reserva', subcategory: '', description: 'Vacaciones', isExtraordinary: false
});
assert.deepEqual(validateRecordFlow(provision, { value: 12.5, error: '' }), { ok: true });

const editedExpense = { ...base, editTransactionId: 'tx-17', category: 'Movilidad', subcategory: 'Taxi', description: 'Corregido' };
assert.deepEqual(recordPayload(editedExpense), {
  movement: 'Gasto', date: '2026-07-26', account: 'BAC', accountTo: '', amount: 12.5,
  category: 'Movilidad', subcategory: 'Taxi', description: 'Corregido', isExtraordinary: false
});
assert.deepEqual(validateRecordFlow(editedExpense, { value: 12.5, error: '' }), { ok: true });

const accountCorrection = { ...base, account: '', validation: { field: 'account', message: 'Cuenta requerida' } };
accountCorrection.account = 'Caja';
assert.equal(clearRecordValidation(accountCorrection, 'account'), true);
assert.equal(accountCorrection.validation, undefined);

const transferCorrection = {
  ...base,
  type: 'transfer',
  account: 'Caja',
  accountTo: 'Caja',
  validation: { field: 'accountTo', message: 'Selecciona cuentas distintas' }
};
transferCorrection.account = 'Banco';
assert.equal(clearRecordValidation(transferCorrection, 'account'), true);
assert.equal(transferCorrection.validation, undefined);

const unrelatedCorrection = { ...base, validation: { field: 'account', message: 'Cuenta requerida' } };
assert.equal(clearRecordValidation(unrelatedCorrection, 'amount'), false);
assert.deepEqual(unrelatedCorrection.validation, { field: 'account', message: 'Cuenta requerida' });

console.log('record-flow.test.mjs passed');
