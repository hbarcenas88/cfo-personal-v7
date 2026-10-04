import { canon, uid } from '../utils/format.js';

const editableFields = ['category', 'subcategory', 'account', 'amount', 'description'];
const clone = value => structuredClone(value);
const isBlank = value => value === '' || value === null || value === undefined;
const groupKey = row => JSON.stringify([canon(row.category), canon(row.subcategory), canon(row.account || 'Budget')]);

// Decimal input is converted to integer cents before arithmetic or persistence.
function cents(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

function monthBefore(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mes inválido');
  const [year, number] = month.split('-').map(Number);
  return number === 1 ? `${String(year - 1).padStart(4, '0')}-12` : `${year}-${String(number - 1).padStart(2, '0')}`;
}

function newRow(month, category, subcategory = '') {
  const id = uid('budget');
  return { id, draftId: id, month, category, subcategory, account: 'Budget', amount: '', description: '', source: 'Manual' };
}

function sameEditable(row, original) {
  return editableFields.every(field => {
    if (field === 'amount') return cents(row[field]) === cents(original[field]);
    if (field === 'account') return (row[field] || 'Budget') === (original[field] || 'Budget');
    return (row[field] || '') === (original[field] || '');
  });
}

function originalFor(draft, row) {
  return draft.originalRows.find(original => original.id === row.id);
}

function changed(row, original) {
  return original ? Boolean(row.deleted) || !sameEditable(row, original) : !row.deleted && !isBlank(row.amount);
}

function createRows(state, originalRows, month) {
  const rows = originalRows.map(row => ({ ...clone(row), draftId: row.id, subcategory: row.subcategory || '', account: row.account || 'Budget', description: row.description || '' }));
  for (const item of state.categories || []) {
    const subcategories = ['', ...(item.subcategories || []).map(sub => sub.name || sub)];
    for (const subcategory of subcategories) {
      if (!rows.some(row => canon(row.category) === canon(item.name) && canon(row.subcategory) === canon(subcategory))) {
        rows.push(newRow(month, item.name, subcategory));
      }
    }
  }
  return rows;
}

export function createMonthlyBudgetDraft(state, month, { category = '' } = {}) {
  const previousMonth = monthBefore(month);
  const originalRows = clone((state.budgets || []).filter(row => row.month === month));
  return {
    mode: 'monthly', month, previousMonth, rows: createRows(state, originalRows, month), originalRows,
    previousRows: clone((state.budgets || []).filter(row => row.month === previousMonth)),
    catalogNames: (state.categories || []).map(item => item.name), newCategories: [],
    expandedCategories: category ? [category] : [], dirty: false
  };
}

export function createBaseBudgetDraft(state, { category = '' } = {}) {
  const originalRows = clone(state.budgetTemplate || []);
  return { mode: 'base', month: '', previousMonth: '', rows: createRows(state, originalRows, ''), originalRows,
    previousRows: [], catalogNames: (state.categories || []).map(item => item.name), newCategories: [],
    expandedCategories: category ? [category] : [], dirty: false };
}

export function addMonthlyBudgetCategory(draft, name) {
  const clean = String(name || '').trim();
  if (!clean || clean.length > 100) return { ok: false, draft, error: 'Ingresa un nombre de categoría de hasta 100 caracteres.' };
  const names = [...(draft.catalogNames || []), ...draft.rows.map(row => row.category), ...(draft.newCategories || []).map(item => item.name)];
  if (names.some(item => canon(item) === canon(clean))) return { ok: false, draft, error: 'Esta categoría ya existe.' };
  const category = { id: uid('cat'), name: clean, subcategories: [], icon: 'tag', color: '#0A8FE8' };
  const next = { ...draft, newCategories: [...(draft.newCategories || []), category], expandedCategories: [...(draft.expandedCategories || []), clean] };
  return { ok: true, draft: withRows(next, [...draft.rows, newRow(draft.month, clean)]) };
}

export function hasMonthlyBudgetChanges(draft) {
  return Boolean(draft.newCategories?.length) || draft.rows.some(row => changed(row, originalFor(draft, row)));
}

function withRows(draft, rows) {
  const next = { ...draft, rows };
  return { ...next, dirty: hasMonthlyBudgetChanges(next) };
}

export function updateMonthlyBudgetRow(draft, draftId, patch) {
  const updates = Object.fromEntries(editableFields.filter(field => Object.hasOwn(patch, field)).map(field => [field, patch[field]]));
  return withRows(draft, draft.rows.map(row => row.draftId === draftId ? { ...row, ...updates } : row));
}

export function removeMonthlyBudgetRow(draft, draftId) {
  return withRows(draft, draft.rows.map(row => row.draftId === draftId ? { ...row, deleted: true } : row));
}

export function copyMissingPreviousMonth(draft, state) {
  if (draft.mode === 'base') return draft;
  const previousRows = (state.budgets || []).filter(row => row.month === draft.previousMonth);
  return copyMissingRows({ ...draft, previousRows: clone(previousRows) }, previousRows);
}

export function copyBaseBudgetIntoDraft(draft, state) {
  if (draft.mode === 'base') return draft;
  return copyMissingRows(draft, state.budgetTemplate || []);
}

function copyMissingRows(draft, sourceRows) {
  // A deliberately deleted existing group still counts as present: copying does not undo deletion.
  const present = new Set(draft.rows.filter(row => originalFor(draft, row) || (!row.deleted && !isBlank(row.amount))).map(groupKey));
  const copies = sourceRows.filter(row => !present.has(groupKey(row))).map(row => ({
    ...newRow(draft.month, row.category, row.subcategory || ''),
    account: row.account || 'Budget', amount: row.amount, description: row.description || '', source: 'Manual'
  }));
  const copiedSubcategories = new Set(copies.map(row => JSON.stringify([canon(row.category), canon(row.subcategory)])));
  const rows = draft.rows.filter(row => originalFor(draft, row) || !isBlank(row.amount) || !copiedSubcategories.has(JSON.stringify([canon(row.category), canon(row.subcategory)])));
  return withRows(draft, [...rows, ...copies]);
}

// Category totals include active rows (including empty editor slots) and the previous month reference.
export function monthlyBudgetTotals(draft) {
  const names = [...new Set(draft.rows.map(row => row.category))];
  const categories = names.map(name => {
    const rows = draft.rows.filter(row => row.category === name && !row.deleted);
    const total = rows.reduce((sum, row) => sum + (cents(row.amount) || 0), 0) / 100;
    const previousTotal = (draft.previousRows || []).filter(row => canon(row.category) === canon(name)).reduce((sum, row) => sum + (cents(row.amount) || 0), 0) / 100;
    return { name, total, rows, previousTotal };
  });
  return { total: categories.reduce((sum, category) => sum + Math.round(category.total * 100), 0) / 100, categories };
}

export function validateMonthlyBudgetDraft(draft, state) {
  const errors = [];
  const conflicts = [];
  const currentRows = draft.mode === 'base' ? state.budgetTemplate || [] : state.budgets || [];
  if (draft.mode !== 'base' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.month)) errors.push({ field: 'month', message: 'Mes inválido.' });
  const categoryNames = new Set((state.categories || []).map(item => canon(item.name)));
  const categoryIds = new Set((state.categories || []).map(item => item.id));
  for (const category of draft.newCategories || []) {
    if (!category.id || !category.name?.trim() || category.name.length > 100 || categoryNames.has(canon(category.name)) || categoryIds.has(category.id)) {
      errors.push({ field: 'category', message: 'La nueva categoría tiene un nombre o identidad duplicada. Revisa el catálogo.' });
    }
    categoryNames.add(canon(category.name));
    categoryIds.add(category.id);
    const names = new Set();
    for (const sub of category.subcategories || []) {
      const name = sub.name || sub;
      if (!String(name).trim() || names.has(canon(name))) errors.push({ field: 'subcategory', message: 'Subcategoría nueva inválida o duplicada.' });
      names.add(canon(name));
    }
  }
  const categories = [...(state.categories || []), ...(draft.newCategories || [])];
  const seen = new Set();
  for (const row of draft.rows) {
    const original = originalFor(draft, row);
    if (!changed(row, original)) continue;
    if (seen.has(row.id)) errors.push({ draftId: row.draftId, field: 'id', message: 'Fila duplicada.' });
    seen.add(row.id);
    if (original) {
      const current = currentRows.find(item => item.id === original.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(original)) {
        conflicts.push({ id: original.id, draftId: row.draftId, message: 'La fila cambió fuera de este borrador. Revisa el plan antes de guardar.' });
      }
    } else if (currentRows.some(item => item.id === row.id)) {
      conflicts.push({ id: row.id, draftId: row.draftId, message: 'La identidad de la nueva fila ya existe.' });
    }
    if (row.deleted) continue;
    const amount = cents(row.amount);
    if (amount === null || amount <= 0) errors.push({ draftId: row.draftId, field: 'amount', message: 'Ingresa un monto positivo con máximo dos decimales. Para quitar una fila usa Eliminar.' });
    const category = categories.find(item => canon(item.name) === canon(row.category));
    if (!original || canon(row.category) !== canon(original.category) || canon(row.subcategory) !== canon(original.subcategory)) {
      if (!category) errors.push({ draftId: row.draftId, field: 'category', message: 'Selecciona una categoría del catálogo.' });
      else if (row.subcategory && !(category.subcategories || []).some(item => canon(item.name || item) === canon(row.subcategory))) {
        errors.push({ draftId: row.draftId, field: 'subcategory', message: 'Selecciona una subcategoría del catálogo.' });
      }
    }
  }
  return { ok: !errors.length && !conflicts.length, errors, conflicts };
}

export function buildMonthlyBudgetChanges(draft, state) {
  const validation = validateMonthlyBudgetDraft(draft, state);
  const currentRows = draft.mode === 'base' ? state.budgetTemplate || [] : state.budgets || [];
  if (!validation.ok) return { ...validation, budgets: clone(currentRows), categories: clone(state.categories || []) };
  const affected = new Map(draft.rows.filter(row => changed(row, originalFor(draft, row))).map(row => [row.id, row]));
  const budgets = [];
  for (const current of currentRows) {
    const row = affected.get(current.id);
    if (!row) budgets.push(clone(current));
    else if (!row.deleted) budgets.push({ ...clone(current), ...Object.fromEntries(editableFields.map(field => [field, field === 'amount' ? cents(row.amount) / 100 : row[field] || ''])) });
    affected.delete(current.id);
  }
  for (const row of affected.values()) {
    if (row.deleted) continue;
    budgets.push({ id: row.id, ...(draft.mode === 'base' ? {} : { month: draft.month }), account: row.account || 'Budget', amount: cents(row.amount) / 100, category: row.category, subcategory: row.subcategory || '', description: row.description || '', source: 'Manual' });
  }
  return { ...validation, budgets, categories: clone([...(state.categories || []), ...(draft.newCategories || [])]) };
}
