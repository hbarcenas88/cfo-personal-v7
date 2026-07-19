import assert from 'node:assert/strict';
import { buildAuditComparison, buildCategoryComparison } from '../src/services/financeService.js';
import { renderCategories } from '../src/screens/categories.js';

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
assert.deepEqual(state, before);

const categoryScreenState = view => ({
  ...structuredClone(state),
  period: { mode: 'month', month: '2026-05' },
  filters: {
    categories: { text: '', categories: [], view, expanded: [], compare: true }
  },
  ui: { categoryDropdown: false }
});
const comparedSpend = renderCategories(categoryScreenState('spend'));
assert.match(comparedSpend, /class="category-comparison-note"[^>]*>[^<]*vs\. período anterior:[\s\S]*?\$120\.00[\s\S]*?-\$40\.00[\s\S]*?-33\.3%/);
const noBaseSpend = renderCategories({
  ...categoryScreenState('spend'),
  filters: {
    categories: { text: '', categories: ['Transporte'], view: 'spend', expanded: [], compare: true }
  }
});
assert.match(noBaseSpend, /category-comparison-note[^>]*>vs\. período anterior: Sin base anterior/);
const comparedBudget = renderCategories(categoryScreenState('budget'));
assert.match(comparedBudget, /class="category-comparison-unavailable"[^>]*>La variación de gasto no está disponible en Solo presupuesto\./);
console.log('comparison-analysis.test.mjs passed');
