import { addAccount, addCategory, addProvision, mutate, showToast } from '../state.js';
import { normalizeBudget, normalizeTransaction } from './financeService.js';
import { canon, formatDate, parseAmount, parseDate, todayISO } from '../utils/format.js';
import { inferIcon } from '../icons.js';

export const templateHeaders = {
  accounts: ['nombre', 'tipo', 'icono', 'color', 'visible', 'impacta_ingresos', 'impacta_gastos', 'impacta_balance'],
  categories: ['categoria', 'icono_categoria', 'color_categoria', 'subcategoria'],
  provisions: ['nombre', 'saldo_conceptual', 'planeacion_mensual', 'icono', 'color'],
  recurring: ['tipo', 'nombre', 'dia_mensual', 'monto_esperado', 'cuenta', 'categoria', 'icono', 'color'],
  transactions: ['fecha', 'cuenta', 'cuenta_destino', 'movimiento', 'monto', 'categoria', 'subcategoria', 'descripcion', 'origen'],
  budgets: ['mes', 'cuenta', 'monto', 'categoria', 'subcategoria', 'descripcion', 'origen']
};

export function parseCSV(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return { rows, delimiter };
}

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find(Boolean) || '';
  return (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
}

export function rowsToObjects(rows) {
  const headers = (rows[0] || []).map(header => canon(header));
  return rows.slice(1).map((row, index) => {
    const obj = { __row: index + 2 };
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? '';
    });
    return obj;
  });
}

export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCSV(headers, rows) {
  return [headers.join(','), ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))].join('\r\n');
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return filename;
}

export function datedName(prefix, extension = 'csv') {
  const [year, month, day] = todayISO().split('-');
  return `${prefix}_${day}_${month}_${year}.${extension}`;
}

export function exportCSVs(state) {
  const files = [
    {
      name: datedName('movimientos'),
      headers: templateHeaders.transactions,
      rows: state.transactions.map(tx => ({
        fecha: tx.date,
        cuenta: tx.account,
        cuenta_destino: tx.accountTo || '',
        movimiento: tx.movement,
        monto: tx.amount,
        categoria: tx.category,
        subcategoria: tx.subcategory,
        descripcion: tx.description,
        origen: tx.source || 'Manual'
      }))
    },
    {
      name: datedName('presupuestos'),
      headers: templateHeaders.budgets,
      rows: state.budgets.map(row => ({
        mes: row.month,
        cuenta: row.account,
        monto: row.amount,
        categoria: row.category,
        subcategoria: row.subcategory,
        descripcion: row.description,
        origen: row.source || 'Manual'
      }))
    },
    {
      name: datedName('cuentas'),
      headers: templateHeaders.accounts,
      rows: state.accounts.map(account => ({
        nombre: account.name,
        tipo: account.type || '',
        icono: account.icon || '',
        color: account.color || '',
        visible: account.kpi?.visible !== false ? 'si' : 'no',
        impacta_ingresos: account.kpi?.income !== false ? 'si' : 'no',
        impacta_gastos: account.kpi?.expense !== false ? 'si' : 'no',
        impacta_balance: account.kpi?.balance !== false ? 'si' : 'no'
      }))
    },
    {
      name: datedName('categorias_subcategorias'),
      headers: templateHeaders.categories,
      rows: state.categories.flatMap(cat => (cat.subcategories?.length ? cat.subcategories : [{ name: '' }]).map(sub => ({
        categoria: cat.name,
        icono_categoria: cat.icon || '',
        color_categoria: cat.color || '',
        subcategoria: sub.name || sub
      })))
    },
    {
      name: datedName('provisiones'),
      headers: templateHeaders.provisions,
      rows: state.provisions.map(p => ({
        nombre: p.name,
        saldo_conceptual: p.balance || 0,
        planeacion_mensual: p.monthlyAmount || 0,
        icono: p.icon || '',
        color: p.color || ''
      }))
    },
    {
      name: datedName('recurrentes'),
      headers: templateHeaders.recurring,
      rows: state.recurring.map(r => ({
        tipo: r.type,
        nombre: r.name,
        dia_mensual: r.day,
        monto_esperado: r.amount || '',
        cuenta: r.account || '',
        categoria: r.category || '',
        icono: r.icon || '',
        color: r.color || ''
      }))
    }
  ];
  files.forEach(file => downloadText(file.name, toCSV(file.headers, file.rows)));
  showToast(`${files.length} CSV generados`);
}

export function downloadTemplate(kind) {
  const headers = templateHeaders[kind];
  if (!headers) return;
  const filename = downloadText(datedName(`template_${kind}`), `${headers.join(',')}\r\n`);
  showToast(`Template descargado: ${filename}`);
}

export async function importCatalog(kind, objects) {
  if (kind === 'accounts') {
    for (const row of objects) await addAccount({
      name: row.nombre || row.cuenta || row.name,
      type: row.tipo || row.type || 'Cuenta',
      icon: row.icono || inferIcon(row.nombre || row.cuenta, 'account'),
      color: row.color || '#0A8FE8'
    });
    showToast(`${objects.length} cuentas importadas`);
    return;
  }
  if (kind === 'categories') {
    const grouped = new Map();
    objects.forEach(row => {
      const name = row.categoria || row.category;
      if (!name) return;
      if (!grouped.has(name)) grouped.set(name, { name, icon: row.icono_categoria || inferIcon(name), color: row.color_categoria || '#0A8FE8', subcategories: [] });
      if (row.subcategoria || row.subcategory) grouped.get(name).subcategories.push(row.subcategoria || row.subcategory);
    });
    for (const item of grouped.values()) await addCategory(item);
    showToast(`${grouped.size} categorías importadas`);
    return;
  }
  if (kind === 'provisions') {
    for (const row of objects) await addProvision({
      name: row.nombre || row.name,
      balance: parseAmount(row.saldo_conceptual || row.balance || 0) || 0,
      monthlyAmount: parseAmount(row.planeacion_mensual || row.monthly || 0) || 0,
      icon: row.icono || inferIcon(row.nombre, 'provision'),
      color: row.color || '#C68000'
    });
    showToast(`${objects.length} provisiones importadas`);
    return;
  }
  if (kind === 'recurring') {
    await mutate(s => {
      objects.forEach(row => {
        const name = row.nombre || row.name;
        if (!name) return;
        s.recurring.push({
          id: crypto.randomUUID?.() || `rec-${Date.now()}-${Math.random()}`,
          type: canon(row.tipo).includes('ingreso') ? 'Ingreso' : 'Pago',
          name,
          day: Number(row.dia_mensual || row.day) || 1,
          amount: parseAmount(row.monto_esperado || row.amount || 0) || 0,
          account: row.cuenta || row.account || '',
          category: row.categoria || row.category || '',
          icon: row.icono || inferIcon(name, 'recurring'),
          color: row.color || '#0A8FE8'
        });
      });
      s.onboarded = true;
    }, { undo: 'Recurrencias importadas' });
    showToast(`${objects.length} recurrencias importadas`);
  }
}

export async function importTransactions(kind, objects, state) {
  await mutate(s => {
    if (kind === 'budgets') {
      objects.forEach(row => {
        const amount = parseAmount(row.monto || row.amount || row.presupuesto || 0);
        if (!amount) return;
        s.budgets.push(normalizeBudget({
          month: row.mes || parseDate(row.fecha)?.slice(0, 7) || s.period.month,
          account: row.cuenta || 'Budget',
          amount,
          category: row.categoria,
          subcategory: row.subcategoria,
          description: row.descripcion,
          source: 'CSV'
        }, s));
      });
    } else {
      objects.forEach(row => {
        const amount = parseAmount(row.monto || row.amount || 0);
        if (!amount) return;
        s.transactions.push(normalizeTransaction({
          date: row.fecha,
          account: row.cuenta,
          accountTo: row.cuenta_destino,
          movement: row.movimiento || row.tipo,
          amount,
          category: row.categoria,
          subcategory: row.subcategoria,
          description: row.descripcion,
          source: 'CSV'
        }, s));
      });
    }
    s.onboarded = true;
  }, { undo: 'CSV importado' });
  showToast(`${objects.length} filas importadas`);
}

export function importIssues(kind, objects, state) {
  const issues = [];
  objects.forEach(row => {
    const fields = [];
    if ((kind === 'transactions' || kind === 'budgets') && !parseAmount(row.monto || row.amount || 0)) fields.push('Monto inválido');
    if (kind === 'transactions' && !parseDate(row.fecha)) fields.push('Fecha inválida');
    if (kind === 'transactions' && row.cuenta && !state.accounts.some(a => canon(a.name) === canon(row.cuenta))) fields.push('Cuenta nueva');
    if ((kind === 'transactions' || kind === 'budgets') && row.categoria && !state.categories.some(c => canon(c.name) === canon(row.categoria))) fields.push('Categoría nueva');
    if (fields.length) issues.push({ row, fields });
  });
  return issues;
}

export function explainTemplate(kind) {
  const descriptions = {
    accounts: 'Cuentas admite icono, color y reglas KPI desde CSV.',
    categories: 'Categorias agrupa categoria y subcategoria. Repite categoria para varias subcategorias.',
    provisions: 'Provisiones admite nombre, saldo conceptual y planeacion mensual.',
    recurring: 'Recurrentes admite pagos e ingresos mensuales; monto puede quedar vacio.',
    transactions: 'Movimientos admite ingresos, gastos, transferencias y origen CSV.',
    budgets: 'Presupuestos se cargan por mes, categoria y subcategoria.'
  };
  return descriptions[kind] || '';
}
