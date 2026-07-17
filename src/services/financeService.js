import { canon, clamp, currentMonth, monthEnd, parseAmount, parseDate, parseMonth, periodBounds, previousEquivalentPeriod, uid } from '../utils/format.js';

export function normalizeTransaction(tx = {}, state) {
  const amount = Math.abs(parseAmount(tx.amount ?? tx.monto ?? 0) || 0);
  const movement = normalizeMovement(tx.movement || tx.movimiento || tx.type || tx.tipo, tx.recordKind || tx.tipoRegistro, amount);
  const account = normalizeAccount(tx.account || tx.cuenta || '', state);
  const category = normalizeCategory(tx.category || tx.categoria || tx.categoría || '', state);
  const subcategory = normalizeSubcategory(tx.subcategory || tx.subcategoria || tx.subcategoría || '', category, state);
  return {
    id: tx.id || uid('tx'),
    date: parseDate(tx.date || tx.fecha) || new Date().toISOString().slice(0, 10),
    account,
    accountTo: tx.accountTo || tx.cuentaDestino || '',
    movement,
    amount,
    category,
    subcategory,
    description: tx.description || tx.descripcion || tx.descripción || '',
    note: tx.note || tx.nota || '',
    source: tx.source || tx.origen || 'Manual',
    transferId: tx.transferId || '',
    linkedId: tx.linkedId || '',
    affectsBalance: tx.affectsBalance !== false,
    affectsIncome: tx.affectsIncome !== false,
    affectsExpense: tx.affectsExpense !== false,
    affectsBudget: tx.affectsBudget !== false,
    provisionId: tx.provisionId || '',
    provisionDelta: Number(tx.provisionDelta) || 0,
    recordKind: tx.recordKind || tx.tipoRegistro || movement,
    createdAt: tx.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function normalizeBudget(row = {}, state) {
  const month = parseMonth(row.month || row.mes || row.date || row.fecha) || parseMonth(state.period?.month) || currentMonth();
  return {
    id: row.id || uid('budget'),
    month,
    account: row.account || row.cuenta || 'Budget',
    amount: Math.abs(parseAmount(row.amount ?? row.monto ?? 0) || 0),
    category: normalizeCategory(row.category || row.categoria || row.categoría || '', state),
    subcategory: normalizeSubcategory(row.subcategory || row.subcategoria || row.subcategoría || '', row.category || row.categoria, state),
    description: row.description || row.descripcion || row.descripción || '',
    source: row.source || row.origen || 'Manual'
  };
}

export function normalizeMovement(value, recordKind, amount = 0) {
  const key = canon(value || recordKind);
  if (key.includes('transfer')) return 'Transferencia';
  if (key.includes('provision')) return 'Provisión';
  if (key.includes('presupuesto')) return 'Presupuesto';
  if (['ingreso', 'income', 'credito', 'credit', 'deposito', 'entrada'].includes(key)) return 'Ingreso';
  if (['gasto', 'expense', 'debito', 'debit', 'cargo', 'retiro', 'salida'].includes(key)) return 'Gasto';
  return amount < 0 ? 'Gasto' : 'Ingreso';
}

export function normalizeAccount(value, state) {
  const key = canon(value);
  if (!key) return '';
  return state.accounts.find(account => canon(account.name) === key)?.name || String(value).trim();
}

export function normalizeCategory(value, state) {
  const key = canon(value);
  if (!key) return '';
  return state.categories.find(category => canon(category.name) === key)?.name || String(value).trim();
}

export function normalizeSubcategory(value, categoryName, state) {
  const key = canon(value);
  if (!key) return '';
  const category = state.categories.find(cat => canon(cat.name) === canon(categoryName));
  const found = category?.subcategories?.find(sub => canon(sub.name || sub) === key);
  return found?.name || found || String(value).trim();
}

export function periodTransactions(state, period = state.period) {
  const { from, to } = periodBounds(period);
  return state.transactions.filter(tx => {
    const date = parseDate(tx.date);
    return date && date >= from && date <= to;
  });
}

export function transactionsToCutoff(state, period = state.period) {
  const { to } = periodBounds(period);
  return state.transactions.filter(tx => {
    const date = parseDate(tx.date);
    return date && date <= to;
  });
}

export function periodBudgets(state, period = state.period) {
  const { from, to } = periodBounds(period);
  return state.budgets.filter(budget => {
    const start = `${budget.month}-01`;
    const end = monthEnd(budget.month);
    return end >= from && start <= to;
  });
}

export function accountBalances(state, period = state.period) {
  const balances = Object.fromEntries(state.accounts.map(account => [account.name, 0]));
  transactionsToCutoff(state, period).forEach(tx => {
    if (!tx.affectsBalance || !balances.hasOwnProperty(tx.account)) return;
    if (tx.movement === 'Ingreso') balances[tx.account] += Number(tx.amount) || 0;
    if (tx.movement === 'Gasto') balances[tx.account] -= Number(tx.amount) || 0;
    if (tx.movement === 'Provisión' && tx.provisionDelta < 0) balances[tx.account] -= Math.abs(Number(tx.provisionDelta) || 0);
  });
  return balances;
}

export function provisionReserve(state, period = state.period) {
  return Math.max(0, transactionsToCutoff(state, period).reduce((sum, tx) => sum + (Number(tx.provisionDelta) || 0), 0));
}

export function provisionAssigned(state) {
  return state.provisions.reduce((sum, provision) => sum + Math.max(0, Number(provision.balance) || 0), 0);
}

export function kpis(state, period = state.period) {
  const current = periodTransactions(state, period);
  const previous = periodTransactions(state, { mode: 'range', ...previousEquivalentPeriod(period) });
  const currentIncome = sumIncome(current, state);
  const currentExpense = sumExpense(current, state);
  const prevIncome = sumIncome(previous, state);
  const prevExpense = sumExpense(previous, state);
  const balances = accountBalances(state, period);
  const includedAccounts = state.accounts.filter(account => account.kpi?.balance !== false);
  const totalBalance = includedAccounts.reduce((sum, account) => sum + (balances[account.name] || 0), 0);
  const availableAccounts = state.accounts.filter(account => account.kpi?.available !== false);
  const availableBalance = availableAccounts.reduce((sum, account) => sum + (balances[account.name] || 0), 0);
  const reserve = provisionReserve(state, period);
  return {
    balanceTotal: totalBalance,
    available: availableBalance - reserve,
    reserve,
    income: currentIncome,
    expense: currentExpense,
    incomeDelta: delta(currentIncome, prevIncome),
    expenseDelta: delta(currentExpense, prevExpense),
    balances,
    includedAccounts: includedAccounts.length,
    availableAccounts: availableAccounts.length,
    totalAccounts: state.accounts.length,
    transactionCount: current.length
  };
}

function sumIncome(transactions, state) {
  return transactions
    .filter(tx => tx.movement === 'Ingreso' && !tx.transferId && accountConfig(state, tx.account).income !== false && tx.affectsIncome !== false)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

function sumExpense(transactions, state) {
  return transactions
    .filter(tx => tx.movement === 'Gasto' && !tx.transferId && accountConfig(state, tx.account).expense !== false && tx.affectsExpense !== false)
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

export function accountConfig(state, accountName) {
  return state.accounts.find(account => canon(account.name) === canon(accountName))?.kpi || {
    income: true,
    expense: true,
    balance: true,
    available: true,
    visible: true
  };
}

function delta(value, previous) {
  if (!previous) return value ? 100 : 0;
  return ((value - previous) / Math.abs(previous)) * 100;
}

export function budgetSummary(state, period = state.period) {
  const budgets = periodBudgets(state, period);
  const txs = periodTransactions(state, period).filter(tx => tx.movement === 'Gasto' && !tx.transferId && tx.affectsBudget !== false);
  const budgetByCat = groupSum(budgets, 'category');
  const spendByCat = groupSum(txs, 'category');
  const totalBudget = sum(budgets.map(b => b.amount));
  let withinBudget = 0;
  let unbudgeted = 0;
  let budgetedExcess = 0;
  Object.entries(spendByCat).forEach(([category, spent]) => {
    const planned = budgetByCat[category] || 0;
    if (!planned) unbudgeted += spent;
    else {
      withinBudget += Math.min(spent, planned);
      budgetedExcess += Math.max(0, spent - planned);
    }
  });
  const used = withinBudget;
  const pending = Math.max(0, totalBudget - withinBudget);
  const excessTotal = unbudgeted + budgetedExcess;
  const k = kpis(state, period);
  const margin = k.available - pending;
  return {
    budgets,
    transactions: txs,
    totalBudget,
    spent: sum(txs.map(tx => tx.amount)),
    used,
    pending,
    unbudgeted,
    budgetedExcess,
    excessTotal,
    available: k.available,
    margin,
    executedPct: totalBudget ? clamp((used / totalBudget) * 100, 0, 999) : 0
  };
}

export function categoryRows(state, period = state.period) {
  const budgets = periodBudgets(state, period);
  const txs = periodTransactions(state, period).filter(tx => tx.movement === 'Gasto' && !tx.transferId && tx.affectsBudget !== false);
  const names = new Set([
    ...state.categories.map(cat => cat.name),
    ...budgets.map(row => row.category).filter(Boolean),
    ...txs.map(tx => tx.category).filter(Boolean)
  ]);
  return [...names].map(name => {
    const planned = sum(budgets.filter(row => canon(row.category) === canon(name)).map(row => row.amount));
    const spent = sum(txs.filter(tx => canon(tx.category) === canon(name)).map(tx => tx.amount));
    const subNames = new Set([
      ...state.categories.find(cat => canon(cat.name) === canon(name))?.subcategories?.map(sub => sub.name || sub) || [],
      ...budgets.filter(row => canon(row.category) === canon(name)).map(row => row.subcategory).filter(Boolean),
      ...txs.filter(tx => canon(tx.category) === canon(name)).map(tx => tx.subcategory).filter(Boolean)
    ]);
    const meta = state.categories.find(cat => canon(cat.name) === canon(name)) || {};
    return {
      name,
      planned,
      spent,
      pct: planned ? (spent / planned) * 100 : 0,
      available: planned - spent,
      icon: meta.icon || 'folder',
      color: meta.color || '#0a8fe8',
      subcategories: [...subNames].map(sub => ({
        name: sub,
        planned: sum(budgets.filter(row => canon(row.category) === canon(name) && canon(row.subcategory) === canon(sub)).map(row => row.amount)),
        spent: sum(txs.filter(tx => canon(tx.category) === canon(name) && canon(tx.subcategory) === canon(sub)).map(tx => tx.amount))
      }))
    };
  }).sort((a, b) => b.spent - a.spent);
}

export function monthlySeries(state, year = String((state.period.month || currentMonth()).slice(0, 4))) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    const period = { mode: 'month', month };
    const k = kpis(state, period);
    const b = budgetSummary(state, period);
    return { month, income: k.income, expense: k.expense, budget: b.totalBudget };
  });
}

export function createTransfer({ from, to, amount, date, description, source = 'Manual' }) {
  const transferId = uid('transfer');
  return [
    normalizeTransaction({
      id: `${transferId}-out`,
      account: from,
      accountTo: to,
      movement: 'Gasto',
      amount,
      date,
      description,
      source,
      transferId,
      recordKind: 'Transferencia',
      affectsIncome: false,
      affectsExpense: false,
      affectsBudget: false
    }, { accounts: [{ name: from }, { name: to }], categories: [] }),
    normalizeTransaction({
      id: `${transferId}-in`,
      account: to,
      accountTo: from,
      movement: 'Ingreso',
      amount,
      date,
      description,
      source,
      transferId,
      recordKind: 'Transferencia',
      affectsIncome: false,
      affectsExpense: false,
      affectsBudget: false
    }, { accounts: [{ name: from }, { name: to }], categories: [] })
  ];
}

export function applyTransactionEdit(transactions, id, payload, state) {
  const original = transactions.find(tx => tx.id === id);
  if (!original) return { ok: false, reason: 'No encontramos el movimiento para editar.' };

  if (original.transferId) {
    const pair = transactions.filter(tx => tx.transferId === original.transferId);
    if (pair.length !== 2) return { ok: false, reason: 'La transferencia vinculada está incompleta y no se puede editar con seguridad.' };
    if (!pair.some(tx => tx.movement === 'Gasto') || !pair.some(tx => tx.movement === 'Ingreso')) {
      return { ok: false, reason: 'La transferencia vinculada no tiene sus dos movimientos requeridos.' };
    }
    if (normalizeMovement(payload.movement || 'Transferencia') !== 'Transferencia') {
      return { ok: false, reason: 'Las transferencias se editan como un par vinculado.' };
    }
    return {
      ok: true,
      transactions: editTransferPair(transactions, pair, payload, state)
    };
  }

  const nextMovement = normalizeMovement(payload.movement || original.movement);
  if (!['Gasto', 'Ingreso', 'Provisión'].includes(nextMovement)) {
    return { ok: false, reason: 'Este movimiento no se puede convertir en transferencia o presupuesto desde la edición.' };
  }

  const edited = normalizeTransaction({
    ...original,
    ...payload,
    id: original.id,
    source: original.source,
    createdAt: original.createdAt,
    transferId: '',
    linkedId: ''
  }, state);
  const transaction = applyMovementRules(edited, original);
  return {
    ok: true,
    transactions: transactions.map(tx => tx.id === id ? transaction : tx)
  };
}

export function canDuplicateTransaction(transaction) {
  return Boolean(transaction) && !transaction.transferId;
}

function editTransferPair(transactions, pair, payload, state) {
  const outgoing = pair.find(tx => tx.movement === 'Gasto');
  const incoming = pair.find(tx => tx.movement === 'Ingreso');

  const shared = {
    date: payload.date,
    amount: payload.amount,
    description: payload.description,
    transferId: outgoing.transferId,
    recordKind: 'Transferencia',
    affectsBalance: true,
    affectsIncome: false,
    affectsExpense: false,
    affectsBudget: false,
    category: '',
    subcategory: ''
  };
  const editedOutgoing = normalizeTransaction({
    ...outgoing,
    ...shared,
    id: outgoing.id,
    source: outgoing.source,
    createdAt: outgoing.createdAt,
    note: payload.note === undefined ? outgoing.note : payload.note,
    movement: 'Gasto',
    account: payload.account,
    accountTo: payload.accountTo
  }, state);
  const editedIncoming = normalizeTransaction({
    ...incoming,
    ...shared,
    id: incoming.id,
    source: incoming.source,
    createdAt: incoming.createdAt,
    note: payload.note === undefined ? incoming.note : payload.note,
    movement: 'Ingreso',
    account: payload.accountTo,
    accountTo: payload.account
  }, state);

  return transactions.map(tx => {
    if (tx.id === outgoing.id) return editedOutgoing;
    if (tx.id === incoming.id) return editedIncoming;
    return tx;
  });
}

function applyMovementRules(transaction, original) {
  if (transaction.movement === 'Provisión') {
    return {
      ...transaction,
      provisionId: original.movement === 'Provisión' ? original.provisionId : '',
      provisionDelta: transaction.amount,
      affectsBalance: false,
      affectsExpense: false,
      affectsBudget: false,
      recordKind: 'Movimiento por provisión'
    };
  }
  return {
    ...transaction,
    provisionId: '',
    provisionDelta: 0,
    affectsBalance: true,
    affectsIncome: true,
    affectsExpense: true,
    affectsBudget: true,
    recordKind: transaction.movement
  };
}

function groupSum(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || 'Sin categoría';
    acc[k] = (acc[k] || 0) + (Number(item.amount) || 0);
    return acc;
  }, {});
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}
