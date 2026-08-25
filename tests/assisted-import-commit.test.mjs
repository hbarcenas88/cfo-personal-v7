import assert from 'node:assert/strict';
import { normalizeBudget, normalizeImportMeta, normalizeTransaction } from '../src/services/financeService.js';
import { backupPayload } from '../src/services/backupService.js';
import { applyAssistedImportPlan, initialState, mergeState, mutate, state, subscribe, undoAssistedImportBatch } from '../src/state.js';

const fixtureState = {
  ...structuredClone(initialState),
  period: { mode: 'month', month: '2026-08' },
  accounts: [{ id: 'cash', name: 'Caja', type: 'Cuenta Corriente' }],
  categories: [{ id: 'food', name: 'Comida', subcategories: [{ id: 'market', name: 'Mercado' }] }]
};

const importedMeta = {
  batchId: 'batch-1',
  source: 'CSV',
  sourceRow: 2,
  original: { cuenta: 'Caja' },
  resolutions: { account: 'matched' },
  importedAt: '2026-08-24T12:00:00.000Z'
};

const imported = normalizeTransaction({
  date: '2026-08-20',
  account: 'Caja',
  movement: 'Gasto',
  amount: 12,
  importMeta: importedMeta
}, fixtureState);
assert.deepEqual(imported.importMeta, importedMeta);
assert.notEqual(imported.importMeta, importedMeta);
assert.notEqual(imported.importMeta.original, importedMeta.original);

const importedBudget = normalizeBudget({
  month: '2026-08',
  category: 'Comida',
  amount: 100,
  importMeta: importedMeta
}, fixtureState);
assert.deepEqual(importedBudget.importMeta, importedMeta);

const legacyTransaction = normalizeTransaction({ date: '2026-08-20', account: 'Caja', amount: 1, source: 'CSV' }, fixtureState);
const legacyBudget = normalizeBudget({ month: '2026-08', category: 'Comida', amount: 1, source: 'CSV' }, fixtureState);
assert.equal(legacyTransaction.importMeta, undefined);
assert.equal(legacyBudget.importMeta, undefined);
assert.equal(normalizeTransaction({ ...legacyTransaction, importMeta: null }, fixtureState).importMeta, undefined);
assert.equal(normalizeImportMeta({ source: 'CSV', batchId: '' }), undefined);
assert.equal(normalizeImportMeta({ ...importedMeta, sourceRow: '7' }).sourceRow, 7);
assert.equal(normalizeImportMeta({ ...importedMeta, sourceRow: '7.5' }), undefined);
assert.equal(normalizeImportMeta({ ...importedMeta, sourceRow: Number.MAX_SAFE_INTEGER + 1 }), undefined);

const batches = [{ id: 'batch-1', fingerprint: 'abc', kind: 'transactions', importedAt: importedMeta.importedAt }];
const payload = backupPayload({ ...fixtureState, importBatches: batches });
assert.deepEqual(payload.data.importBatches, batches);
assert.notEqual(payload.data.importBatches, batches);
payload.data.importBatches[0].id = 'changed';
assert.equal(batches[0].id, 'batch-1');

const legacyState = mergeState({
  ...fixtureState,
  transactions: [{ date: '2026-08-20', account: 'Caja', amount: 1 }],
  budgets: [{ month: '2026-08', category: 'Comida', amount: 5 }]
});
assert.deepEqual(legacyState.importBatches, []);
assert.equal(legacyState.transactions[0].importMeta, undefined);
assert.equal(legacyState.budgets[0].importMeta, undefined);

const restoredState = mergeState({
  ...fixtureState,
  importBatches: batches,
  transactions: [{ date: '2026-08-20', account: 'Caja', amount: 1, importMeta: importedMeta }],
  budgets: [{ month: '2026-08', category: 'Comida', amount: 5, importMeta: importedMeta }]
});
assert.deepEqual(restoredState.importBatches, batches);
assert.deepEqual(restoredState.transactions[0].importMeta, importedMeta);
assert.deepEqual(restoredState.budgets[0].importMeta, importedMeta);

const migratedBatchState = mergeState({
  ...fixtureState,
  importBatches: [
    { id: 7, fingerprint: 'numeric-id' },
    { id: 'numeric-fingerprint', fingerprint: 8 },
    { id: '', fingerprint: 'empty-id' },
    { id: 'empty-fingerprint', fingerprint: '' },
    { id: 'valid', fingerprint: 'valid', rowCount: -1, imported: 1.5, skipped: 'not-a-number' }
  ]
});
assert.deepEqual(migratedBatchState.importBatches, [{ id: 'valid', fingerprint: 'valid' }]);

class MemoryIndexedDB {
  constructor() {
    this.records = new Map();
    this.failWrites = false;
  }

  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        objectStoreNames: { contains: () => this.records.has('__created__') },
        createObjectStore: () => this.records.set('__created__', true),
        transaction: () => this.transaction()
      };
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }

  transaction() {
    const transaction = {
      objectStore: () => ({
        get: key => {
          const request = {};
          queueMicrotask(() => {
            request.result = structuredClone(this.records.get(key));
            request.onsuccess?.();
          });
          return request;
        },
        put: record => {
          if (this.failWrites) throw new Error('write failed');
          this.records.set(record.key, structuredClone(record));
          queueMicrotask(() => transaction.oncomplete?.());
        },
        clear: () => {
          this.records.clear();
          queueMicrotask(() => transaction.oncomplete?.());
        }
      })
    };
    return transaction;
  }
}

globalThis.indexedDB = new MemoryIndexedDB();
globalThis.window = { clearTimeout: () => {}, setTimeout: () => 0, dispatchEvent: () => {} };
state.accounts = [{ id: 'cash', name: 'Caja', type: 'Cuenta Corriente' }];
state.categories = [{ id: 'food', name: 'Comida', subcategories: [{ id: 'market', name: 'Mercado' }] }];
state.transactions = [];
state.budgets = [];
state.importBatches = [];
state.ui.undo = null;
let notifications = 0;
const unsubscribe = subscribe(() => { notifications += 1; });

const validTransactionRow = {
  sourceRow: 2,
  date: '2026-08-20',
  account: 'Caja',
  movement: 'Gasto',
  amount: 20,
  category: 'Comida',
  subcategory: 'Mercado',
  description: 'Consulta'
};
const validPlan = (overrides = {}) => ({
  batch: { id: 'batch-validation', fingerprint: 'fingerprint-validation', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [], subcategories: [] },
  transactions: [validTransactionRow],
  budgets: [],
  skippedRows: [],
  decisions: [],
  duplicateWarnings: [],
  ...overrides
});

const wrongKindArrays = await applyAssistedImportPlan(validPlan({
  batch: { ...validPlan().batch, kind: 'transactions' },
  budgets: [{ ...validTransactionRow, month: '2026-08' }]
}));
assert.equal(wrongKindArrays.ok, false, 'transaction batches must reject non-empty budget arrays');

const missingCatalogDeclaration = await applyAssistedImportPlan(validPlan({
  transactions: [{ ...validTransactionRow, account: 'Cuenta libre' }]
}));
assert.equal(missingCatalogDeclaration.ok, false, 'referenced new catalogs must be declared explicitly');

for (const malformedCatalogCreates of [null, [], { accounts: 'bad', categories: [], subcategories: [] }, { accounts: [{}], categories: [], subcategories: [] }, { accounts: [], categories: [], subcategories: [{ category: 'Comida' }] }]) {
  const malformedCatalogPlan = await applyAssistedImportPlan(validPlan({ catalogCreates: malformedCatalogCreates }));
  assert.equal(malformedCatalogPlan.ok, false, 'malformed catalogCreates must fail without throwing');
}

const importResult = await applyAssistedImportPlan({
  batch: { id: 'batch-commit', fingerprint: 'fingerprint-commit', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: {
    accounts: [{ name: 'BAC principal', type: 'Cuenta Corriente' }],
    categories: [{ name: 'Mascotas' }],
    subcategories: [{ category: 'Mascotas', name: 'Veterinario' }]
  },
  transactions: [{
    sourceRow: 2,
    date: '2026-08-20',
    account: 'BAC principal',
    movement: 'Gasto',
    amount: 20,
    category: 'Mascotas',
    subcategory: 'Veterinario',
    description: 'Consulta'
  }],
  budgets: [],
  skippedRows: [],
  decisions: [],
  duplicateWarnings: []
});
assert.deepEqual(importResult, { ok: true, imported: 1, createdAccounts: 1, createdCategories: 1, createdSubcategories: 1, skipped: 0 });
assert.equal(state.transactions.length, 1);
assert.equal(state.transactions[0].importMeta.batchId, 'batch-commit');
assert.equal(state.importBatches.length, 1);
assert.equal(notifications, 1, 'atomic import emits one update');

const beforeMalformed = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches });
const malformedResult = await applyAssistedImportPlan({ batch: { id: 'bad', fingerprint: 'bad', kind: 'transactions' }, transactions: [{ sourceRow: 3, amount: 'not-a-number' }], budgets: [], catalogCreates: {}, skippedRows: [], decisions: [], duplicateWarnings: [] });
assert.equal(malformedResult.ok, false);
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches }, beforeMalformed, 'malformed plans do not partially mutate state');
assert.equal(notifications, 1, 'failed import does not notify');

const beforeStorageFailure = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, importBatches: state.importBatches });
globalThis.indexedDB.failWrites = true;
const storageFailure = await applyAssistedImportPlan({
  batch: { id: 'batch-storage-failure', fingerprint: 'fingerprint-storage-failure', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [], subcategories: [] },
  transactions: [{ sourceRow: 4, date: '2026-08-21', account: 'Caja', movement: 'Gasto', amount: 5, category: 'Comida', subcategory: 'Mercado', description: 'No guardar' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
globalThis.indexedDB.failWrites = false;
assert.equal(storageFailure.ok, false);
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, importBatches: state.importBatches }, beforeStorageFailure, 'storage failure leaves state unchanged');

assert.deepEqual(await undoAssistedImportBatch('batch-commit'), { ok: true, undone: true });
assert.equal(state.transactions.length, 0);
assert.equal(state.accounts.some(account => account.name === 'BAC principal'), false);
assert.equal(state.categories.some(category => category.name === 'Mascotas'), false);
assert.equal(state.importBatches.length, 0);
assert.equal(notifications, 2, 'undo emits one update');

const guarded = await applyAssistedImportPlan({
  batch: { id: 'batch-guard', fingerprint: 'fingerprint-guard', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [], subcategories: [] },
  transactions: [{ sourceRow: 5, date: '2026-08-22', account: 'Caja', movement: 'Gasto', amount: 6, category: 'Comida', subcategory: 'Mercado', description: 'Editado' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(guarded.ok, true);
await mutate(current => {
  current.transactions.at(-1).description = 'Cambio posterior';
  current.transactions.at(-1).updatedAt = new Date(Date.now() + 1000).toISOString();
});
const guardedUndo = await undoAssistedImportBatch('batch-guard');
assert.equal(guardedUndo.ok, false, 'undo must refuse a later related edit');

const missingRecordBatch = await applyAssistedImportPlan({
  batch: { id: 'batch-missing-record', fingerprint: 'fingerprint-missing-record', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [], subcategories: [] },
  transactions: [{ sourceRow: 6, date: '2026-08-23', account: 'Caja', movement: 'Gasto', amount: 7, category: 'Comida', subcategory: 'Mercado', description: 'Falta' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(missingRecordBatch.ok, true);
state.transactions = state.transactions.filter(row => row.importMeta?.batchId !== 'batch-missing-record');
const missingRecordUndo = await undoAssistedImportBatch('batch-missing-record');
assert.equal(missingRecordUndo.ok, false, 'undo must refuse when an imported record is missing');

const catalogGuardBatch = await applyAssistedImportPlan({
  batch: { id: 'batch-catalog-guard', fingerprint: 'fingerprint-catalog-guard', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [{ name: 'Cuenta temporal' }], categories: [{ name: 'Categoría temporal' }], subcategories: [{ category: 'Categoría temporal', name: 'Sub temporal' }] },
  transactions: [{ sourceRow: 7, date: '2026-08-24', account: 'Cuenta temporal', movement: 'Gasto', amount: 8, category: 'Categoría temporal', subcategory: 'Sub temporal', description: 'Catálogo' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(catalogGuardBatch.ok, true);
state.categories.find(category => category.name === 'Categoría temporal').name = 'Categoría renombrada';
const catalogGuardUndo = await undoAssistedImportBatch('batch-catalog-guard');
assert.equal(catalogGuardUndo.ok, false, 'undo must refuse edited created catalogs');

const extraRowBatch = await applyAssistedImportPlan({
  batch: { id: 'batch-extra-row', fingerprint: 'fingerprint-extra-row', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [], subcategories: [] },
  transactions: [{ sourceRow: 8, date: '2026-08-24', account: 'Caja', movement: 'Gasto', amount: 9, category: 'Comida', subcategory: 'Mercado', description: 'Original' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(extraRowBatch.ok, true);
const beforeExtraRowUndo = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches });
state.transactions.push({ ...structuredClone(state.transactions.at(-1)), id: 'extra-row', importMeta: { ...structuredClone(state.transactions.at(-1).importMeta), batchId: 'batch-extra-row' } });
const extraRowStateAfterEdit = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches });
const extraRowUndo = await undoAssistedImportBatch('batch-extra-row');
assert.equal(extraRowUndo.ok, false, 'undo must refuse an extra record with the same batchId');
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches }, extraRowStateAfterEdit, 'rejected undo must not mutate any state');
state.transactions = state.transactions.filter(row => row.id !== 'extra-row');
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches }, beforeExtraRowUndo, 'rejected undo must preserve state after removing only the test fixture');
assert.deepEqual(await undoAssistedImportBatch('batch-extra-row'), { ok: true, undone: true });

const accountPropertyBatch = await applyAssistedImportPlan({
  batch: { id: 'batch-account-property', fingerprint: 'fingerprint-account-property', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [{ name: 'Cuenta con propiedades', type: 'Cuenta Ahorro', icon: 'wallet', color: '#123456' }], categories: [], subcategories: [] },
  transactions: [{ sourceRow: 9, date: '2026-08-24', account: 'Cuenta con propiedades', movement: 'Gasto', amount: 10, category: 'Comida', subcategory: 'Mercado', description: 'Cuenta' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(accountPropertyBatch.ok, true);
assert.equal(state.accounts.find(account => account.name === 'Cuenta con propiedades').openingBalance, 0, 'imported accounts declare a zero opening balance without creating an adjustment');
state.accounts.find(account => account.name === 'Cuenta con propiedades').color = '#654321';
const accountStateAfterEdit = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches });
const accountPropertyUndo = await undoAssistedImportBatch('batch-account-property');
assert.equal(accountPropertyUndo.ok, false, 'undo must refuse an edited property of a created account');
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches }, accountStateAfterEdit, 'rejected account undo must not mutate state');
state.accounts = state.accounts.filter(account => account.name !== 'Cuenta con propiedades');
state.transactions = state.transactions.filter(row => row.importMeta?.batchId !== 'batch-account-property');
state.importBatches = state.importBatches.filter(batch => batch.id !== 'batch-account-property');

const categoryPropertyBatch = await applyAssistedImportPlan({
  batch: { id: 'batch-category-property', fingerprint: 'fingerprint-category-property', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [], categories: [{ name: 'Categoría con propiedades', icon: 'star', color: '#abcdef' }], subcategories: [{ category: 'Categoría con propiedades', name: 'Sub propiedad' }] },
  transactions: [{ sourceRow: 10, date: '2026-08-24', account: 'Caja', movement: 'Gasto', amount: 11, category: 'Categoría con propiedades', subcategory: 'Sub propiedad', description: 'Categoría' }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.equal(categoryPropertyBatch.ok, true);
const categoryWithProperties = state.categories.find(category => category.name === 'Categoría con propiedades');
categoryWithProperties.color = '#fedcba';
categoryWithProperties.subcategories[0].icon = 'tag';
const categoryStateAfterEdit = structuredClone({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches });
const categoryPropertyUndo = await undoAssistedImportBatch('batch-category-property');
assert.equal(categoryPropertyUndo.ok, false, 'undo must refuse edited properties of a created category or subcategory');
assert.deepEqual({ accounts: state.accounts, categories: state.categories, transactions: state.transactions, budgets: state.budgets, importBatches: state.importBatches }, categoryStateAfterEdit, 'rejected category undo must not mutate state');
state.categories = state.categories.filter(category => category.name !== 'Categoría con propiedades');
state.transactions = state.transactions.filter(row => row.importMeta?.batchId !== 'batch-category-property');
state.importBatches = state.importBatches.filter(batch => batch.id !== 'batch-category-property');

unsubscribe();

console.log('assisted-import-commit.test.mjs passed');
