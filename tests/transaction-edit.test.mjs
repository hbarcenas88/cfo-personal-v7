import assert from 'node:assert/strict';
import { applyTransactionEdit, createTransfer, normalizeTransaction } from '../src/services/financeService.js';

const state = {
  accounts: [{ name: 'Caja' }, { name: 'Banco' }, { name: 'Tarjeta' }],
  categories: [
    { name: 'Comida', type: 'Gasto', subcategories: ['Supermercado'] },
    { name: 'Salario', type: 'Ingreso', subcategories: [] }
  ]
};

const normal = normalizeTransaction({
  id: 'normal-1',
  date: '2026-04-18',
  account: 'Caja',
  movement: 'Gasto',
  amount: 35,
  category: 'Comida',
  subcategory: 'Supermercado',
  description: 'Compra original',
  source: 'Importado',
  createdAt: '2026-04-18T10:00:00.000Z'
}, state);

const normalResult = applyTransactionEdit([normal], normal.id, {
  date: '2026-04-19',
  account: 'Banco',
  movement: 'Ingreso',
  amount: 1200,
  category: 'Salario',
  description: 'Pago actualizado'
}, state);

assert.equal(normalResult.ok, true);
assert.equal(normalResult.transactions.length, 1);
assert.equal(normalResult.transactions[0].id, 'normal-1');
assert.equal(normalResult.transactions[0].source, 'Importado');
assert.equal(normalResult.transactions[0].createdAt, '2026-04-18T10:00:00.000Z');
assert.equal(normalResult.transactions[0].movement, 'Ingreso');
assert.equal(normalResult.transactions[0].amount, 1200);
assert.equal(normalResult.transactions[0].account, 'Banco');
assert.equal(normalResult.transactions[0].affectsIncome, true);
assert.equal(normalResult.transactions[0].affectsExpense, true);

const provisionResult = applyTransactionEdit([normal], normal.id, {
  date: '2026-04-19',
  account: 'Caja',
  movement: 'Provisión',
  amount: 75,
  description: 'Reserva actualizada'
}, state);

assert.equal(provisionResult.ok, true);
assert.equal(provisionResult.transactions[0].movement, 'Provisión');
assert.equal(provisionResult.transactions[0].provisionDelta, 75);
assert.equal(provisionResult.transactions[0].affectsBalance, false);
assert.equal(provisionResult.transactions[0].affectsExpense, false);
assert.equal(provisionResult.transactions[0].affectsBudget, false);

const [transferOut, transferIn] = createTransfer({
  from: 'Caja',
  to: 'Banco',
  amount: 45,
  date: '2026-04-18',
  description: 'Apartado',
  source: 'Manual'
});
transferOut.note = 'Nota salida';
transferIn.note = 'Nota entrada';
const unrelated = normalizeTransaction({ id: 'unrelated', amount: 8, account: 'Tarjeta', movement: 'Gasto' }, state);
const transferResult = applyTransactionEdit([transferOut, unrelated, transferIn], transferOut.id, {
  date: '2026-04-20',
  account: 'Banco',
  accountTo: 'Tarjeta',
  amount: 50,
  description: 'Transferencia actualizada',
  movement: 'Transferencia'
}, state);

assert.equal(transferResult.ok, true);
assert.equal(transferResult.transactions.length, 3);
const editedOut = transferResult.transactions.find(tx => tx.id === transferOut.id);
const editedIn = transferResult.transactions.find(tx => tx.id === transferIn.id);
assert.equal(editedOut.account, 'Banco');
assert.equal(editedOut.accountTo, 'Tarjeta');
assert.equal(editedOut.amount, 50);
assert.equal(editedOut.transferId, transferOut.transferId);
assert.equal(editedOut.createdAt, transferOut.createdAt);
assert.equal(editedOut.note, 'Nota salida');
assert.equal(editedIn.account, 'Tarjeta');
assert.equal(editedIn.accountTo, 'Banco');
assert.equal(editedIn.amount, 50);
assert.equal(editedIn.transferId, transferIn.transferId);
assert.equal(editedIn.createdAt, transferIn.createdAt);
assert.equal(editedIn.note, 'Nota entrada');
assert.equal(editedOut.affectsIncome, false);
assert.equal(editedOut.affectsExpense, false);
assert.equal(editedOut.affectsBudget, false);
assert.equal(transferResult.transactions.find(tx => tx.id === 'unrelated'), unrelated);

const missingResult = applyTransactionEdit([], 'missing', { movement: 'Gasto' }, state);
assert.equal(missingResult.ok, false);

const invalidConversionResult = applyTransactionEdit([normal], normal.id, {
  movement: 'Transferencia',
  account: 'Caja',
  amount: 35,
  date: '2026-04-18'
}, state);
assert.equal(invalidConversionResult.ok, false);

const malformedTransferResult = applyTransactionEdit([
  { ...transferOut, id: 'bad-out', transferId: 'bad-transfer' },
  { ...transferOut, id: 'bad-second', transferId: 'bad-transfer' }
], 'bad-out', { movement: 'Transferencia' }, state);
assert.equal(malformedTransferResult.ok, false);

console.log('transaction-edit.test.mjs passed');
