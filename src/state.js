import { loadState, saveState, clearState, clearFinanceLocalStorage } from './services/storageService.js';
import { applyTransactionEdit, canDuplicateTransaction, createTransfer, normalizeBudget, normalizeTransaction } from './services/financeService.js';
import { migrateAuditPeriod } from './services/periodService.js';
import { canon, currentMonth, parseAmount, parseDate, parseMonth, uid } from './utils/format.js';
import { inferIcon } from './icons.js';

const listeners = new Set();
export const DEFAULT_ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta de Ahorros', 'Tarjeta de Crédito', 'Cuenta de Inversiones', 'Otro'];

export const initialState = {
  version: '7.0.5',
  onboarded: false,
  activeView: 'balances',
  settingsPage: '',
  period: { mode: 'month', month: currentMonth(), compareMode: 'previous' },
  auditPeriod: { mode: 'all', compare: false },
  accountTypes: [...DEFAULT_ACCOUNT_TYPES],
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  provisions: [],
  capacityRules: { accountRoles: {}, provisionIds: null },
  recurring: [],
  recurringDone: {},
  filters: {
    audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] },
    categories: { text: '', categories: [], view: 'combined', expanded: [], budgetExpanded: true, compare: false },
    summary: { excludedCategories: [], includeExtraordinary: false },
    excludedChartCategories: []
  },
  rules: {
    income: { income: true, expense: false, budget: false, balance: true },
    expense: { income: false, expense: true, budget: true, balance: true },
    transfer: { income: false, expense: false, budget: false, balance: true },
    provision: { income: false, expense: false, budget: false, balance: false }
  },
  healthDismissed: {},
  backups: [],
  debug: {
    lastAction: '',
    lastError: '',
    storageTestAt: ''
  },
  ui: {
    drawerOpen: false,
    activeSheet: '',
    recordFlow: null,
    periodDraft: null,
    calendarTarget: null,
    toast: null,
    undo: null,
    iconPicker: null,
    importDraft: null,
    optionPicker: null,
    accountDraft: null,
    recurringDraft: null,
    accountAction: '',
    selectedAccountId: '',
    selectedCategoryId: '',
    selectedSubcategory: '',
    selectedTransactionId: '',
    selectedHealthIssue: '',
    auditFilter: '',
    auditDropdown: '',
    auditDropdownSearch: '',
    auditFiltersOpen: false,
    filterSearch: '',
    categoryDraft: null
  }
};

export let state = structuredClone(initialState);

export async function initState() {
  const saved = await loadState();
  if (saved) state = mergeState(saved);
  else state = structuredClone(initialState);
  notify();
}

function mergeState(saved) {
  const merged = structuredClone(initialState);
  Object.assign(merged, saved);
  merged.ui = { ...initialState.ui };
  merged.period = { ...initialState.period, ...(saved.period || {}) };
  merged.auditPeriod = migrateAuditPeriod(saved.auditPeriod);
  merged.filters = {
    ...initialState.filters,
    ...(saved.filters || {}),
    audit: { ...initialState.filters.audit, ...(saved.filters?.audit || {}) },
    categories: {
      ...initialState.filters.categories,
      ...(saved.filters?.categories || {}),
      compare: Boolean(saved.filters?.categories?.compare)
    },
    summary: {
      ...initialState.filters.summary,
      ...(saved.filters?.summary || {}),
      excludedCategories: saved.filters?.summary?.excludedCategories || saved.filters?.excludedChartCategories || []
    }
  };
  merged.rules = { ...initialState.rules, ...(saved.rules || {}) };
  merged.debug = { ...initialState.debug, ...(saved.debug || {}) };
  merged.activeView = 'balances';
  merged.settingsPage = '';
  merged.accountTypes = mergeAccountTypes(saved.accountTypes, saved.accounts);
  merged.accounts = migrateAccounts(saved.accounts);
  merged.categories = migrateCategories(saved.categories);
  merged.transactions = (Array.isArray(saved.transactions) ? saved.transactions : [])
    .filter(tx => parseDate(tx.date || tx.fecha) || !(tx.date || tx.fecha))
    .map(tx => normalizeTransaction(tx, merged));
  merged.budgets = (Array.isArray(saved.budgets) ? saved.budgets : [])
    .filter(row => parseMonth(row.month || row.mes || row.date || row.fecha) || !(row.month || row.mes || row.date || row.fecha))
    .map(row => normalizeBudget(row, merged));
  merged.provisions = Array.isArray(saved.provisions) ? saved.provisions : [];
  merged.capacityRules = migrateCapacityRules(saved.capacityRules, merged.accounts, merged.provisions);
  merged.recurring = Array.isArray(saved.recurring) ? saved.recurring : [];
  return merged;
}

export function migrateCapacityRules(rules, accounts = [], provisions = []) {
  const savedRules = rules || {};
  const accountRoles = Object.fromEntries(accounts.map(account => {
    const role = savedRules.accountRoles?.[account.id];
    return [account.id, ['liquidity', 'debt', 'exclude'].includes(role)
      ? role
      : account.kpi?.available !== false ? 'liquidity' : 'exclude'];
  }));
  const provisionIds = Array.isArray(savedRules.provisionIds)
    ? savedRules.provisionIds.filter(id => provisions.some(provision => provision.id === id))
    : provisions.map(provision => provision.id);
  return { accountRoles, provisionIds };
}

function mergeAccountTypes(savedTypes = [], accounts = []) {
  const types = [...DEFAULT_ACCOUNT_TYPES];
  (Array.isArray(savedTypes) ? savedTypes : []).forEach(type => pushUnique(types, type));
  (Array.isArray(accounts) ? accounts : []).forEach(account => pushUnique(types, account.type));
  return types.filter(Boolean);
}

function migrateCategories(categories = []) {
  return (Array.isArray(categories) ? categories : []).map(category => ({
    ...category,
    id: category.id || uid('category'),
    name: category.name || category.categoria || '',
    icon: category.icon || inferIcon(category.name || category.categoria, 'category'),
    color: category.color || '#0A8FE8',
    subcategories: (Array.isArray(category.subcategories) ? category.subcategories : []).map(sub => ({
      id: sub.id || uid('sub'),
      name: sub.name || sub.subcategoria || sub
    })).filter(sub => sub.name)
  })).filter(category => category.name);
}

function pushUnique(list, value) {
  const text = String(value || '').trim();
  if (text && !list.some(item => canon(item) === canon(text))) list.push(text);
}

function migrateAccounts(accounts = []) {
  return (Array.isArray(accounts) ? accounts : []).map((account, index) => ({
    ...account,
    id: account.id || uid('account'),
    type: account.type || 'Cuenta Corriente',
    icon: account.icon || inferIcon(account.name, 'account'),
    color: account.color || '#0A8FE8',
    order: Number.isFinite(Number(account.order)) ? Number(account.order) : index,
    kpi: {
      income: account.kpi?.income !== false,
      expense: account.kpi?.expense !== false,
      balance: account.kpi?.balance !== false,
      available: account.kpi?.available !== false,
      visible: account.kpi?.visible !== false
    }
  })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify() {
  listeners.forEach(listener => listener(state));
}

export async function persist() {
  const snapshot = structuredClone(state);
  snapshot.ui = structuredClone(initialState.ui);
  await saveState(snapshot);
}

export async function mutate(updater, options = {}) {
  const before = options.undo ? snapshot() : null;
  updater(state);
  if (options.undo) {
    state.ui.undo = {
      label: options.undo,
      before,
      createdAt: Date.now()
    };
  }
  await persist();
  notify();
}

function snapshot() {
  const copy = structuredClone(state);
  copy.ui = structuredClone(initialState.ui);
  return copy;
}

export async function undo() {
  if (!state.ui.undo?.before) return;
  state = mergeState(state.ui.undo.before);
  await persist();
  showToast('Cambio deshecho');
  notify();
}

export async function resetAll() {
  await clearState();
  clearFinanceLocalStorage();
  state = structuredClone(initialState);
  notify();
}

export function setView(view) {
  state.activeView = view;
  state.settingsPage = '';
  state.ui.drawerOpen = false;
  state.ui.auditFiltersOpen = false;
  state.ui.auditDropdown = '';
  state.ui.auditDropdownSearch = '';
  notify();
}

export function setSettingsPage(page) {
  state.activeView = 'settings';
  state.settingsPage = page;
  state.ui.drawerOpen = false;
  state.ui.auditFiltersOpen = false;
  state.ui.auditDropdown = '';
  state.ui.auditDropdownSearch = '';
  notify();
}

export function openSheet(sheet) {
  state.ui.activeSheet = sheet;
  notify();
}

export function closeSheet() {
  state.ui.activeSheet = '';
  state.ui.importDraft = null;
  state.ui.iconPicker = null;
  state.ui.categoryDraft = null;
  state.ui.selectedSubcategory = '';
  notify();
}

export function showToast(message, action = null) {
  state.ui.toast = { message, action, id: uid('toast') };
  notifyToastOnly();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    if (state.ui.toast?.message === message) {
      state.ui.toast = null;
      notifyToastOnly();
    }
  }, 5200);
}

export function dismissToast() {
  state.ui.toast = null;
  notifyToastOnly();
}

function notifyToastOnly() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cfo:toast'));
  else notify();
}

export async function addAccount(payload) {
  const name = payload.name?.trim();
  if (!name) {
    showToast('Nombre de cuenta requerido');
    return false;
  }
  if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    showToast('La cuenta ya existe');
    return false;
  }
  await mutate(s => {
    if (payload.type && !s.accountTypes.some(type => canon(type) === canon(payload.type))) s.accountTypes.push(payload.type);
    const nextOrder = Math.max(-1, ...s.accounts.map(account => Number(account.order) || 0)) + 1;
    const id = uid('account');
    s.accounts.push({
      id,
      name,
      type: payload.type || 'Cuenta Corriente',
      icon: payload.icon || inferIcon(name, 'account'),
      color: payload.color || '#0A8FE8',
      order: nextOrder,
      kpi: {
        income: payload.kpi?.income !== false,
        expense: payload.kpi?.expense !== false,
        balance: payload.kpi?.balance !== false,
        available: payload.kpi?.available !== false,
        visible: payload.kpi?.visible !== false
      }
    });
    s.capacityRules = s.capacityRules || { accountRoles: {}, provisionIds: null };
    s.capacityRules.accountRoles = s.capacityRules.accountRoles || {};
    s.capacityRules.accountRoles[id] = payload.kpi?.available !== false ? 'liquidity' : 'exclude';
    s.onboarded = true;
  }, { undo: 'Cuenta creada' });
  showToast('Cuenta creada');
  return true;
}

export async function updateAccount(id, payload) {
  const name = payload.name?.trim();
  if (!name) {
    showToast('Nombre de cuenta requerido');
    return false;
  }
  const current = state.accounts.find(account => account.id === id);
  if (!current) {
    showToast('Cuenta no encontrada');
    return false;
  }
  if (state.accounts.some(account => account.id !== id && canon(account.name) === canon(name))) {
    showToast('La cuenta ya existe');
    return false;
  }
  const oldName = current.name;
  await mutate(s => {
    if (payload.type && !s.accountTypes.some(type => canon(type) === canon(payload.type))) s.accountTypes.push(payload.type);
    const account = s.accounts.find(item => item.id === id);
    if (!account) return;
    Object.assign(account, {
      name,
      type: payload.type || account.type || 'Cuenta Corriente',
      icon: payload.icon || account.icon || inferIcon(name, 'account'),
      color: payload.color || account.color || '#0A8FE8',
      kpi: {
        income: payload.kpi?.income !== false,
        expense: payload.kpi?.expense !== false,
        balance: payload.kpi?.balance !== false,
        available: payload.kpi?.available !== false,
        visible: payload.kpi?.visible !== false
      }
    });
    s.transactions.forEach(tx => {
      if (canon(tx.account) === canon(oldName)) tx.account = name;
      if (canon(tx.accountTo) === canon(oldName)) tx.accountTo = name;
    });
    s.budgets.forEach(row => {
      if (canon(row.account) === canon(oldName)) row.account = name;
    });
    s.recurring.forEach(row => {
      if (canon(row.account) === canon(oldName)) row.account = name;
    });
  }, { undo: 'Cuenta actualizada' });
  showToast('Cuenta actualizada');
  return true;
}

export function accountDeleteImpact(id) {
  const account = state.accounts.find(item => item.id === id);
  if (!account) return { account: null, transactions: 0, transfers: 0, budgets: 0, recurring: 0 };
  const key = canon(account.name);
  const direct = state.transactions.filter(tx => canon(tx.account) === key || canon(tx.accountTo) === key);
  const transferIds = new Set(direct.map(tx => tx.transferId).filter(Boolean));
  const transactionIds = new Set(
    state.transactions
      .filter(tx => canon(tx.account) === key || canon(tx.accountTo) === key || (tx.transferId && transferIds.has(tx.transferId)))
      .map(tx => tx.id)
  );
  return {
    account,
    transactions: transactionIds.size,
    transfers: transferIds.size,
    budgets: state.budgets.filter(row => canon(row.account) === key).length,
    recurring: state.recurring.filter(row => canon(row.account) === key).length
  };
}

export async function deleteAccount(id) {
  const impact = accountDeleteImpact(id);
  if (!impact.account) {
    showToast('Cuenta no encontrada');
    return false;
  }
  const key = canon(impact.account.name);
  await mutate(s => {
    const direct = s.transactions.filter(tx => canon(tx.account) === key || canon(tx.accountTo) === key);
    const transferIds = new Set(direct.map(tx => tx.transferId).filter(Boolean));
    s.transactions = s.transactions.filter(tx =>
      canon(tx.account) !== key &&
      canon(tx.accountTo) !== key &&
      !(tx.transferId && transferIds.has(tx.transferId))
    );
    s.budgets = s.budgets.filter(row => canon(row.account) !== key);
    s.recurring.forEach(row => {
      if (canon(row.account) === key) row.account = '';
    });
    s.accounts = s.accounts
      .filter(account => account.id !== id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((account, order) => ({ ...account, order }));
    if (s.capacityRules?.accountRoles) delete s.capacityRules.accountRoles[id];
  }, { undo: 'Cuenta eliminada' });
  showToast('Cuenta eliminada');
  return true;
}

export async function moveAccount(id, direction) {
  await mutate(s => {
    const accounts = s.accounts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = accounts.findIndex(account => account.id === id);
    const target = index + Number(direction);
    if (index < 0 || target < 0 || target >= accounts.length) return;
    const [item] = accounts.splice(index, 1);
    accounts.splice(target, 0, item);
    accounts.forEach((account, order) => { account.order = order; });
    s.accounts = accounts;
  }, { undo: 'Orden de cuentas actualizado' });
}

export async function createOpeningAdjustment(accountName, openingBalance, source = 'CSV') {
  const amount = parseAmount(openingBalance);
  if (!Number.isFinite(amount) || amount === 0) return false;
  await mutate(s => {
    s.transactions.push(normalizeTransaction({
      account: accountName,
      movement: amount >= 0 ? 'Ingreso' : 'Gasto',
      amount: Math.abs(amount),
      date: new Date().toISOString().slice(0, 10),
      category: '',
      subcategory: '',
      description: 'Ajuste inicial de saldo',
      source,
      affectsIncome: false,
      affectsExpense: false,
      affectsBudget: false,
      affectsBalance: true,
      recordKind: 'Ajuste inicial'
    }, s));
  }, { undo: 'Ajuste inicial creado' });
  return true;
}

export async function createBalanceAdjustment(accountName, amountValue, note = '') {
  const amount = parseAmount(amountValue);
  if (!Number.isFinite(amount) || amount === 0) {
    showToast('Monto de ajuste requerido');
    return false;
  }
  await mutate(s => {
    s.transactions.push(normalizeTransaction({
      account: accountName,
      movement: amount >= 0 ? 'Ingreso' : 'Gasto',
      amount: Math.abs(amount),
      date: new Date().toISOString().slice(0, 10),
      category: '',
      subcategory: '',
      description: note || 'Ajuste manual de saldo',
      source: 'Manual',
      affectsIncome: false,
      affectsExpense: false,
      affectsBudget: false,
      affectsBalance: true,
      recordKind: 'Ajuste manual'
    }, s));
  }, { undo: 'Ajuste de saldo creado' });
  showToast('Ajuste de saldo creado');
  return true;
}

export async function addCategory(payload) {
  const name = payload.name?.trim();
  if (!name) return showToast('Nombre de categoría requerido');
  if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) return showToast('La categoría ya existe');
  await mutate(s => {
    s.categories.push({
      id: uid('category'),
      name,
      icon: payload.icon || inferIcon(name, 'category'),
      color: payload.color || '#0A8FE8',
      subcategories: (payload.subcategories || []).map(sub => ({ id: uid('sub'), name: sub.name || sub }))
    });
    s.onboarded = true;
  }, { undo: 'Categoría creada' });
  showToast('Categoria creada');
  return true;
}

export function categoryDeleteImpact(id) {
  const category = state.categories.find(item => item.id === id);
  if (!category) return { category: null, transactions: 0, budgets: 0, recurring: 0 };
  const key = canon(category.name);
  return {
    category,
    transactions: state.transactions.filter(tx => canon(tx.category) === key).length,
    budgets: state.budgets.filter(row => canon(row.category) === key).length,
    recurring: state.recurring.filter(row => canon(row.category) === key).length
  };
}

export function subcategoryDeleteImpact(categoryId, subcategoryName) {
  const category = state.categories.find(item => item.id === categoryId);
  if (!category) return { category: null, subcategory: '', transactions: 0, budgets: 0 };
  const catKey = canon(category.name);
  const subKey = canon(subcategoryName);
  return {
    category,
    subcategory: subcategoryName,
    transactions: state.transactions.filter(tx => canon(tx.category) === catKey && canon(tx.subcategory) === subKey).length,
    budgets: state.budgets.filter(row => canon(row.category) === catKey && canon(row.subcategory) === subKey).length
  };
}

export async function updateCategory(id, payload) {
  const current = state.categories.find(item => item.id === id);
  const name = payload.name?.trim();
  if (!current) {
    showToast('Categoria no encontrada');
    return false;
  }
  if (!name) {
    showToast('Nombre de categoria requerido');
    return false;
  }
  if (state.categories.some(item => item.id !== id && canon(item.name) === canon(name))) {
    showToast('La categoria ya existe');
    return false;
  }
  const oldName = current.name;
  await mutate(s => {
    const category = s.categories.find(item => item.id === id);
    if (!category) return;
    category.name = name;
    category.icon = payload.icon || category.icon || inferIcon(name, 'category');
    category.color = payload.color || category.color || '#0A8FE8';
    if (Array.isArray(payload.subcategories)) {
      category.subcategories = payload.subcategories.map(sub => ({
        id: sub.id || uid('sub'),
        name: sub.name || sub
      })).filter(sub => sub.name);
    }
    s.transactions.forEach(tx => {
      if (canon(tx.category) === canon(oldName)) tx.category = name;
    });
    s.budgets.forEach(row => {
      if (canon(row.category) === canon(oldName)) row.category = name;
    });
    s.recurring.forEach(row => {
      if (canon(row.category) === canon(oldName)) row.category = name;
    });
    s.filters.categories.categories = s.filters.categories.categories.map(value => canon(value) === canon(oldName) ? name : value);
    s.filters.audit.categories = s.filters.audit.categories.map(value => canon(value) === canon(oldName) ? name : value);
  }, { undo: 'Categoria actualizada' });
  showToast('Categoria actualizada');
  return true;
}

export async function deleteSubcategory(categoryId, subcategoryName) {
  const impact = subcategoryDeleteImpact(categoryId, subcategoryName);
  if (!impact.category || !subcategoryName) {
    showToast('Subcategoria no encontrada');
    return false;
  }
  const catKey = canon(impact.category.name);
  const subKey = canon(subcategoryName);
  await mutate(s => {
    const category = s.categories.find(item => item.id === categoryId);
    if (category) category.subcategories = (category.subcategories || []).filter(sub => canon(sub.name || sub) !== subKey);
    s.transactions.forEach(tx => {
      if (canon(tx.category) === catKey && canon(tx.subcategory) === subKey) tx.subcategory = '';
    });
    s.budgets.forEach(row => {
      if (canon(row.category) === catKey && canon(row.subcategory) === subKey) row.subcategory = '';
    });
    s.filters.audit.subcategories = s.filters.audit.subcategories.filter(value => canon(value) !== subKey);
  }, { undo: 'Subcategoria eliminada' });
  showToast('Subcategoria eliminada');
  return true;
}

export async function deleteCategory(id) {
  const impact = categoryDeleteImpact(id);
  if (!impact.category) {
    showToast('Categoria no encontrada');
    return false;
  }
  const key = canon(impact.category.name);
  await mutate(s => {
    s.transactions = s.transactions.filter(tx => canon(tx.category) !== key);
    s.budgets = s.budgets.filter(row => canon(row.category) !== key);
    s.recurring.forEach(row => {
      if (canon(row.category) === key) row.category = '';
    });
    s.categories = s.categories.filter(category => category.id !== id);
    s.filters.categories.categories = s.filters.categories.categories.filter(value => canon(value) !== key);
    s.filters.audit.categories = s.filters.audit.categories.filter(value => canon(value) !== key);
  }, { undo: 'Categoria eliminada' });
  showToast('Categoria eliminada');
  return true;
}

export async function addProvision(payload) {
  const name = payload.name?.trim();
  if (!name) return showToast('Nombre de provisión requerido');
  await mutate(s => {
    const id = uid('provision');
    s.provisions.push({
      id,
      name,
      balance: Math.max(0, Number(payload.balance) || 0),
      monthlyAmount: Math.max(0, Number(payload.monthlyAmount) || 0),
      icon: payload.icon || inferIcon(name, 'provision'),
      color: payload.color || '#C68000'
    });
    s.capacityRules = s.capacityRules || { accountRoles: {}, provisionIds: null };
    if (Array.isArray(s.capacityRules.provisionIds)) s.capacityRules.provisionIds = [...new Set([...s.capacityRules.provisionIds, id])];
    else s.capacityRules.provisionIds = s.provisions.map(provision => provision.id);
    s.onboarded = true;
  }, { undo: 'Provisión creada' });
}

export async function saveTransaction(payload) {
  const type = payload.movement || payload.type || 'Gasto';
  const amount = Number(payload.amount) || 0;
  if (!payload.date || !amount) {
    showToast('Fecha y monto requeridos');
    return false;
  }
  if (type !== 'Presupuesto' && !payload.account) {
    showToast('Cuenta requerida');
    return false;
  }
  if (type === 'Transferencia') {
    if (!payload.account || !payload.accountTo || payload.account === payload.accountTo) {
      showToast('Selecciona cuentas distintas');
      return false;
    }
    await mutate(s => {
      s.transactions.push(...createTransfer({
        from: payload.account,
        to: payload.accountTo,
        amount,
        date: payload.date,
        description: payload.description || 'Transferencia',
        source: 'Manual'
      }));
      s.onboarded = true;
    }, { undo: 'Transferencia registrada' });
    showToast('Transferencia guardada');
    return true;
  }
  if (type === 'Presupuesto') {
    await mutate(s => {
      s.budgets.push(normalizeBudget({
        month: payload.date.slice(0, 7),
        account: payload.account || 'Budget',
        amount,
        category: payload.category,
        subcategory: payload.subcategory,
        description: payload.description,
        source: 'Manual'
      }, s));
      s.onboarded = true;
    }, { undo: 'Presupuesto guardado' });
    showToast('Presupuesto guardado');
    return true;
  }
  await mutate(s => {
    const tx = normalizeTransaction({
      ...payload,
      movement: type,
      source: 'Manual',
      amount
    }, s);
    if (type === 'Provisión') {
      tx.provisionDelta = amount;
      tx.affectsExpense = false;
      tx.affectsBudget = false;
      tx.affectsBalance = false;
      tx.recordKind = 'Movimiento por provisión';
    }
    s.transactions.push(tx);
    s.onboarded = true;
  }, { undo: `${type} guardado` });
  showToast(`${type} guardado`);
  return true;
}

export async function updateTransaction(id, payload) {
  const type = payload.movement || payload.type || 'Gasto';
  const amount = Number(payload.amount) || 0;
  if (!payload.date || !amount) {
    showToast('Fecha y monto requeridos');
    return false;
  }
  if (!payload.account) {
    showToast('Cuenta requerida');
    return false;
  }
  if (type === 'Transferencia' && (!payload.accountTo || payload.account === payload.accountTo)) {
    showToast('Selecciona cuentas distintas');
    return false;
  }

  const result = applyTransactionEdit(state.transactions, id, { ...payload, movement: type, amount }, state);
  if (!result.ok) {
    showToast(result.reason || 'No se pudo actualizar el movimiento');
    return false;
  }
  await mutate(s => {
    s.transactions = result.transactions;
  }, { undo: 'Movimiento actualizado' });
  showToast('Movimiento actualizado');
  return true;
}

export async function deleteTransaction(id) {
  await mutate(s => {
    const tx = s.transactions.find(item => item.id === id);
    if (!tx) return;
    if (tx.transferId) s.transactions = s.transactions.filter(item => item.transferId !== tx.transferId);
    else s.transactions = s.transactions.filter(item => item.id !== id);
  }, { undo: 'Registro eliminado' });
}

export async function duplicateTransaction(id) {
  await mutate(s => {
    const tx = s.transactions.find(item => item.id === id);
    if (!canDuplicateTransaction(tx)) return;
    s.transactions.push({ ...tx, id: uid('tx'), description: `${tx.description || tx.movement} copia`, createdAt: new Date().toISOString() });
  }, { undo: 'Registro duplicado' });
}

export async function convertToTransfer(id) {
  const tx = state.transactions.find(item => item.id === id);
  if (!tx || tx.transferId || !['Ingreso', 'Gasto'].includes(tx.movement)) {
    showToast('Este registro no se puede convertir');
    return;
  }
  const candidate = state.transactions.find(item =>
    item.id !== tx.id &&
    !item.transferId &&
    ['Ingreso', 'Gasto'].includes(item.movement) &&
    item.movement !== tx.movement &&
    item.account !== tx.account &&
    Math.abs(Number(item.amount) - Number(tx.amount)) < 0.005 &&
    Math.abs(new Date(`${item.date}T12:00:00`) - new Date(`${tx.date}T12:00:00`)) <= 3 * 86400000
  );
  if (!candidate) {
    showToast('No existe contrapartida compatible. Crea una antes de convertir.');
    return;
  }
  await mutate(s => {
    const freshTx = s.transactions.find(item => item.id === tx.id);
    const freshCandidate = s.transactions.find(item => item.id === candidate.id);
    const transferId = uid('transfer');
    [freshTx, freshCandidate].forEach(item => {
      item.transferId = transferId;
      item.recordKind = 'Transferencia';
      item.affectsIncome = false;
      item.affectsExpense = false;
      item.affectsBudget = false;
      item.accountTo = item.id === freshTx.id ? freshCandidate.account : freshTx.account;
    });
  }, { undo: 'Transferencia vinculada' });
  showToast('Transferencia vinculada');
}

export async function saveRecurring(payload) {
  const name = payload.name?.trim();
  if (!name) {
    showToast('Nombre requerido');
    return false;
  }
  await mutate(s => {
    const item = {
      id: payload.id || uid('recurring'),
      type: payload.type || 'Pago',
      name,
      day: Math.max(1, Math.min(31, Number(payload.day) || 1)),
      amount: Number(payload.amount) || 0,
      account: payload.account || '',
      category: payload.category || '',
      icon: payload.icon || inferIcon(name, 'recurring'),
      color: payload.color || '#0A8FE8'
    };
    const idx = s.recurring.findIndex(r => r.id === item.id);
    if (idx >= 0) s.recurring[idx] = item;
    else s.recurring.push(item);
    s.onboarded = true;
  }, { undo: 'Recurrencia guardada' });
  showToast('Recurrencia guardada');
  return true;
}

export async function markRecurring(month, recurringId, done) {
  await mutate(s => {
    s.recurringDone[month] = s.recurringDone[month] || {};
    s.recurringDone[month][recurringId] = !!done;
  });
}

export async function dismissHealthIssue(issueId) {
  await mutate(s => {
    s.healthDismissed[issueId] = true;
  });
}

export async function restoreSnapshot(snapshotData) {
  state = mergeState(snapshotData);
  await persist();
  notify();
  showToast('Respaldo restaurado');
}

export async function setDebugInfo(patch, options = {}) {
  state.debug = { ...(state.debug || {}), ...patch };
  if (options.persist) await persist();
  if (options.notify) notify();
}
