import assert from 'node:assert/strict';
import {
  applyAuditCloseDecision,
  buildGuidedAuditReview,
  matchStatementToTransactions,
  normalizeStatementRows,
  statementFingerprint,
  validateStatementRows,
  validateRowsAgainstRange
} from '../src/services/guidedAuditService.js';
import {
  readStatementFile,
  suggestedStatementMapping,
  validateStatementMapping
} from '../src/services/statementFileService.js';

assert.deepEqual(
  validateStatementMapping(['Fecha', 'Monto', 'Descripción'], {
    date: 'Fecha', amount: 'Monto', description: 'Descripción'
  }),
  { ok: true, message: '' }
);
assert.deepEqual(
  validateStatementMapping(['Fecha', 'Débito', 'Crédito', 'Descripción'], {
    date: 'Fecha', debit: 'Débito', credit: 'Crédito', description: 'Descripción'
  }),
  { ok: true, message: '' }
);
assert.deepEqual(
  validateStatementMapping(['Fecha', 'Monto', 'Débito', 'Crédito', 'Descripción'], {
    date: 'Fecha', amount: 'Monto', debit: 'Débito', credit: 'Crédito', description: 'Descripción'
  }),
  { ok: false, message: 'Elige un importe firmado o débito y crédito, no ambos.' }
);
assert.deepEqual(
  validateStatementMapping(['Fecha', 'Monto', 'Débito', 'Descripción'], {
    date: 'Fecha', amount: 'Monto', debit: 'Débito', description: 'Descripción'
  }),
  { ok: false, message: 'Elige un importe firmado o débito y crédito, no ambos.' }
);
assert.deepEqual(
  validateStatementMapping(['Fecha', 'Monto', 'Crédito', 'Descripción'], {
    date: 'Fecha', amount: 'Monto', credit: 'Crédito', description: 'Descripción'
  }),
  { ok: false, message: 'Elige un importe firmado o débito y crédito, no ambos.' }
);
assert.equal(
  validateStatementMapping(['Fecha', 'Monto'], { date: 'Fecha', amount: 'Fecha', description: 'Monto' }).ok,
  false
);

assert.deepEqual(suggestedStatementMapping(['Fecha de transacción', 'Débito', 'Crédito', 'Detalle']), {
  date: 'Fecha de transacción', amount: '', debit: 'Débito', credit: 'Crédito', description: 'Detalle'
});

const csvStatement = await readStatementFile({
  name: 'estado.csv',
  text: async () => 'Fecha,Monto,Descripción\n2026-07-19,-43.20,Netflix'
});
assert.deepEqual(csvStatement, {
  headers: ['Fecha', 'Monto', 'Descripción'],
  objects: [{ __row: 2, fecha: '2026-07-19', monto: '-43.20', descripcion: 'Netflix' }],
  format: 'csv'
});
assert.deepEqual(
  normalizeStatementRows(csvStatement.objects, {
    date: 'Fecha', amount: 'Monto', description: 'Descripción'
  }),
  [{ id: 'statement-2', sourceRow: 2, date: '2026-07-19', signedAmount: -43.2, description: 'Netflix' }]
);

const originalXLSX = globalThis.XLSX;
globalThis.XLSX = {
  read: () => ({ SheetNames: ['Resumen'], Sheets: { Resumen: {} } }),
  utils: { sheet_to_json: () => [['Fecha', 'Monto', 'Descripción'], ['2026-07-19', -43.2, 'Netflix']] }
};
const xlsxStatement = await readStatementFile({
  name: 'estado.xlsx',
  arrayBuffer: async () => new ArrayBuffer(0)
});
assert.deepEqual(xlsxStatement, {
  headers: ['Fecha', 'Monto', 'Descripción'],
  objects: [{ __row: 2, fecha: '2026-07-19', monto: -43.2, descripcion: 'Netflix' }],
  format: 'xlsx'
});
globalThis.XLSX = originalXLSX;

await assert.rejects(
  readStatementFile({ name: 'estado.ofx' }),
  { message: 'Selecciona un archivo CSV o XLSX.' }
);

const statementRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-43.20', detalle: 'NETFLIX.COM' },
  { fecha: '2026-07-17', monto: '100.00', detalle: 'TRANSFERENCIA RECIBIDA' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });

const outOfRange = normalizeStatementRows([
  { fecha: '2026-06-30', monto: '-10', detalle: 'Antes del rango' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });
assert.equal(validateRowsAgainstRange(outOfRange, { from: '2026-07-01', to: '2026-07-19' }).ok, false);
assert.equal(
  validateRowsAgainstRange(statementRows, { from: '2026-07-01', to: '2026-07-19' }).ok,
  true
);
assert.deepEqual(
  validateStatementRows([], { date: 'fecha', amount: 'monto', description: 'detalle' }),
  { ok: true, message: '' }
);
assert.deepEqual(
  validateStatementRows([
    { __row: 2, fecha: '', monto: '', detalle: '' }
  ], { date: 'fecha', amount: 'monto', description: 'detalle' }),
  { ok: true, message: '' }
);
assert.deepEqual(
  normalizeStatementRows([
    { __row: 2, fecha: '', monto: '', detalle: '' }
  ], { date: 'fecha', amount: 'monto', description: 'detalle' }),
  []
);
assert.equal(validateStatementRows([
  { __row: 2, fecha: 'fecha inválida', monto: '-10', detalle: 'Fecha rota' }
], { date: 'fecha', amount: 'monto', description: 'detalle' }).ok, false);
assert.equal(validateStatementRows([
  { __row: 2, fecha: '2026-07-19', monto: 'importe inválido', detalle: 'Monto roto' }
], { date: 'fecha', amount: 'monto', description: 'detalle' }).ok, false);

assert.deepEqual(statementRows[0], {
  id: 'statement-2', sourceRow: 2, date: '2026-07-19', signedAmount: -43.2, description: 'NETFLIX.COM'
});
assert.equal(statementFingerprint(statementRows), statementFingerprint([...statementRows].reverse()));
assert.equal(normalizeStatementRows([
  { fecha: '2026-07-17', debito: '43.20', credito: '', detalle: 'Cargo' }
], { date: 'fecha', debit: 'debito', credit: 'credito', description: 'detalle' })[0].signedAmount, -43.2);

const auditClose = {
  id: 'close-1', accountName: 'BAC Débito', cutoffDate: '2026-07-19', realBalance: 56.8,
  range: { from: '2026-07-01', to: '2026-07-19' }, statementRows,
  fingerprint: statementFingerprint(statementRows), decisions: []
};
const closeWithDecision = applyAuditCloseDecision(auditClose, {
  id: 'decision-1', statementRowId: 'statement-2', transactionId: 'app-netflix', status: 'confirmed'
});
assert.equal(closeWithDecision.decisions.length, 1);
assert.equal(auditClose.decisions.length, 0);
assert.throws(() => applyAuditCloseDecision(closeWithDecision, {
  id: 'decision-2', statementRowId: 'statement-2', transactionId: 'app-transfer', status: 'confirmed'
}), /ya tiene una decisión/);

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
assert.equal(pendingReview('2026-07-19', '2026-07-19').exact.length, 1);
assert.equal(pendingReview('2026-07-19', '2026-07-19').status, 'needsReview');

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
assert.equal(decidedReview.onlyInBank.length, 1);
assert.equal(decidedReview.onlyInApp.length, 1);

const ambiguousRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-40.00', detalle: 'Compra repetida' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });
const ambiguousTransactions = [
  { id: 'candidate-a', account: 'Ambigua', date: '2026-07-19', movement: 'Gasto', amount: 40, description: 'Compra repetida', affectsBalance: true },
  { id: 'candidate-b', account: 'Ambigua', date: '2026-07-19', movement: 'Gasto', amount: 40, description: 'Compra repetida', affectsBalance: true }
];
const ambiguousAfterDismissal = buildGuidedAuditReview({
  accountName: 'Ambigua', cutoffDate: '2026-07-19', realBalance: -80,
  range: { from: '2026-07-01', to: '2026-07-19' },
  statementRows: ambiguousRows,
  decisions: [{
    statementRowId: ambiguousRows[0].id,
    transactionId: 'candidate-a',
    status: 'dismissed'
  }]
}, { transactions: ambiguousTransactions });

assert.equal(ambiguousAfterDismissal.ambiguous.length, 0);
assert.equal(ambiguousAfterDismissal.exact.length, 1);
assert.equal(ambiguousAfterDismissal.exact[0].transaction.id, 'candidate-b');
assert.deepEqual(ambiguousAfterDismissal.onlyInApp.map(transaction => transaction.id), ['candidate-a']);
assert.equal(ambiguousAfterDismissal.onlyInBank.length, 0);

const twoRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-25.00', detalle: 'Pago repetido' },
  { fecha: '2026-07-19', monto: '-25.00', detalle: 'Pago repetido' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });
const afterPartialConfirmation = buildGuidedAuditReview({
  accountName: 'Reserva', cutoffDate: '2026-07-19', realBalance: -50,
  range: { from: '2026-07-01', to: '2026-07-19' },
  statementRows: twoRows,
  decisions: [{
    statementRowId: twoRows[0].id,
    transactionId: 'reserved-a',
    status: 'confirmed'
  }]
}, {
  transactions: [
    { id: 'reserved-a', account: 'Reserva', date: '2026-07-19', movement: 'Gasto', amount: 25, description: 'Pago repetido', affectsBalance: true },
    { id: 'reserved-b', account: 'Reserva', date: '2026-07-19', movement: 'Gasto', amount: 25, description: 'Pago repetido', affectsBalance: true }
  ]
});

assert.equal(afterPartialConfirmation.confirmed.length, 1);
assert.equal(afterPartialConfirmation.exact.length, 1);
assert.equal(afterPartialConfirmation.exact[0].statementRow.id, twoRows[1].id);
assert.equal(afterPartialConfirmation.exact[0].transaction.id, 'reserved-b');

const dismissalOne = applyAuditCloseDecision({
  ...auditClose,
  decisions: []
}, {
  id: 'dismiss-a',
  statementRowId: 'statement-2',
  transactionId: 'candidate-a',
  status: 'dismissed'
});
const dismissalTwo = applyAuditCloseDecision(dismissalOne, {
  id: 'dismiss-b',
  statementRowId: 'statement-2',
  transactionId: 'candidate-b',
  status: 'dismissed'
});
assert.equal(dismissalTwo.decisions.length, 2);

console.log('guided-audit.test.mjs passed');
