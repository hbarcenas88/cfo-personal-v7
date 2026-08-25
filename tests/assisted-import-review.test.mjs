import assert from 'node:assert/strict';
import {
  buildAssistedImportPlan,
  createImportReviewDraft,
  discardImportRow,
  approvePossibleDuplicate,
  resolveImportGroup
} from '../src/services/assistedImportService.js';

const state = {
  accounts: [{ id: 'account-cash', name: 'Efectivo' }],
  categories: [{
    id: 'category-food',
    name: 'Comida',
    subcategories: [{ id: 'subcategory-market', name: 'Mercado' }]
  }],
  transactions: [],
  budgets: []
};

function transaction(overrides = {}) {
  return {
    __row: 2,
    cuenta: 'Efectivo',
    categoria: 'Comida',
    subcategoria: 'Mercado',
    movimiento: 'Gasto',
    monto: '10.50',
    fecha: '2026-08-20',
    descripcion: 'Compra literal',
    ...overrides
  };
}

function group(draft, field, original) {
  return draft.groups.find(item => item.field === field && item.original === original);
}

function run(name, callback) {
  callback();
  process.stdout.write(`ok - ${name}\n`);
}

run('groups two equivalent new accounts, resolves both without changing originals, and builds a valid plan', () => {
  const draft = createImportReviewDraft('transactions', [
    transaction({ __row: 2, cuenta: 'Banco BAC' }),
    transaction({ __row: 3, cuenta: 'Banco BAC', monto: '25.00' })
  ], state, { batchId: 'batch-bac', importedAt: '2026-08-24T10:00:00.000Z' });
  const accountGroup = group(draft, 'account', 'banco bac');

  assert.equal(accountGroup.type, 'new');
  assert.equal(accountGroup.count, 2);
  assert.equal(draft.rows[0].status, 'unresolved');

  const resolved = resolveImportGroup(draft, accountGroup.id, {
    action: 'create',
    value: 'BAC principal'
  }, true);
  assert.deepEqual(resolved.rows.map(row => row.original.account), ['Banco BAC', 'Banco BAC']);
  assert.deepEqual(resolved.rows.map(row => row.resolved.account), ['BAC principal', 'BAC principal']);
  assert.deepEqual(resolved.rows.map(row => row.status), ['ready', 'ready']);

  const planResult = buildAssistedImportPlan(resolved, state);
  assert.equal(planResult.ok, true);
  assert.deepEqual(planResult.plan.catalogCreates.accounts, [{ name: 'BAC principal', type: 'Cuenta Corriente', openingBalance: 0 }]);
  assert.equal(planResult.plan.transactions.length, 2);
  assert.deepEqual(planResult.plan.duplicateWarnings, []);
});

run('canonical catalog matches resolve to display names and subcategories use their resolved category context', () => {
  const draft = createImportReviewDraft('transactions', [
    transaction({ cuenta: ' EFECTIVO ', categoria: ' comida ', subcategoria: ' mercado ' })
  ], state, { batchId: 'batch-matched' });

  assert.deepEqual(draft.rows[0].resolved, {
    account: 'Efectivo',
    category: 'Comida',
    subcategory: 'Mercado',
    movement: 'Gasto',
    amount: 10.5,
    date: '2026-08-20',
    month: ''
  });
  assert.equal(draft.rows[0].status, 'ready');
  assert.equal(draft.groups.length, 0);

  const contextual = createImportReviewDraft('transactions', [
    transaction({ categoria: 'Nueva categoría', subcategoria: 'Mercado' })
  ], state, { batchId: 'batch-context' });
  assert.equal(group(contextual, 'category', 'nueva categoria').type, 'new');
  assert.equal(group(contextual, 'subcategory', 'nueva categoria|mercado').type, 'new');
});

run('a one-row group action changes only its selected row', () => {
  const draft = createImportReviewDraft('transactions', [
    transaction({ __row: 2, cuenta: 'Banco BAC' }),
    transaction({ __row: 3, cuenta: 'Banco BAC' })
  ], state, { batchId: 'batch-one-row' });
  const accountGroup = group(draft, 'account', 'banco bac');
  const resolved = resolveImportGroup(draft, accountGroup.id, {
    action: 'create',
    value: 'BAC principal'
  }, false);

  assert.equal(resolved.rows[0].resolved.account, 'BAC principal');
  assert.equal(resolved.rows[0].status, 'ready');
  assert.equal(resolved.rows[1].resolved.account, '');
  assert.equal(resolved.rows[1].status, 'unresolved');
});

run('invalid amounts and dates, unknown movements, and transfers block plan construction', () => {
  const invalidAmount = createImportReviewDraft('transactions', [transaction({ monto: 'sin monto' })], state);
  const invalidDate = createImportReviewDraft('transactions', [transaction({ fecha: '2026-99-40' })], state);
  const unknownMovement = createImportReviewDraft('transactions', [transaction({ movimiento: 'Ajuste' })], state);
  const transfer = createImportReviewDraft('transactions', [transaction({ movimiento: 'Transferencia' })], state);

  assert.ok(invalidAmount.rows[0].issues.some(issue => issue.code === 'invalid' && issue.field === 'amount'));
  assert.ok(invalidDate.rows[0].issues.some(issue => issue.code === 'invalid' && issue.field === 'date'));
  assert.ok(unknownMovement.rows[0].issues.some(issue => issue.code === 'ambiguous' && issue.field === 'movement'));
  assert.ok(transfer.rows[0].issues.some(issue => issue.code === 'blocked' && issue.field === 'movement'));
  assert.equal(buildAssistedImportPlan(invalidAmount, state).ok, false);
  assert.equal(buildAssistedImportPlan(invalidDate, state).ok, false);
  assert.equal(buildAssistedImportPlan(unknownMovement, state).ok, false);
  assert.equal(buildAssistedImportPlan(transfer, state).ok, false);
});

run('discarding a row leaves a skipped row in the preliminary plan', () => {
  const draft = createImportReviewDraft('budgets', [{
    __row: 7,
    cuenta: 'Efectivo',
    categoria: 'Comida',
    subcategoria: 'Mercado',
    monto: '150',
    mes: '2026-08',
    descripcion: 'Presupuesto literal'
  }], state, { batchId: 'batch-budget' });
  const discarded = discardImportRow(draft, 7);
  const planResult = buildAssistedImportPlan(discarded, state);

  assert.equal(discarded.rows[0].status, 'discarded');
  assert.equal(planResult.ok, true);
  assert.deepEqual(planResult.plan.budgets, []);
  assert.deepEqual(planResult.plan.skippedRows, [7]);
});

run('requires account and category while leaving an absent optional subcategory valid', () => {
  const missingAccount = createImportReviewDraft('transactions', [transaction({ cuenta: '', subcategoria: '' })], state);
  const missingCategory = createImportReviewDraft('transactions', [transaction({ categoria: '', subcategoria: '' })], state);
  const optionalSubcategory = createImportReviewDraft('transactions', [transaction({ subcategoria: '' })], state);

  assert.ok(missingAccount.rows[0].issues.some(issue => issue.code === 'invalid' && issue.field === 'account'));
  assert.ok(missingCategory.rows[0].issues.some(issue => issue.code === 'invalid' && issue.field === 'category'));
  assert.equal(buildAssistedImportPlan(missingAccount, state).ok, false);
  assert.equal(buildAssistedImportPlan(missingCategory, state).ok, false);
  assert.equal(optionalSubcategory.rows[0].status, 'ready');
  assert.equal(buildAssistedImportPlan(optionalSubcategory, state).ok, true);
});

run('preflight-blocks every unsupported import kind before it can produce an empty plan', () => {
  const draft = createImportReviewDraft('recurring', [{ __row: 9, monto: '25' }], state);
  const planResult = buildAssistedImportPlan(draft, state);

  assert.equal(draft.rows[0].status, 'blocked');
  assert.ok(draft.rows[0].issues.some(issue => issue.code === 'blocked' && issue.field === 'kind'));
  assert.equal(planResult.ok, false);
  assert.ok(planResult.errors.some(error => error.issues.some(issue => issue.field === 'kind')));
});

run('does not emit a catalog create when a create resolution ends at an existing canonical value', () => {
  const draft = createImportReviewDraft('transactions', [transaction({ cuenta: 'Banco BAC' })], state);
  const accountGroup = group(draft, 'account', 'banco bac');
  const resolved = resolveImportGroup(draft, accountGroup.id, {
    action: 'create',
    value: ' efectivo '
  }, true);
  const planResult = buildAssistedImportPlan(resolved, state);

  assert.equal(planResult.ok, true);
  assert.deepEqual(planResult.plan.catalogCreates.accounts, []);
  assert.equal(planResult.plan.transactions[0].account, 'Efectivo');
});

run('blocks empty, null, and undefined kinds for empty or populated drafts', () => {
  const cases = [
    { kind: '', objects: [] },
    { kind: null, objects: [] },
    { kind: undefined, objects: [transaction()] }
  ];

  cases.forEach(({ kind, objects }) => {
    const draft = createImportReviewDraft(kind, objects, state);
    const planResult = buildAssistedImportPlan(draft, state);

    assert.equal(planResult.ok, false);
    assert.ok(planResult.errors.some(error => error.status === 'blocked'
      && error.issues.some(issue => issue.code === 'blocked' && issue.field === 'kind')));
    if (objects.length) {
      assert.equal(draft.rows[0].status, 'blocked');
      assert.ok(draft.rows[0].issues.some(issue => issue.code === 'blocked' && issue.field === 'kind'));
    }
  });
});

run('blocks a repeated import fingerprint for every retained row', () => {
  const duplicateState = {
    ...state,
    importBatches: [{ id: 'batch-original', fingerprint: 'same-fingerprint' }]
  };
  const draft = createImportReviewDraft('transactions', [transaction()], duplicateState, {
    batchId: 'batch-repeat',
    fingerprint: 'same-fingerprint'
  });

  assert.equal(draft.rows[0].status, 'blocked');
  assert.ok(draft.rows[0].issues.some(issue => issue.code === 'duplicateBatch'));
  assert.equal(buildAssistedImportPlan(draft, duplicateState).ok, false);
});

run('requires row-level approval for semantic duplicates and does not mutate draft or state', () => {
  const duplicateTransaction = {
    date: '2026-08-20',
    account: 'Efectivo',
    movement: 'Gasto',
    amount: 10.5,
    category: 'Comida',
    subcategory: 'Mercado',
    description: 'Compra literal'
  };
  const duplicateState = { ...state, transactions: [duplicateTransaction] };
  const draft = createImportReviewDraft('transactions', [transaction()], duplicateState, {
    batchId: 'batch-semantic'
  });
  const originalDraft = structuredClone(draft);

  assert.ok(draft.rows[0].issues.some(issue => issue.code === 'possibleDuplicate'));
  assert.equal(buildAssistedImportPlan(draft, duplicateState).ok, false);

  const approved = approvePossibleDuplicate(draft, 2);
  assert.notStrictEqual(approved, draft);
  assert.deepEqual(draft, originalDraft);
  assert.equal(approved.rows[0].status, 'ready');
  assert.equal(buildAssistedImportPlan(approved, duplicateState).ok, true);
  assert.equal(buildAssistedImportPlan(approved, duplicateState).plan.duplicateWarnings.length, 1);
  assert.deepEqual(duplicateState.transactions, [duplicateTransaction]);
});

run('flags equivalent rows within the incoming batch and requires approval for each row', () => {
  const draft = createImportReviewDraft('transactions', [
    transaction({ __row: 2 }),
    transaction({ __row: 3 })
  ], state, { batchId: 'batch-internal-duplicate' });

  assert.equal(draft.rows.every(row => row.issues.some(issue => issue.code === 'possibleDuplicate')), true);
  assert.equal(buildAssistedImportPlan(draft, state).ok, false);
  const approvedFirst = approvePossibleDuplicate(draft, 2);
  assert.equal(buildAssistedImportPlan(approvedFirst, state).ok, false);
  const approvedBoth = approvePossibleDuplicate(approvedFirst, 3);
  assert.equal(buildAssistedImportPlan(approvedBoth, state).ok, true);
});

run('freezes the final plan and deduplicates proposed catalog creates canonically', () => {
  const draft = createImportReviewDraft('transactions', [
    transaction({ __row: 2, cuenta: 'Banco Nuevo', categoria: 'Mascotas', subcategoria: 'Veterinario' }),
    transaction({ __row: 3, cuenta: ' banco  nuevo ', categoria: ' mascotas ', subcategoria: ' veterinario ', descripcion: 'Otra compra' })
  ], state, { batchId: 'batch-freeze' });
  const accountGroup = group(draft, 'account', 'banco nuevo');
  const categoryGroup = group(draft, 'category', 'mascotas');
  const subcategoryGroup = group(draft, 'subcategory', 'mascotas|veterinario');
  let resolved = resolveImportGroup(draft, accountGroup.id, { action: 'create', value: 'Cuenta Nueva' }, true);
  resolved = resolveImportGroup(resolved, categoryGroup.id, { action: 'create', value: 'Mascotas' }, true);
  resolved = resolveImportGroup(resolved, subcategoryGroup.id, { action: 'create', value: 'Veterinario' }, true);
  const result = buildAssistedImportPlan(resolved, state);

  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result.plan), true);
  assert.equal(Object.isFrozen(result.plan.catalogCreates.accounts), true);
  assert.deepEqual(result.plan.catalogCreates.accounts, [{ name: 'Cuenta Nueva', type: 'Cuenta Corriente', openingBalance: 0 }]);
  assert.deepEqual(result.plan.catalogCreates.categories, [{ name: 'Mascotas' }]);
  assert.deepEqual(result.plan.catalogCreates.subcategories, [{ category: 'Mascotas', name: 'Veterinario' }]);
  assert.equal(result.plan.decisions.every(decision => Number.isInteger(decision.sourceRow)), true);
});

run('preserves the selected account type in catalog creates', () => {
  const draft = createImportReviewDraft('transactions', [transaction({ __row: 2, cuenta: 'Cuenta nueva' })], state, { batchId: 'batch-account-type' });
  const accountGroup = group(draft, 'account', 'cuenta nueva');
  const resolved = resolveImportGroup(draft, accountGroup.id, {
    action: 'create',
    value: 'Cuenta nueva',
    typeName: 'Tarjeta de Crédito'
  }, true);
  const result = buildAssistedImportPlan(resolved, state);
  assert.equal(result.ok, true);
  assert.deepEqual(result.plan.catalogCreates.accounts, [{ name: 'Cuenta nueva', type: 'Tarjeta de Crédito', openingBalance: 0 }]);
});
