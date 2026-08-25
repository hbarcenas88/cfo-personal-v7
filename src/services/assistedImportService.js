import { canon, parseAmount, parseDate, parseMonth } from '../utils/format.js';

const transactionKinds = new Set(['transactions', 'transaction']);
const budgetKinds = new Set(['budgets', 'budget']);

export function createImportReviewDraft(kind, objects = [], state = {}, options = {}) {
  const normalizedKind = normalizeKind(kind);
  const rows = objects.map((object, index) => createRow(normalizedKind, object, index, state));
  const draft = {
    kind: normalizedKind,
    batchId: options.batchId || deterministicBatchId(normalizedKind, objects),
    importedAt: options.importedAt || '',
    fingerprint: options.fingerprint || fingerprint(normalizedKind, objects),
    rows,
    groups: [],
    summary: {}
  };
  return rebuildDraft(draft, state);
}

export function resolveImportGroup(draft, groupId, resolution, applyToEquivalent) {
  const next = cloneDraft(draft);
  const reviewGroup = next.groups.find(group => group.id === groupId);
  if (!reviewGroup) return next;

  const selectedRows = next.rows.filter(row => reviewGroup.sourceRows.includes(row.sourceRow));
  const targetSourceRow = resolution?.sourceRow;
  const targetRows = applyToEquivalent === true
    ? selectedRows
    : selectedRows.filter(row => row.sourceRow === targetSourceRow).length
      ? selectedRows.filter(row => row.sourceRow === targetSourceRow)
      : selectedRows.slice(0, 1);
  const decision = normalizeResolution(resolution);

  targetRows.forEach(row => {
    if (!decision.value) return;
    row.resolved[reviewGroup.field] = decision.value;
    row.decisions = row.decisions.filter(item => item.field !== reviewGroup.field);
    row.decisions.push({
      field: reviewGroup.field,
      action: decision.action,
      value: decision.value,
      ...(decision.type ? { type: decision.type } : {})
    });
    row.issues = row.issues.filter(issue => issue.field !== reviewGroup.field);
    row.status = statusFor(row.issues);
  });
  return regroupDraft(next);
}

export function discardImportRow(draft, sourceRow) {
  const next = cloneDraft(draft);
  const row = next.rows.find(item => item.sourceRow === sourceRow);
  if (!row) return next;
  row.status = 'discarded';
  row.decisions = row.decisions.filter(item => item.field !== 'row');
  row.decisions.push({ field: 'row', action: 'discard' });
  return regroupDraft(next);
}

export function approvePossibleDuplicate(draft, sourceRow) {
  const next = cloneDraft(draft);
  const row = next.rows.find(item => item.sourceRow === sourceRow);
  if (!row || !row.possibleDuplicate || row.possibleDuplicate.kind !== 'semantic') return next;
  row.decisions = row.decisions.filter(item => item.field !== 'row' || item.action !== 'approveDuplicate');
  row.decisions.push({ field: 'row', action: 'approveDuplicate', value: 'semantic' });
  row.issues = row.issues.filter(issue => issue.code !== 'possibleDuplicate');
  row.status = statusFor(row.issues);
  return regroupDraft(next);
}

export function buildAssistedImportPlan(draft, state = {}) {
  if (!supportedKind(draft.kind)) {
    return {
      ok: false,
      errors: [{
        sourceRow: null,
        status: 'blocked',
        issues: [{ code: 'blocked', field: 'kind', value: String(draft.kind || ''), context: '' }]
      }]
    };
  }
  const review = rebuildDraft(cloneDraft(draft), state);
  if (hasRepeatedFingerprint(review, state)) {
    return {
      ok: false,
      errors: [{
        sourceRow: null,
        status: 'blocked',
        issues: [{ code: 'duplicateBatch', field: 'fingerprint', value: review.fingerprint, context: '' }]
      }]
    };
  }
  const retainedRows = review.rows.filter(row => row.status !== 'discarded');
  const errors = retainedRows
    .filter(row => row.status !== 'ready')
    .map(row => ({ sourceRow: row.sourceRow, status: row.status, issues: row.issues }));
  if (errors.length) return { ok: false, errors };

  const plan = {
    batch: {
      id: review.batchId,
      kind: review.kind,
      batchId: review.batchId,
      importedAt: review.importedAt,
      fingerprint: review.fingerprint
    },
    catalogCreates: catalogCreates(review.rows, state),
    transactions: transactionKinds.has(review.kind) ? retainedRows.map(row => transactionPlan(row, review)) : [],
    budgets: budgetKinds.has(review.kind) ? retainedRows.map(row => budgetPlan(row, review)) : [],
    skippedRows: review.rows.filter(row => row.status === 'discarded').map(row => row.sourceRow),
    decisions: review.rows.flatMap(row => row.decisions.map(decision => ({ sourceRow: row.sourceRow, ...decision }))),
    duplicateWarnings: retainedRows
      .filter(row => row.possibleDuplicate?.kind === 'semantic')
      .map(row => ({
        sourceRow: row.sourceRow,
        key: row.possibleDuplicate.key,
        matches: row.possibleDuplicate.matches.map(match => ({ ...match }))
      }))
  };
  return { ok: true, plan: freezeImportPlan(plan) };
}

function createRow(kind, object, index, state) {
  const original = originalValues(object);
  const row = {
    sourceRow: object?.sourceRow ?? object?.__row ?? index + 2,
    original,
    resolved: {
      account: '',
      category: '',
      subcategory: '',
      movement: '',
      amount: NaN,
      date: '',
      month: ''
    },
    possibleDuplicate: null,
    issues: [],
    decisions: [],
    status: 'unresolved'
  };
  return evaluateRow(row, kind, state);
}

function rebuildDraft(draft, state) {
  const rows = draft.rows.map(row => evaluateRow(row, draft.kind, state));
  applyDuplicateIssues(rows, draft, state);
  return {
    ...draft,
    rows,
    groups: buildGroups(rows),
    summary: summarize(rows)
  };
}

function evaluateRow(row, kind, state) {
  const next = {
    ...row,
    original: { ...row.original },
    resolved: { ...row.resolved },
    decisions: row.decisions.map(decision => ({ ...decision })),
    issues: []
  };
  if (hasDecision(next, 'row', 'discard')) {
    next.status = 'discarded';
    return next;
  }

  if (!supportedKind(kind)) {
    addIssue(next, 'blocked', 'kind', kind);
    next.status = 'blocked';
    return next;
  }

  evaluateCatalogField(next, 'account', state.accounts || []);
  evaluateCategory(next, state.categories || []);
  evaluateSubcategory(next, state.categories || []);
  if (transactionKinds.has(kind)) evaluateMovement(next);
  evaluateFormats(next, kind);
  next.status = statusFor(next.issues);
  return next;
}

function applyDuplicateIssues(rows, draft, state) {
  const repeatedBatch = hasRepeatedFingerprint(draft, state);
  const existingRecords = draft.kind === 'transactions'
    ? state.transactions || []
    : state.budgets || [];
  const seen = new Map();

  rows.forEach(row => {
    row.possibleDuplicate = null;
    if (row.status === 'discarded') return;
    if (repeatedBatch) {
      addIssue(row, 'duplicateBatch', 'fingerprint', draft.fingerprint);
      row.status = 'blocked';
      return;
    }
    if (row.status !== 'ready') return;
    const key = semanticDuplicateKey(row, draft.kind);
    if (!key) return;
    const matches = existingRecords
      .filter(record => semanticDuplicateKey(record, draft.kind) === key)
      .map(record => ({ id: record.id || '', date: record.date || record.month || '', description: record.description || '' }));
    const sameBatch = seen.get(key) || [];
    if (sameBatch.length) matches.push(...sameBatch);
    if (!matches.length) {
      seen.set(key, [{ sourceRow: row.sourceRow }]);
      return;
    }
    sameBatch.forEach(previous => {
      const previousRow = rows.find(candidate => candidate.sourceRow === previous.sourceRow);
      if (!previousRow || previousRow.possibleDuplicate) return;
      previousRow.possibleDuplicate = { kind: 'semantic', key, matches: [...matches, { sourceRow: previousRow.sourceRow }] };
      if (!hasDecision(previousRow, 'row', 'approveDuplicate')) {
        addIssue(previousRow, 'possibleDuplicate', 'row', previousRow.sourceRow, key);
        previousRow.status = 'unresolved';
      }
    });
    row.possibleDuplicate = { kind: 'semantic', key, matches };
    if (!hasDecision(row, 'row', 'approveDuplicate')) {
      addIssue(row, 'possibleDuplicate', 'row', row.sourceRow, key);
      row.status = 'unresolved';
    }
    seen.set(key, [...sameBatch, { sourceRow: row.sourceRow }]);
  });
}

function semanticDuplicateKey(value, kind) {
  const resolved = value.resolved || value;
  const original = value.original || value;
  const date = parseDate(resolved.date || value.date || '') || (kind === 'budgets' ? parseMonth(resolved.month || value.month || '') : '');
  const amount = Number(resolved.amount ?? value.amount);
  const category = canon(resolved.category || value.category);
  const fields = [
    date,
    canon(resolved.account || value.account),
    Number.isFinite(amount) ? amount.toFixed(2) : '',
    category,
    canon(resolved.subcategory || value.subcategory),
    canon(resolved.description ?? original.description)
  ];
  if (kind === 'transactions') fields.splice(3, 0, canon(resolved.movement || value.movement || value.type));
  if (!date || !Number.isFinite(amount) || !fields[1] || !category) return '';
  return fields.join('|');
}

function hasRepeatedFingerprint(draft, state) {
  return Boolean(draft.fingerprint)
    && (state.importBatches || []).some(batch => batch?.fingerprint === draft.fingerprint);
}

function evaluateCatalogField(row, field, catalog) {
  const original = row.original[field];
  if (!canon(original)) {
    row.resolved[field] = '';
    addIssue(row, 'invalid', field, original);
    return;
  }
  const decision = decisionFor(row, field);
  const candidate = decision?.value || original;
  const match = catalog.find(item => canon(item.name || item) === canon(candidate));
  if (match) {
    row.resolved[field] = match.name || match;
    return;
  }
  if (decision?.action === 'create' && canon(candidate)) {
    row.resolved[field] = String(candidate).trim();
    return;
  }
  row.resolved[field] = '';
  addIssue(row, 'new', field, original);
}

function evaluateCategory(row, categories) {
  evaluateCatalogField(row, 'category', categories);
}

function evaluateSubcategory(row, categories) {
  const original = row.original.subcategory;
  if (!canon(original)) return;
  const categoryDecision = decisionFor(row, 'category');
  const categoryValue = row.resolved.category;
  const category = categories.find(item => canon(item.name || item) === canon(categoryValue));
  const decision = decisionFor(row, 'subcategory');
  const candidate = decision?.value || original;
  const subcategories = category?.subcategories || [];
  const match = subcategories.find(item => canon(item.name || item) === canon(candidate));
  if (match) {
    row.resolved.subcategory = match.name || match;
    return;
  }
  if ((category || categoryDecision?.action === 'create') && decision?.action === 'create' && canon(candidate)) {
    row.resolved.subcategory = String(candidate).trim();
    return;
  }
  row.resolved.subcategory = '';
  addIssue(row, 'new', 'subcategory', original, categoryIdentity(row));
}

function evaluateMovement(row) {
  const original = row.original.movement;
  const originalKey = canon(original);
  if (blockedMovement(originalKey)) {
    row.resolved.movement = '';
    addIssue(row, 'blocked', 'movement', original);
    return;
  }
  const decision = decisionFor(row, 'movement');
  const movement = recognizedMovement(decision?.value || original);
  if (!movement) {
    row.resolved.movement = '';
    addIssue(row, 'ambiguous', 'movement', original);
    return;
  }
  row.resolved.movement = movement;
}

function evaluateFormats(row, kind) {
  const amount = parseAmount(decisionFor(row, 'amount')?.value ?? row.original.amount);
  row.resolved.amount = amount;
  if (!Number.isFinite(amount)) addIssue(row, 'invalid', 'amount', row.original.amount);
  if (transactionKinds.has(kind)) {
    const date = parseDate(decisionFor(row, 'date')?.value ?? row.original.date);
    row.resolved.date = date;
    row.resolved.month = '';
    if (!date) addIssue(row, 'invalid', 'date', row.original.date);
  }
  if (budgetKinds.has(kind)) {
    const monthValue = decisionFor(row, 'month')?.value ?? (row.original.month || row.original.date);
    const month = parseMonth(monthValue);
    row.resolved.month = month;
    row.resolved.date = '';
    if (!month) addIssue(row, 'invalid', 'month', row.original.month || row.original.date);
  }
}

function buildGroups(rows) {
  const groups = new Map();
  rows.forEach(row => {
    if (row.status === 'discarded') return;
    row.issues.forEach(issue => {
      const key = issue.field === 'subcategory'
        ? `${issue.field}:${issue.context}:${canon(issue.value)}`
        : `${issue.field}:${canon(issue.value)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          field: issue.field,
          original: issue.field === 'subcategory' ? `${issue.context}|${canon(issue.value)}` : canon(issue.value),
          context: issue.context || '',
          type: issue.code,
          count: 0,
          sourceRows: []
        });
      }
      const group = groups.get(key);
      group.count += 1;
      group.sourceRows.push(row.sourceRow);
    });
  });
  return [...groups.values()];
}

function catalogCreates(rows, state) {
  const accounts = uniqueCreates(rows, 'account', state.accounts || []);
  const categories = uniqueCreates(rows, 'category', state.categories || []).map(name => ({ name }));
  const subcategories = uniqueSubcategoryCreates(rows, state.categories || []).map(item => ({
    category: item.category,
    name: item.name
  }));
  return { accounts, categories, subcategories };
}

function uniqueCreates(rows, field, catalog) {
  const values = new Map();
  rows.forEach(row => {
    if (row.status !== 'ready') return;
    const decision = decisionFor(row, field);
    if (decision?.action !== 'create') return;
    const value = row.resolved[field];
    if (!canon(value)) return;
    if (catalog.some(item => canon(item.name || item) === canon(value))) return;
    values.set(canon(value), field === 'account'
      ? { name: value, type: decision?.type || 'Cuenta Corriente', openingBalance: 0 }
      : value);
  });
  return [...values.values()];
}

function uniqueSubcategoryCreates(rows, categories) {
  const values = new Map();
  rows.forEach(row => {
    if (row.status !== 'ready') return;
    const decision = decisionFor(row, 'subcategory');
    if (decision?.action !== 'create') return;
    const category = categories.find(item => canon(item.name || item) === canon(row.resolved.category));
    const value = row.resolved.subcategory;
    if (!canon(value)) return;
    if (category?.subcategories?.some(item => canon(item.name || item) === canon(value))) return;
    const item = { category: row.resolved.category, name: value };
    values.set(`${canon(item.category)}|${canon(item.name)}`, item);
  });
  return [...values.values()];
}

function transactionPlan(row, review) {
  return {
    sourceRow: row.sourceRow,
    account: row.resolved.account,
    category: row.resolved.category,
    subcategory: row.resolved.subcategory,
    movement: row.resolved.movement,
    amount: row.resolved.amount,
    date: row.resolved.date,
    description: row.original.description,
    importMeta: importMetaFor(row, review)
  };
}

function budgetPlan(row, review) {
  return {
    sourceRow: row.sourceRow,
    account: row.resolved.account,
    category: row.resolved.category,
    subcategory: row.resolved.subcategory,
    amount: row.resolved.amount,
    month: row.resolved.month,
    description: row.original.description,
    importMeta: importMetaFor(row, review)
  };
}

function importMetaFor(row, review) {
  return {
    source: 'CSV',
    batchId: review.batchId,
    sourceRow: row.sourceRow,
    original: { ...row.original },
    resolutions: Object.fromEntries(row.decisions.map(decision => [decision.field, { action: decision.action, value: decision.value }])),
    importedAt: review.importedAt || new Date().toISOString()
  };
}

function originalValues(object = {}) {
  return {
    account: valueFor(object, ['cuenta', 'account']),
    category: valueFor(object, ['categoria', 'category']),
    subcategory: valueFor(object, ['subcategoria', 'subcategory']),
    movement: valueFor(object, ['movimiento', 'movement', 'tipo', 'type']),
    amount: valueFor(object, ['monto', 'amount']),
    date: valueFor(object, ['fecha', 'date']),
    month: valueFor(object, ['mes', 'month']),
    description: valueFor(object, ['descripcion', 'description'])
  };
}

function valueFor(object, keys) {
  const key = keys.find(name => object[name] !== undefined && object[name] !== null);
  return key ? String(object[key]) : '';
}

function addIssue(row, code, field, value, context = '') {
  row.issues.push({ code, field, value: String(value ?? ''), context });
}

function statusFor(issues) {
  if (issues.some(issue => issue.code === 'blocked')) return 'blocked';
  if (issues.some(issue => issue.code === 'invalid')) return 'invalid';
  return issues.length ? 'unresolved' : 'ready';
}

function recognizedMovement(value) {
  const key = canon(value);
  if (key === 'ingreso') return 'Ingreso';
  if (key === 'gasto') return 'Gasto';
  return '';
}

function blockedMovement(key) {
  return key.includes('transfer') || key.includes('provision') || key.includes('presupuesto');
}

function categoryIdentity(row) {
  const category = row.resolved.category || row.original.category;
  return canon(category);
}

function decisionFor(row, field) {
  return row.decisions.find(item => item.field === field);
}

function hasDecision(row, field, action) {
  return row.decisions.some(item => item.field === field && item.action === action);
}

function normalizeResolution(resolution) {
  if (typeof resolution === 'string') return { action: 'match', value: resolution };
  return {
    action: resolution?.action || resolution?.mode || resolution?.type || 'match',
    value: String(resolution?.value ?? resolution?.name ?? resolution?.resolved ?? resolution?.to ?? '').trim(),
    type: String(resolution?.typeName ?? resolution?.accountType ?? '').trim()
  };
}

function normalizeKind(kind) {
  const value = canon(kind);
  if (transactionKinds.has(value)) return 'transactions';
  if (budgetKinds.has(value)) return 'budgets';
  return value;
}

function supportedKind(kind) {
  return transactionKinds.has(kind) || budgetKinds.has(kind);
}

function summarize(rows) {
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary[row.status] = (summary[row.status] || 0) + 1;
    return summary;
  }, { total: 0, ready: 0, unresolved: 0, invalid: 0, blocked: 0, discarded: 0 });
}

function regroupDraft(draft) {
  return {
    ...draft,
    groups: buildGroups(draft.rows),
    summary: summarize(draft.rows)
  };
}

function cloneDraft(draft) {
  return {
    ...draft,
    rows: (draft.rows || []).map(row => ({
      ...row,
      original: { ...row.original },
      resolved: { ...row.resolved },
      issues: row.issues.map(issue => ({ ...issue })),
      decisions: row.decisions.map(decision => ({ ...decision }))
    })),
    groups: (draft.groups || []).map(group => ({ ...group, sourceRows: [...group.sourceRows] })),
    summary: { ...draft.summary }
  };
}

function fingerprint(kind, objects) {
  const text = JSON.stringify([kind, objects]);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `import-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function deterministicBatchId(kind, objects) {
  return `${kind}-${fingerprint(kind, objects).slice(-8)}`;
}

function freezeImportPlan(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeImportPlan);
  return Object.freeze(value);
}
