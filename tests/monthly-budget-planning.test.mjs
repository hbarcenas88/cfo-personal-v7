import assert from 'node:assert/strict';
import {
  createMonthlyBudgetDraft, copyMissingPreviousMonth, monthlyBudgetTotals,
  updateMonthlyBudgetRow, removeMonthlyBudgetRow, hasMonthlyBudgetChanges,
  validateMonthlyBudgetDraft, buildMonthlyBudgetChanges
} from '../src/services/budgetPlanningService.js';

const state = {
  categories: [{ name: 'Hogar', subcategories: ['Alquiler', { name: 'Agua' }] }],
  budgets: [
    { id: 'old-1', month: '2026-09', category: 'Hogar', subcategory: 'Alquiler', account: 'Caja', amount: 200, source: 'CSV', importMeta: { batchId: 'x' } },
    { id: 'old-2', month: '2026-09', category: 'Hogar', subcategory: 'Alquiler', account: 'Caja', amount: 30, source: 'CSV' },
    { id: 'old-3', month: '2026-09', category: 'Hogar', subcategory: 'Agua', account: 'Caja', amount: 50 },
    { id: 'current', month: '2026-10', category: 'Hogar', subcategory: 'Agua', account: 'Caja', amount: 70, source: 'CSV', importMeta: { batchId: 'y' } }
  ]
};
const snapshot = structuredClone(state);
let draft = createMonthlyBudgetDraft(state, '2026-10', { category: 'Hogar' });
assert.equal(draft.previousMonth, '2026-09');
assert.equal(draft.dirty, false);
assert.equal(hasMonthlyBudgetChanges(draft), false);
assert.deepEqual(draft.expandedCategories, ['Hogar']);
assert.equal(draft.rows.find(row => row.id === 'current').importMeta.batchId, 'y');
assert.equal(draft.rows.filter(row => row.subcategory === 'Alquiler').length, 1);
draft = copyMissingPreviousMonth(draft, state);
const copies = draft.rows.filter(row => row.subcategory === 'Alquiler' && row.amount !== '');
assert.equal(copies.length, 2);
assert.ok(copies.every(row => row.source === 'Manual' && !row.importMeta && row.id !== 'old-1'));
assert.equal(monthlyBudgetTotals(draft).total, 300);
assert.equal(monthlyBudgetTotals(draft).categories[0].previousTotal, 280);
assert.deepEqual(copyMissingPreviousMonth(draft, state), draft);
assert.equal(hasMonthlyBudgetChanges(draft), true);
assert.equal(validateMonthlyBudgetDraft(draft, state).ok, true);
const built = buildMonthlyBudgetChanges(draft, state);
assert.equal(built.ok, true);
assert.equal(built.budgets.length, 6);
assert.deepEqual(built.budgets.find(row => row.id === 'current'), state.budgets[3]);
assert.deepEqual(state, snapshot);

const empty = createMonthlyBudgetDraft({ ...state, budgets: [] }, '2026-10');
let planned = updateMonthlyBudgetRow(empty, empty.rows.find(row => row.subcategory === 'Alquiler').draftId, { amount: '200' });
planned = updateMonthlyBudgetRow(planned, planned.rows.find(row => row.subcategory === 'Agua').draftId, { amount: '50' });
assert.equal(monthlyBudgetTotals(planned).total, 250);
assert.equal(monthlyBudgetTotals(planned).categories[0].total, 250);
assert.equal(buildMonthlyBudgetChanges(planned, { ...state, budgets: [] }).budgets.length, 2);

const fresh = createMonthlyBudgetDraft(state, '2026-10');
const rowId = fresh.rows.find(row => row.id === 'current').draftId;
const edited = updateMonthlyBudgetRow(fresh, rowId, { amount: '90.25' });
assert.equal(buildMonthlyBudgetChanges(edited, state).budgets.find(row => row.id === 'current').amount, 90.25);
assert.equal(buildMonthlyBudgetChanges(edited, state).budgets.find(row => row.id === 'current').importMeta.batchId, 'y');
for (const amount of ['0', '', '-1', '1.001', 'abc', 'Infinity']) {
  assert.equal(validateMonthlyBudgetDraft(updateMonthlyBudgetRow(fresh, rowId, { amount }), state).ok, false, amount);
}
assert.equal(validateMonthlyBudgetDraft(updateMonthlyBudgetRow(fresh, rowId, { amount: '0,50' }), state).ok, true);
assert.equal(buildMonthlyBudgetChanges(removeMonthlyBudgetRow(fresh, rowId), state).budgets.length, 3);
const external = structuredClone(state);
external.budgets[3].amount = 99;
assert.equal(buildMonthlyBudgetChanges(edited, external).ok, false);
assert.equal(validateMonthlyBudgetDraft(edited, external).conflicts[0].id, 'current');
assert.equal(buildMonthlyBudgetChanges(fresh, external).budgets.find(row => row.id === 'current').amount, 99);
assert.equal(buildMonthlyBudgetChanges(edited, { ...state, budgets: state.budgets.slice(0, 3) }).ok, false);
const newSlot = empty.rows.find(row => !row.subcategory);
assert.equal(validateMonthlyBudgetDraft(updateMonthlyBudgetRow(empty, newSlot.draftId, { category: 'Nueva', amount: 10 }), state).ok, false);
assert.equal(createMonthlyBudgetDraft(state, '2026-01').previousMonth, '2025-12');
assert.throws(() => createMonthlyBudgetDraft(state, '2026-13'));
const sparseState = { ...state, budgets: [{ id: 'sparse', month: '2026-10', category: 'Histórica', amount: 25 }] };
const sparseDraft = createMonthlyBudgetDraft(sparseState, '2026-10');
assert.equal(hasMonthlyBudgetChanges(sparseDraft), false, 'Optional normalized fields do not make an existing row dirty');
const sparseEdited = updateMonthlyBudgetRow(sparseDraft, 'sparse', { amount: 26 });
assert.equal(buildMonthlyBudgetChanges(sparseEdited, sparseState).ok, true, 'Existing historical categories remain editable');
const concurrent = structuredClone(state);
concurrent.budgets.push({ id: 'concurrent', month: '2026-10', category: 'Hogar', amount: 42 });
assert.equal(buildMonthlyBudgetChanges(edited, concurrent).budgets.find(row => row.id === 'concurrent').amount, 42);
assert.equal(buildMonthlyBudgetChanges(edited, external).budgets.find(row => row.id === 'current').amount, 99, 'Failure returns unchanged current budgets');
assert.equal(hasMonthlyBudgetChanges(updateMonthlyBudgetRow(edited, rowId, { amount: '70.00' })), false);
console.log('Monthly budget planning tests passed');
