import { addAccount, addCategory, addProvision, createOpeningAdjustment, mutate, showToast } from '../state.js';
import { normalizeBudget, normalizeTransaction } from './financeService.js';
import { canon, formatDate, parseAmount, parseDate, parseMonth, todayISO } from '../utils/format.js';
import { inferIcon } from '../icons.js';

export const templateHeaders = {
  accounts: ['nombre', 'tipo', 'saldo_inicial'],
  categories: ['categoria', 'subcategoria'],
  provisions: ['nombre', 'saldo_conceptual', 'planeacion_mensual'],
  recurring: ['tipo', 'nombre', 'dia_mensual', 'monto_esperado', 'cuenta', 'categoria'],
  transactions: ['cuenta', 'movimiento', 'monto', 'categoria', 'subcategoria', 'descripcion', 'fecha'],
  budgets: ['cuenta', 'monto', 'categoria', 'subcategoria', 'descripcion', 'mes']
};

export function parseCSV(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
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
  const payload = type.includes('text/csv') && !String(text).startsWith('\uFEFF') ? `\uFEFF${text}` : text;
  const blob = new Blob([payload], { type });
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
        cuenta: tx.account,
        movimiento: tx.movement,
        monto: tx.amount,
        categoria: tx.category,
        subcategoria: tx.subcategory,
        descripcion: tx.description,
        fecha: tx.date
      }))
    },
    {
      name: datedName('presupuestos'),
      headers: templateHeaders.budgets,
      rows: state.budgets.map(row => ({
        cuenta: row.account,
        monto: row.amount,
        categoria: row.category,
        subcategoria: row.subcategory,
        descripcion: row.description,
        mes: parseMonth(row.month) || row.month
      }))
    },
    {
      name: datedName('cuentas'),
      headers: templateHeaders.accounts,
      rows: state.accounts.map(account => ({
        nombre: account.name,
        tipo: account.type || '',
        saldo_inicial: ''
      }))
    },
    {
      name: datedName('categorias_subcategorias'),
      headers: templateHeaders.categories,
      rows: state.categories.flatMap(cat => (cat.subcategories?.length ? cat.subcategories : [{ name: '' }]).map(sub => ({
        categoria: cat.name,
        subcategoria: sub.name || sub
      })))
    },
    {
      name: datedName('provisiones'),
      headers: templateHeaders.provisions,
      rows: state.provisions.map(p => ({
        nombre: p.name,
        saldo_conceptual: p.balance || 0,
        planeacion_mensual: p.monthlyAmount || 0
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
        categoria: r.category || ''
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
    const created = [];
    for (const row of objects) {
      const name = row.nombre || row.cuenta || row.name;
      const saved = await addAccount({
        name,
        type: row.tipo || row.type || 'Cuenta Corriente',
        icon: inferIcon(row.nombre || row.cuenta, 'account'),
        color: inferColor(name),
        kpi: {
          visible: true,
          income: true,
          expense: true,
          balance: true,
          available: true
        }
      });
      if (saved && name) created.push(row);
    }
    for (const row of created) {
      const name = row.nombre || row.cuenta || row.name;
      await createOpeningAdjustment(name, row.saldo_inicial, 'CSV');
    }
    showToast(`${created.length} cuentas importadas`);
    return;
  }
  if (kind === 'categories') {
    const grouped = new Map();
    objects.forEach(row => {
      const name = row.categoria || row.category;
      if (!name) return;
      if (!grouped.has(name)) grouped.set(name, { name, icon: inferIcon(name), color: inferColor(name), subcategories: [] });
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
      icon: inferIcon(row.nombre, 'provision'),
      color: inferColor(row.nombre || row.name || 'provision')
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
          icon: inferIcon(name, 'recurring'),
          color: inferColor(name)
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
        const month = parseMonth(row.mes || row.month || row.fecha || row.date);
        if (!month) return;
        s.budgets.push(normalizeBudget({
          month,
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
        const date = parseDate(row.fecha || row.date);
        if (!date) return;
        s.transactions.push(normalizeTransaction({
          date,
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
    if (kind === 'transactions' && !parseDate(row.fecha || row.date)) fields.push('Fecha inválida');
    if (kind === 'budgets' && !parseMonth(row.mes || row.month || row.fecha || row.date)) fields.push('Mes invalido');
    if (kind === 'transactions' && row.cuenta && !state.accounts.some(a => canon(a.name) === canon(row.cuenta))) fields.push('Cuenta nueva');
    if ((kind === 'transactions' || kind === 'budgets') && row.categoria && !state.categories.some(c => canon(c.name) === canon(row.categoria))) fields.push('Categoría nueva');
    if (fields.length) issues.push({ row, fields });
  });
  return issues;
}

export function importIssuesV702(kind, objects, state) {
  const issues = [];
  objects.forEach(row => {
    const fields = [];
    if (kind === 'accounts') {
      if (!(row.nombre || row.cuenta || row.name)) fields.push('Nombre requerido');
      if (row.saldo_inicial && Number.isNaN(parseAmount(row.saldo_inicial))) fields.push('Saldo inicial inválido');
    }
    if (kind === 'categories' && !(row.categoria || row.category)) fields.push('Categoría requerida');
    if (kind === 'provisions') {
      if (!(row.nombre || row.name)) fields.push('Nombre requerido');
      if (row.saldo_conceptual && Number.isNaN(parseAmount(row.saldo_conceptual))) fields.push('Saldo conceptual inválido');
      if (row.planeacion_mensual && Number.isNaN(parseAmount(row.planeacion_mensual))) fields.push('Planeación mensual inválida');
    }
    if (kind === 'recurring') {
      if (!(row.nombre || row.name)) fields.push('Nombre requerido');
      if (row.dia_mensual && (Number(row.dia_mensual) < 1 || Number(row.dia_mensual) > 31)) fields.push('Día inválido');
      if (row.monto_esperado && Number.isNaN(parseAmount(row.monto_esperado))) fields.push('Monto inválido');
    }
    if ((kind === 'transactions' || kind === 'budgets') && !parseAmount(row.monto || row.amount || 0)) fields.push('Monto inválido');
    if (kind === 'transactions' && !parseDate(row.fecha || row.date)) fields.push('Fecha inválida');
    if (kind === 'budgets' && !parseMonth(row.mes || row.month || row.fecha || row.date)) fields.push('Mes invalido');
    if (kind === 'transactions' && row.cuenta && !state.accounts.some(a => canon(a.name) === canon(row.cuenta))) fields.push('Cuenta nueva');
    if ((kind === 'transactions' || kind === 'budgets') && row.categoria && !state.categories.some(c => canon(c.name) === canon(row.categoria))) fields.push('Categoría nueva');
    if (fields.length) issues.push({ row, fields });
  });
  return issues;
}

function csvBool(value, fallback = true) {
  const key = canon(value);
  if (!key) return fallback;
  if (['si', 'sí', 'yes', 'true', '1', 'x'].includes(key)) return true;
  if (['no', 'false', '0'].includes(key)) return false;
  return fallback;
}

function inferColor(value = '') {
  const palette = ['#0A8FE8', '#07966F', '#DC3F61', '#7C5CFF', '#C68000', '#00A6C8', '#2563EB', '#0F766E', '#16A34A', '#EA580C', '#BE123C', '#4F46E5'];
  const text = String(value || 'cfo');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

export function explainTemplate(kind) {
  const descriptions = {
    accounts: 'Cuentas admite nombre, tipo y saldo inicial opcional. Icono, color y KPIs se asignan en la app.',
    categories: 'Categorias agrupa categoria y subcategoria. Repite categoria para varias subcategorias.',
    provisions: 'Provisiones admite nombre, saldo conceptual y planeacion mensual.',
    recurring: 'Recurrentes admite pagos e ingresos mensuales; monto puede quedar vacio.',
    transactions: 'Movimientos admite ingresos y gastos; la fecha va al final.',
    budgets: 'Presupuestos se cargan por cuenta, monto, categoria, subcategoria y mes al final.'
  };
  return descriptions[kind] || '';
}
