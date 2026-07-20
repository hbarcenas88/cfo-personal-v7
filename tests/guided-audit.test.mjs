import assert from 'node:assert/strict';
import {
  buildGuidedAuditReview,
  matchStatementToTransactions,
  normalizeStatementRows,
  statementFingerprint
} from '../src/services/guidedAuditService.js';

const statementRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-43.20', detalle: 'NETFLIX.COM' },
  { fecha: '2026-07-17', monto: '100.00', detalle: 'TRANSFERENCIA RECIBIDA' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });

assert.deepEqual(statementRows[0], {
  id: 'statement-2', sourceRow: 2, date: '2026-07-19', signedAmount: -43.2, description: 'NETFLIX.COM'
});
assert.equal(statementFingerprint(statementRows), statementFingerprint([...statementRows].reverse()));
assert.equal(normalizeStatementRows([
  { fecha: '2026-07-17', debito: '43.20', credito: '', detalle: 'Cargo' }
], { date: 'fecha', debit: 'debito', credit: 'credito', description: 'detalle' })[0].signedAmount, -43.2);

const state = {
  accounts: [{ name: 'BAC Débito' }],
  transactions: [
    { id: 'app-netflix', account: 'BAC Débito', date: '2026-07-18', movement: 'Gasto', amount: 43.2, description: 'Netflix', affectsBalance: true },
    { id: 'app-transfer', account: 'BAC Débito', date: '2026-07-17', movement: 'Ingreso', amount: 100, description: 'Transferencia recibida', affectsBalance: true },
    { id: 'reserve', account: 'BAC Débito', date: '2026-07-18', movement: 'Provisión', amount: 20, description: 'Reserva', affectsBalance: false }
  ]
};
const before = structuredClone(state);
const review = buildGuidedAuditReview({
  id: 'close-1', accountName: 'BAC Débito', cutoffDate: '2026-07-19', realBalance: 56.8,
  range: { from: '2026-07-01', to: '2026-07-19' }, statementRows, decisions: []
}, state);

assert.equal(review.dateWarnings.length, 1);
assert.equal(review.onlyInApp.length, 0);
assert.equal(review.onlyInBank.length, 0);
assert.equal(review.delta, 0);
assert.deepEqual(state, before);

const matching = matchStatementToTransactions(normalizeStatementRows([
  { fecha: '2026-07-10', monto: '-10.00', detalle: 'Café Central' },
  { fecha: '2026-07-13', monto: '-20.00', detalle: 'Super Mercado' },
  { fecha: '2026-07-20', monto: '-30.00', detalle: 'Lejos' },
  { fecha: '2026-07-15', monto: '-40.00', detalle: 'Duplicado' },
  { fecha: '2026-07-16', monto: '-50.00', detalle: 'Solo banco' }
], { date: 'fecha', amount: 'monto', description: 'detalle' }), [
  { id: 'exact', date: '2026-07-10', movement: 'Gasto', amount: 10, description: 'Café Central' },
  { id: 'warning', date: '2026-07-11', movement: 'Gasto', amount: 20, description: 'Super Mercado' },
  { id: 'distant', date: '2026-07-15', movement: 'Gasto', amount: 30, description: 'Lejos' },
  { id: 'ambiguous-a', date: '2026-07-15', movement: 'Gasto', amount: 40, description: 'Duplicado' },
  { id: 'ambiguous-b', date: '2026-07-15', movement: 'Gasto', amount: 40, description: 'Duplicado' },
  { id: 'only-app', date: '2026-07-16', movement: 'Gasto', amount: 60, description: 'Solo app' }
]);

assert.equal(matching.exact.length, 1);
assert.equal(matching.dateWarning.length, 1);
assert.equal(matching.distantCandidate.length, 1);
assert.equal(matching.ambiguous.length, 1);
assert.equal(matching.onlyInBank.length, 1);
assert.equal(matching.onlyInApp.length, 1);
assert.equal(matching.exact[0].transaction.id, 'exact');

const balanceExcluded = matchStatementToTransactions(normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-15.00', detalle: 'Ignorada' }
], { date: 'fecha', amount: 'monto', description: 'detalle' }), [
  { id: 'excluded', date: '2026-07-19', movement: 'Gasto', amount: 15, affectsBalance: false }
]);

assert.equal(balanceExcluded.exact.length, 0);
assert.equal(balanceExcluded.onlyInBank.length, 1);
assert.equal(balanceExcluded.onlyInApp.length, 0);

const dstBoundary = matchStatementToTransactions(normalizeStatementRows([
  { fecha: '2026-03-10', monto: '-25.00', detalle: 'Horario' }
], { date: 'fecha', amount: 'monto', description: 'detalle' }), [
  { id: 'dst', date: '2026-03-08', movement: 'Gasto', amount: 25, affectsBalance: true }
]);

assert.equal(dstBoundary.dateWarning.length, 1);
assert.equal(dstBoundary.dateWarning[0].dayDifference, 2);

const pendingReview = (date, transactionDate) => buildGuidedAuditReview({
  accountName: 'Pendiente', cutoffDate: '2026-07-19', realBalance: -25,
  range: { from: '2026-07-01', to: '2026-07-19' },
  statementRows: normalizeStatementRows([
    { fecha: date, monto: '-25.00', detalle: 'Pendiente' }
  ], { date: 'fecha', amount: 'monto', description: 'detalle' }),
  decisions: []
}, {
  transactions: [
    { id: `pending-${transactionDate}`, account: 'Pendiente', date: transactionDate, movement: 'Gasto', amount: 25, affectsBalance: true }
  ]
});

assert.equal(pendingReview('2026-07-19', '2026-07-17').status, 'needsReview');
assert.equal(pendingReview('2026-07-19', '2026-07-15').status, 'needsReview');

const decidedRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-10.00', detalle: 'Confirmada' },
  { fecha: '2026-07-18', monto: '-20.00', detalle: 'Descartada' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });
const decidedReview = buildGuidedAuditReview({
  accountName: 'Decisiones', cutoffDate: '2026-07-19', realBalance: -30,
  range: { from: '2026-07-01', to: '2026-07-19' }, statementRows: decidedRows,
  decisions: [
    { statementRowId: decidedRows[0].id, transactionId: 'confirmed-app', status: 'confirmed' },
    { statementRowId: decidedRows[1].id, transactionId: 'dismissed-app', status: 'dismissed' }
  ]
}, {
  transactions: [
    { id: 'confirmed-app', account: 'Decisiones', date: '2026-07-19', movement: 'Gasto', amount: 10, affectsBalance: true },
    { id: 'dismissed-app', account: 'Decisiones', date: '2026-07-18', movement: 'Gasto', amount: 20, affectsBalance: true }
  ]
});

assert.equal(decidedReview.confirmed.length, 1);
assert.equal(decidedReview.confirmed[0].statementRow.id, decidedRows[0].id);
assert.equal(decidedReview.exact.length, 0);

console.log('guided-audit.test.mjs passed');
