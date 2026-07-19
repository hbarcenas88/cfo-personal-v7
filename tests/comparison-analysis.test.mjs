import assert from 'node:assert/strict';
import { buildAuditComparison, buildCategoryComparison } from '../src/services/financeService.js';

const state = {
  categories: [{ name: 'Comida', subcategories: [] }, { name: 'Hogar', subcategories: [] }],
  budgets: [],
  transactions: [
    { id: 'apr-food', date: '2026-04-05', movement: 'Gasto', account: 'Caja', category: 'Comida', subcategory: '', amount: 120 },
    { id: 'apr-home', date: '2026-04-06', movement: 'Gasto', account: 'Caja', category: 'Hogar', subcategory: '', amount: 30 },
    { id: 'may-food', date: '2026-05-05', movement: 'Gasto', account: 'Caja', category: 'Comida', subcategory: '', amount: 80 },
    { id: 'may-trip', date: '2026-05-07', movement: 'Gasto', account: 'Caja', category: 'Transporte', subcategory: '', amount: 20 },
    { id: 'may-income', date: '2026-05-06', movement: 'Ingreso', account: 'Caja', category: '', subcategory: '', amount: 900 }
  ]
};
const before = structuredClone(state);
const result = buildAuditComparison(state, { mode: 'month', month: '2026-05', compare: true }, {
  text: '', accounts: [], types: ['Gasto'], categories: ['Comida'], subcategories: []
});
assert.equal(result.currentRows.length, 1);
assert.equal(result.previousRows.length, 1);
assert.equal(result.currentTotal, -80);
assert.equal(result.previousTotal, -120);
assert.equal(result.delta, 40);
assert.equal(result.percent, 33.33333333333333);
assert.deepEqual(state, before);
const noBase = buildAuditComparison(state, { mode: 'month', month: '2026-05', compare: true }, {
  text: '', accounts: [], types: ['Gasto'], categories: ['Transporte'], subcategories: []
});
assert.equal(noBase.previousTotal, 0);
assert.equal(noBase.percent, null);
const categoryResult = buildCategoryComparison(state, { mode: 'month', month: '2026-05' }, {
  text: '', categories: ['Comida'], view: 'spend'
});
assert.equal(categoryResult.rows.length, 1);
assert.equal(categoryResult.rows[0].name, 'Comida');
assert.equal(categoryResult.rows[0].spent, 80);
assert.equal(categoryResult.rows[0].previousSpent, 120);
assert.equal(categoryResult.rows[0].spentDelta, -40);
assert.equal(categoryResult.rows[0].spentDeltaPercent, -33.33333333333333);
console.log('comparison-analysis.test.mjs passed');
