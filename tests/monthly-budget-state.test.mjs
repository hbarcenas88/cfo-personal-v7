import assert from 'node:assert/strict';
import { createBaseBudgetDraft, createMonthlyBudgetDraft, copyBaseBudgetIntoDraft, addMonthlyBudgetCategory, updateMonthlyBudgetRow } from '../src/services/budgetPlanningService.js';

class MemoryIndexedDB {
  records = new Map();
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = { objectStoreNames: { contains: () => true }, createObjectStore: () => {}, transaction: () => this.transaction() };
      request.onsuccess?.();
    });
    return request;
  }
  transaction() {
    const tx = { objectStore: () => ({
      get: key => { const request = {}; queueMicrotask(() => { request.result = structuredClone(this.records.get(key)); request.onsuccess?.(); }); return request; },
      put: record => { queueMicrotask(() => {
        if (this.failWrite) { tx.error = new Error('quota'); tx.onerror?.(); }
        else { this.records.set(record.key, structuredClone(record)); tx.oncomplete?.(); }
      }); },
      clear: () => { this.records.clear(); queueMicrotask(() => tx.oncomplete?.()); }
    }) };
    return tx;
  }
}
const memory = new MemoryIndexedDB();
globalThis.indexedDB = memory;
globalThis.window = { clearTimeout: () => {}, setTimeout: () => 0, dispatchEvent: () => {} };
const module = await import('../src/state.js');
const { backupPayload } = await import('../src/services/backupService.js');
await module.initState();
assert.deepEqual(module.state.budgetTemplate, []);
module.state.categories = [{ id: 'food', name: 'Comida', icon: 'tag', subcategories: [] }];
const financial = structuredClone({ budgets: module.state.budgets, transactions: module.state.transactions, accounts: module.state.accounts });
let draft = createBaseBudgetDraft(module.state);
draft = updateMonthlyBudgetRow(draft, draft.rows[0].draftId, { amount: 200 });
draft = addMonthlyBudgetCategory(draft, 'Viajes').draft;
draft = updateMonthlyBudgetRow(draft, draft.rows.find(row => row.category === 'Viajes').draftId, { amount: 50 });
assert.deepEqual(await Promise.all([module.saveBaseBudgetDraft(draft), module.saveBaseBudgetDraft(draft)]), [true, false]);
assert.equal(module.state.budgetTemplate.length, 2);
assert.equal(module.state.categories.length, 2);
assert.ok(module.state.budgetTemplate.every(row => !Object.hasOwn(row, 'month')));
assert.deepEqual({ budgets: module.state.budgets, transactions: module.state.transactions, accounts: module.state.accounts }, financial);
assert.equal(await module.undo(), true);
assert.equal(module.state.budgetTemplate.length, 0);
assert.equal(module.state.categories.length, 1);
assert.equal(await module.saveBaseBudgetDraft(draft), true);
const backup = backupPayload(module.state);
assert.equal(backup.data.budgetTemplate.length, 2);
await module.initState();
assert.equal(module.state.budgetTemplate.length, 2);
assert.ok(module.state.budgetTemplate.every(row => !Object.hasOwn(row, 'month')));
await module.restoreSnapshot(backup.data);
assert.equal(module.state.budgetTemplate.length, 2);
let monthly = copyBaseBudgetIntoDraft(createMonthlyBudgetDraft(module.state, '2026-10'), module.state);
monthly = addMonthlyBudgetCategory(monthly, 'Salud').draft;
assert.equal(module.state.budgets.length, 0, 'Copy remains an uncommitted draft');
assert.equal(await module.saveMonthlyBudgetDraft(monthly), true);
assert.equal(module.state.budgets.length, 2);
assert.equal(module.state.categories.length, 3);
assert.equal(await module.undo(), true);
assert.equal(module.state.budgets.length, 0);
assert.equal(module.state.categories.length, 2);
const stable = backupPayload(module.state).data;
memory.failWrite = true;
assert.equal(await module.saveMonthlyBudgetDraft(monthly), false);
assert.deepEqual(backupPayload(module.state).data, stable);
const failureBase = updateMonthlyBudgetRow(createBaseBudgetDraft(module.state), module.state.budgetTemplate[0].id, { amount: 201 });
assert.equal(await module.saveBaseBudgetDraft(failureBase), false);
assert.deepEqual(backupPayload(module.state).data, stable);
memory.failWrite = false;
const baseEdited = updateMonthlyBudgetRow(createBaseBudgetDraft(module.state), module.state.budgetTemplate[0].id, { amount: 300 });
module.state.budgetTemplate[0].amount = 450;
assert.equal(await module.saveBaseBudgetDraft(baseEdited), false);
assert.equal(module.state.budgetTemplate[0].amount, 450);
assert.equal(await module.saveMonthlyBudgetDraft(createBaseBudgetDraft(module.state)), false);
assert.deepEqual(module.mergeState({ budgets: [], categories: [] }).budgetTemplate, [], 'Legacy backup remains compatible');
module.state.accounts = [{ id: 'bank', name: 'Caja', type: 'Cuenta Corriente', kpi: {}, order: 0 }];
module.state.categories = [{ id: 'food', name: 'Comida', subcategories: [{ id: 'sub', name: 'Mercado' }] }];
const importedMeta = { source: 'CSV', batchId: 'historical', sourceRow: 1, original: {}, resolutions: {}, importedAt: '2026-10-04T12:00:00Z' };
module.state.budgetTemplate = [{ id: 'base-reference', account: 'Caja', category: 'Comida', subcategory: 'Mercado', amount: 25, source: 'CSV', importMeta: importedMeta }];
module.state.budgets = [{ id: 'monthly-reference', month: '2026-10', account: 'Caja', category: 'Comida', subcategory: 'Mercado', amount: 30 }];
assert.equal(module.accountDeleteImpact('bank').templateRows, 1);
assert.equal(module.categoryDeleteImpact('food').templateRows, 1);
assert.equal(module.subcategoryDeleteImpact('food', 'Mercado').templateRows, 1);
assert.equal(module.accountDeleteImpact('missing').templateRows, 0);
assert.equal(module.categoryDeleteImpact('missing').templateRows, 0);
assert.equal(module.subcategoryDeleteImpact('missing', 'Mercado').templateRows, 0);
assert.equal(await module.updateAccount('bank', { name: 'Banco nuevo' }), true);
assert.equal(module.state.budgetTemplate[0].account, 'Banco nuevo');
assert.equal(module.state.budgets[0].account, 'Banco nuevo');
assert.equal(await module.updateCategory('food', { name: 'Alimentos' }), true);
assert.equal(module.state.budgetTemplate[0].category, 'Alimentos');
assert.equal(module.state.budgetTemplate[0].id, 'base-reference');
assert.deepEqual(module.state.budgetTemplate[0].importMeta, importedMeta);
assert.equal(await module.deleteSubcategory('food', 'Mercado'), true);
assert.equal(module.state.budgetTemplate[0].subcategory, '');
assert.equal(await module.undo(), true);
assert.equal(module.state.budgetTemplate[0].subcategory, 'Mercado');
assert.equal(await module.deleteCategory('food'), true);
assert.equal(module.state.budgetTemplate.length, 0);
assert.equal(module.state.budgets.length, 0);
assert.equal(await module.undo(), true);
assert.equal(module.state.budgetTemplate[0].id, 'base-reference');
assert.equal(await module.deleteAccount('bank'), true);
assert.equal(module.state.budgetTemplate.length, 0);
assert.equal(module.state.budgets.length, 0);
console.log('Monthly budget state tests passed');
