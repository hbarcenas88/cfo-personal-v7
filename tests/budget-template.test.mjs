import assert from 'node:assert/strict';
import { createBaseBudgetDraft, createMonthlyBudgetDraft, copyBaseBudgetIntoDraft, addMonthlyBudgetCategory, updateMonthlyBudgetRow, buildMonthlyBudgetChanges, hasMonthlyBudgetChanges } from '../src/services/budgetPlanningService.js';

const state = { categories: [{ id: 'food', name: 'Comida', subcategories: ['Mercado'] }], budgets: [{ id: 'actual', month: '2026-10', category: 'Comida', subcategory: '', account: 'Caja', amount: 10 }], budgetTemplate: [
  { id: 'base1', category: 'Comida', subcategory: 'Mercado', account: 'Caja', amount: 200, source: 'Manual' },
  { id: 'base2', category: 'Comida', subcategory: 'Mercado', account: 'Caja', amount: 50, source: 'Manual' },
  { id: 'base3', category: 'Comida', subcategory: '', account: 'Caja', amount: 70, source: 'Manual' }
] };
const before = structuredClone(state);
let base = createBaseBudgetDraft(state);
assert.equal(base.mode, 'base');
assert.equal(base.month, '');
assert.equal(base.previousMonth, '');
assert.equal(hasMonthlyBudgetChanges(base), false);
base = updateMonthlyBudgetRow(base, 'base1', { amount: 201 });
const result = buildMonthlyBudgetChanges(base, state);
assert.equal(result.ok, true);
assert.equal(result.budgets.find(row => row.id === 'base1').amount, 201);
assert.ok(result.budgets.every(row => !Object.hasOwn(row, 'month')));
assert.deepEqual(state, before, 'Editing base cannot alter live monthly plans');

let draft = createMonthlyBudgetDraft(state, '2026-10');
draft = copyBaseBudgetIntoDraft(draft, state);
assert.equal(draft.rows.filter(row => row.subcategory === 'Mercado' && row.amount !== '').length, 2);
assert.deepEqual(copyBaseBudgetIntoDraft(draft, state), draft);
assert.equal(draft.rows.find(row => row.id === 'actual').amount, 10);
assert.ok(draft.rows.filter(row => row.subcategory === 'Mercado').every(row => row.source === 'Manual' && !row.importMeta && row.id !== 'base1' && row.id !== 'base2'));
assert.equal(buildMonthlyBudgetChanges(draft, state).budgets.length, 3);
assert.deepEqual(state, before);

const added = addMonthlyBudgetCategory(draft, '  Viajes  ');
assert.equal(added.ok, true);
assert.equal(added.draft.newCategories[0].name, 'Viajes');
assert.equal(added.draft.newCategories[0].subcategories.length, 0);
assert.equal(addMonthlyBudgetCategory(added.draft, 'vIaJeS').ok, false);
assert.equal(addMonthlyBudgetCategory(draft, 'comida').ok, false);
assert.equal(addMonthlyBudgetCategory(draft, '').ok, false);
let newCategoryDraft = added.draft;
const slot = newCategoryDraft.rows.find(row => row.category === 'Viajes');
newCategoryDraft = updateMonthlyBudgetRow(newCategoryDraft, slot.draftId, { amount: '100' });
assert.equal(buildMonthlyBudgetChanges(newCategoryDraft, state).ok, true);
assert.equal(buildMonthlyBudgetChanges(newCategoryDraft, state).categories.length, 2);
assert.equal(buildMonthlyBudgetChanges(newCategoryDraft, { ...state, categories: [...state.categories, { id: 'race', name: 'VIAJES', subcategories: [] }] }).ok, false);
const changedBase = { ...state, budgetTemplate: state.budgetTemplate.map(row => row.id === 'base1' ? { ...row, amount: 900 } : row) };
assert.equal(buildMonthlyBudgetChanges(base, changedBase).ok, false);
assert.equal(buildMonthlyBudgetChanges(createBaseBudgetDraft(state), changedBase).budgets[0].amount, 900, 'Unchanged rows preserve newer data');
console.log('Budget template tests passed');
