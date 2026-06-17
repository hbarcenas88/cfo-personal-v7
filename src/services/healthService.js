import { canon, parseDate } from '../utils/format.js';

export function dataHealth(state) {
  const issues = [
    issue('sin-categoria', 'Movimientos sin categoría', 'folder', 'warn', state.transactions.filter(tx => tx.movement === 'Gasto' && !tx.category)),
    issue('sin-cuenta', 'Movimientos sin cuenta', 'wallet', 'bad', state.transactions.filter(tx => !tx.account)),
    issue('monto-cero', 'Montos en cero', 'alert', 'warn', state.transactions.filter(tx => !Number(tx.amount))),
    issue('fecha-futura', 'Fechas futuras', 'calendar', 'warn', state.transactions.filter(tx => parseDate(tx.date) > new Date().toISOString().slice(0, 10))),
    issue('duplicados', 'Posibles duplicados', 'copy', 'warn', duplicateTransactions(state.transactions)),
    issue('transferencias-incompletas', 'Transferencias incompletas', 'link', 'bad', incompleteTransfers(state.transactions)),
    issue('provisiones-negativas', 'Provisiones negativas', 'shield', 'bad', state.provisions.filter(p => Number(p.balance) < 0))
  ].map(item => ({ ...item, dismissed: !!state.healthDismissed[item.id] }));
  const active = issues.filter(item => item.count && !item.dismissed);
  const severity = active.some(item => item.severity === 'bad') ? 'bad' : active.some(item => item.severity === 'warn') ? 'warn' : 'good';
  return { severity, issues, activeCount: active.reduce((sum, item) => sum + item.count, 0) };
}

function issue(id, title, icon, severity, rows) {
  return { id, title, icon, severity, rows, count: rows.length };
}

function duplicateTransactions(transactions) {
  const seen = new Map();
  const duplicates = [];
  transactions.forEach(tx => {
    const key = [parseDate(tx.date), canon(tx.account), canon(tx.movement), Number(tx.amount).toFixed(2), canon(tx.description)].join('|');
    if (seen.has(key)) duplicates.push(tx);
    else seen.set(key, tx.id);
  });
  return duplicates;
}

function incompleteTransfers(transactions) {
  const groups = new Map();
  transactions.filter(tx => tx.transferId).forEach(tx => {
    groups.set(tx.transferId, [...(groups.get(tx.transferId) || []), tx]);
  });
  return [...groups.values()].filter(group => group.length !== 2 || !group.some(tx => tx.movement === 'Ingreso') || !group.some(tx => tx.movement === 'Gasto')).flat();
}
