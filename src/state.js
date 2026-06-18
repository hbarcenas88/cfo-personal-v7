import { loadState, saveState, clearState } from './services/storageService.js';
import { createTransfer, normalizeBudget, normalizeTransaction } from './services/financeService.js';
import { canon, currentMonth, parseAmount, uid } from './utils/format.js';
import { inferIcon } from './icons.js';

const listeners = new Set();
export const DEFAULT_ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta de Ahorros', 'Tarjeta de Crédito', 'Cuenta de Inversiones', 'Otro'];

export const initialState = {
  version: '7.0.2',
  onboarded: false,
  activeView: 'balances',
  settingsPage: '',
  period: { mode: 'month', month: currentMonth(), compareMode: 'previous' },
  accountTypes: [...DEFAULT_ACCOUNT_TYPES],
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  provisions: [],
  recurring: [],
  recurringDone: {},
  filters: {
    audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] },
    categories: { text: '', categories: [], view: 'combined', expanded: [], budgetExpanded: true },
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
    selectedTransactionId: '',
    selectedHealthIssue: '',
    auditFilter: '',
    filterSearch: ''
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
  merged.filters = {
    ...initialState.filters,
    ...(saved.filters || {}),
    audit: { ...initialState.filters.audit, ...(saved.filters?.audit || {}) },
    categories: { ...initialState.filters.categories, ...(saved.filters?.categories || {}) }
  };
  merged.rules = { ...initialState.rules, ...(saved.rules || {}) };
  merged.debug = { ...initialState.debug, ...(saved.debug || {}) };
  merged.activeView = 'balances';
  merged.settingsPage = '';
  merged.accountTypes = mergeAccountTypes(saved.accountTypes, saved.accounts);
  merged.accounts = migrateAccounts(saved.accounts);
  merged.categories = Array.isArray(saved.categories) ? saved.categories : [];
  merged.transactions = Array.isArray(saved.transactions) ? saved.transactions : [];
  merged.budgets = Array.isArray(saved.budgets) ? saved.budgets : [];
  merged.provisions = Array.isArray(saved.provisions) ? saved.provisions : [];
  merged.recurring = Array.isArray(saved.recurring) ? saved.recurring : [];
  return merged;
}

function mergeAccountTypes(savedTypes = [], accounts = []) {
  const types = [...DEFAULT_ACCOUNT_TYPES];
  (Array.isArray(savedTypes) ? savedTypes : []).forEach(type => pushUnique(types, type));
  (Array.isArray(accounts) ? accounts : []).forEach(account => pushUnique(types, account.type));
  return types.filter(Boolean);
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
  state = structuredClone(initialState);
  notify();
}

export function setView(view) {
  state.activeView = view;
  state.settingsPage = '';
  state.ui.drawerOpen = false;
  notify();
}

export function setSettingsPage(page) {
  state.activeView = 'settings';
  state.settingsPage = page;
  state.ui.drawerOpen = false;
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
  notify();
}

export function showToast(message, action = null) {
  state.ui.toast = { message, action, id: uid('toast') };
  notify();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    if (state.ui.toast?.message === message) {
      state.ui.toast = null;
      notify();
    }
  }, 5200);
}

export function dismissToast() {
  state.ui.toast = null;
  notify();
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
    s.accounts.push({
      id: uid('account'),
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
}

export async function addProvision(payload) {
  const name = payload.name?.trim();
  if (!name) return showToast('Nombre de provisión requerido');
  await mutate(s => {
    s.provisions.push({
      id: uid('provision'),
      name,
      balance: Math.max(0, Number(payload.balance) || 0),
      monthlyAmount: Math.max(0, Number(payload.monthlyAmount) || 0),
      icon: payload.icon || inferIcon(name, 'provision'),
      color: payload.color || '#C68000'
    });
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
    if (!tx) return;
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
