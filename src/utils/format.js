export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function canon(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\uFFFD/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function html(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function jsString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function parseDate(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return validISODate(text.slice(0, 10));
  const serial = Number(text);
  if (!Number.isNaN(serial) && serial > 40000 && serial < 70000) {
    return validISODate(new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10));
  }
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;
    return validISODate(`${year}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`);
  }
  return '';
}

function validISODate(iso) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10) === iso ? iso : '';
}

export function formatDate(value, long = false) {
  const iso = parseDate(value);
  if (!iso) return 'Sin fecha';
  const [year, month, day] = iso.split('-').map(Number);
  if (long) return `${day} ${MONTHS[month - 1]} ${year}`;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonth(value) {
  if (!value) return '';
  const text = String(value).trim();
  const monthMatch = text.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (monthMatch) {
    const month = `${monthMatch[1]}-${monthMatch[2]}`;
    const number = Number(monthMatch[2]);
    return number >= 1 && number <= 12 ? month : '';
  }
  return parseDate(text).slice(0, 7);
}

export function monthLabel(month) {
  const [year, m] = parseMonth(month || currentMonth()).split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${year}`;
}

export function monthStart(month) {
  return `${parseMonth(month) || currentMonth()}-01`;
}

export function monthEnd(month) {
  const [year, m] = (parseMonth(month) || currentMonth()).split('-').map(Number);
  return new Date(year, m, 0).toISOString().slice(0, 10);
}

export function formatMoney(value, currency = '$') {
  const number = Number(value) || 0;
  return `${currency}${Math.abs(number).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatSignedMoney(value) {
  const number = Number(value) || 0;
  return `${number < 0 ? '-' : ''}${formatMoney(number)}`;
}

export function parseAmount(value) {
  if (value === null || value === undefined) return NaN;
  let text = String(value).trim();
  const negative = /^\(.*\)$/.test(text) || /[−-]/.test(text);
  text = text
    .replace(/[()\s$]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[^0-9,.\-]/g, '');
  const comma = text.lastIndexOf(',');
  const dot = text.lastIndexOf('.');
  if (comma > dot) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(/,/g, '');
  text = text.replace(/-/g, '');
  const number = Number.parseFloat(text);
  return Number.isNaN(number) ? NaN : negative ? -number : number;
}

export function periodBounds(period) {
  const mode = period?.mode || 'month';
  const month = period?.month || currentMonth();
  if (mode === 'range') return { from: period.from || monthStart(month), to: period.to || monthEnd(month) };
  if (mode === 'year') {
    const year = String(period.year || month.slice(0, 4));
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (mode === 'months' && Array.isArray(period.months) && period.months.length) {
    const months = [...period.months].sort();
    return { from: monthStart(months[0]), to: monthEnd(months[months.length - 1]) };
  }
  return { from: monthStart(month), to: monthEnd(month) };
}

export function periodLabel(period) {
  if (!period) return monthLabel(currentMonth());
  if (period.mode === 'range') return `${formatDate(period.from)} - ${formatDate(period.to)}`;
  if (period.mode === 'year') return String(period.year || period.month?.slice(0, 4) || new Date().getFullYear());
  if (period.mode === 'months') return `${period.months?.length || 0} meses`;
  return monthLabel(period.month || currentMonth());
}

export function previousEquivalentPeriod(period) {
  const { from, to } = periodBounds(period);
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const days = Math.round((end - start) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
