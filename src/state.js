import { loadState, saveState, clearState } from './services/storageService.js';
import { createTransfer, normalizeBudget, normalizeTransaction } from './services/financeService.js';
import { currentMonth, uid } from './utils/format.js';
import { inferIcon } from './icons.js';

const listeners = new Set();

export const initialState = {
  version: '7.0.0',
  onboarded: false,
  activeView: 'balances',
  settingsPage: '',
  period: { mode: 'month', month: currentMonth(), compareMode: 'previous' },
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  provisions: [],
  recurring: [],
  recurringDone: {},
  filters: {
    audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] },
    categories: { text: '', categories: [], view: 'combined', expanded: [] },
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
    selectedHealthIssue: ''
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
  merged.accounts = Array.isArray(saved.accounts) ? saved.accounts : [];
  merged.categories = Array.isArray(saved.categories) ? saved.categories : [];
  merged.transactions = Array.isArray(saved.transactions) ? saved.transactions : [];
  merged.budgets = Array.isArray(saved.budgets) ? saved.budgets : [];
  merged.provisions = Array.isArray(saved.provisions) ? saved.provisions : [];
  merged.recurring = Array.isArray(saved.recurring) ? saved.recurring : [];
  return merged;
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
  if (!name) return showToast('Nombre de cuenta requerido');
  if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) return showToast('La cuenta ya existe');
  await mutate(s => {
    s.accounts.push({
      id: uid('account'),
      name,
      type: payload.type || 'Cuenta',
      icon: payload.icon || inferIcon(name, 'account'),
      color: payload.color || '#0A8FE8',
      kpi: { income: true, expense: true, balance: true, visible: true }
    });
    s.onboarded = true;
  }, { undo: 'Cuenta creada' });
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
  if (!payload.date || !amount) return showToast('Fecha y monto requeridos');
  if (type !== 'Presupuesto' && !payload.account) return showToast('Cuenta requerida');
  if (type === 'Transferencia') {
    if (!payload.account || !payload.accountTo || payload.account === payload.accountTo) return showToast('Selecciona cuentas distintas');
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
    return;
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
    return;
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
  if (!name) return showToast('Nombre requerido');
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
