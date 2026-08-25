import assert from 'node:assert/strict';
import { createImportReviewDraft } from '../src/services/assistedImportService.js';
import { importIssuesV702 } from '../src/services/importExportService.js';

const state = {
  accounts: [{ name: 'Efectivo' }],
  categories: [{ name: 'Comida', subcategories: [{ name: 'Mercado' }] }]
};

const validTransaction = {
  cuenta: 'Efectivo',
  categoria: 'Comida',
  subcategoria: 'Mercado',
  movimiento: 'Gasto',
  monto: '12.50',
  fecha: '2026-08-20'
};

const expectedFields = issue => ({
  invalid: {
    account: 'Cuenta requerida',
    category: 'Categoría requerida',
    amount: 'Monto inválido',
    date: 'Fecha inválida'
  },
  new: {
    account: 'Cuenta nueva',
    category: 'Categoría nueva',
    subcategory: 'Subcategoría nueva'
  },
  ambiguous: { movement: 'Movimiento ambiguo' },
  blocked: { kind: 'Tipo no soportado', movement: 'Movimiento bloqueado' }
}[issue.code]?.[issue.field]);

const unsupportedMovement = { ...validTransaction, movimiento: 'Transferencia' };
const draft = createImportReviewDraft('transactions', [unsupportedMovement], state);
const projected = draft.rows[0].issues.map(expectedFields);
assert.deepEqual(projected, ['Movimiento bloqueado']);
assert.deepEqual(
  importIssuesV702('transactions', [unsupportedMovement], state),
  [{ row: unsupportedMovement, fields: ['Movimiento bloqueado'] }],
  'transaction legacy issue output must be projected from assisted review issues'
);

const invalidBudget = { cuenta: 'Efectivo', categoria: 'Comida', monto: 'bad', mes: 'not-a-month' };
assert.deepEqual(
  importIssuesV702('budgets', [invalidBudget], state),
  [{ row: invalidBudget, fields: ['Monto inválido', 'Mes invalido'] }],
  'budget legacy issue output must retain amount and month labels'
);

const invalidProvision = { nombre: 'Reserva', saldo_conceptual: 'bad', fecha_liberacion: '<invalid>' };
assert.deepEqual(
  importIssuesV702('provisions', [invalidProvision], state),
  [{ row: invalidProvision, fields: ['Saldo conceptual inválido', 'Fecha de liberación inválida'] }],
  'provision catalog validation must remain unchanged'
);

console.log('import-issues-compatibility.test.mjs passed');
