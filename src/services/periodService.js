import { currentMonth, monthEnd, monthStart, parseDate, previousEquivalentPeriod } from '../utils/format.js';

const isIsoDate = value => {
  const iso = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && parseDate(iso) === iso;
};
// Persisted periods accept ordinary financial history and near-term planning, but reject malformed years.
const MIN_PERIOD_YEAR = 1900;
const MAX_PERIOD_YEAR = 2100;
const isValidYear = value => Number.isInteger(value) && value >= MIN_PERIOD_YEAR && value <= MAX_PERIOD_YEAR;
const isValidMonth = value => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return isValidYear(year) && month >= 1 && month <= 12;
};
const monthFor = (period, mode) => {
  if (isValidMonth(period?.month)) return period.month;
  if (mode === 'year' && isValidYear(period?.year)) return `${period.year}-01`;
  if (mode === 'range' && isIsoDate(period?.from)) return period.from.slice(0, 7);
  return currentMonth();
};

export function migrateAuditPeriod(period) {
  if (!period || period.mode === 'all') return { mode: 'all', compare: false };
  if (!isValidPersistedPeriod(period)) return { mode: 'all', compare: false };
  const draft = createPeriodDraft(period, { scope: 'audit', compare: Boolean(period.compare) });
  const validation = validatePeriodDraft(draft);
  return validation.ok ? stripDraft(draft) : { mode: 'all', compare: false };
}

export function createPeriodDraft(period = {}, { scope = 'global', compare = false } = {}) {
  if (scope === 'audit' && period.mode === 'all') {
    const month = monthFor(period, 'all');
    return { scope, mode: 'all', month, year: Number(month.slice(0, 4)), from: '', to: '', compare: false, tab: 'range' };
  }
  const mode = ['month', 'year', 'range'].includes(period.mode) ? period.mode : 'month';
  const month = monthFor(period, mode);
  const year = isValidYear(period.year) ? period.year : Number(month.slice(0, 4));
  const bounds = mode === 'range'
    ? { from: period.from || monthStart(month), to: period.to || monthEnd(month) }
    : { from: '', to: '' };
  return { scope, mode, month, year, ...bounds, compare: Boolean(period.compare ?? compare), tab: mode === 'year' ? 'year' : 'range' };
}

export function applyDraftPreset(draft, preset, dashboardPeriod) {
  if (preset === 'all') return { ...draft, mode: 'all', from: '', to: '', compare: false, tab: 'range' };
  if (preset === 'dashboard') return { ...createPeriodDraft(dashboardPeriod, { scope: draft.scope }), compare: false, tab: 'range' };
  const now = currentMonth();
  if (preset === 'thisMonth') return { ...draft, mode: 'month', month: now, year: Number(now.slice(0, 4)), from: '', to: '', tab: 'range' };
  if (preset === 'lastMonth') return { ...draft, ...shiftPeriod({ mode: 'month', month: now }, -1), from: '', to: '', tab: 'range' };
  if (preset === 'thisYear') return { ...draft, mode: 'year', year: Number(now.slice(0, 4)), month: `${now.slice(0, 4)}-01`, from: '', to: '', tab: 'year' };
  if (preset === 'custom') return { ...draft, mode: 'range', from: draft.from || `${now}-01`, to: draft.to || monthEnd(now), month: (draft.from || now).slice(0, 7), tab: 'range' };
  return draft;
}

export function setDraftDate(draft, field, value) {
  return { ...draft, mode: 'range', [field]: value, month: value.slice(0, 7), tab: 'range' };
}

export function shiftPeriod(period, delta) {
  if (period.mode === 'year') {
    const year = Number(period.year || period.month?.slice(0, 4)) + delta;
    return { mode: 'year', year, month: `${year}-01` };
  }
  if (period.mode === 'range') {
    const start = new Date(`${period.from}T12:00:00`);
    const end = new Date(`${period.to}T12:00:00`);
    const days = Math.round((end - start) / 86400000) + 1;
    const from = shiftIsoDate(period.from, days * delta);
    const to = shiftIsoDate(period.to, days * delta);
    return { mode: 'range', from, to, month: from.slice(0, 7) };
  }
  const [year, month] = monthFor(period).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return { mode: 'month', month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` };
}

function shiftIsoDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function validatePeriodDraft(draft) {
  if (!draft || !['all', 'month', 'year', 'range'].includes(draft.mode)) return { ok: false, message: 'Selecciona un período válido.' };
  if (draft.mode === 'all') return { ok: true };
  if (!isValidMonth(draft.month)) return { ok: false, message: 'Selecciona un mes válido.' };
  if (draft.mode === 'month') return { ok: true };
  if (draft.mode === 'year') {
    if (!isValidYear(draft.year) || draft.year !== Number(draft.month.slice(0, 4))) return { ok: false, message: 'Selecciona un año válido.' };
    return { ok: true };
  }
  if (!isIsoDate(draft.from) || !isIsoDate(draft.to)) return { ok: false, message: 'Selecciona ambas fechas.' };
  if (draft.from > draft.to) return { ok: false, message: 'La fecha inicial no puede ser posterior a la final.' };
  return { ok: true };
}

export function isComparisonAvailable(period) {
  return period?.mode !== 'all';
}

export function comparisonPeriod(period) {
  return { mode: 'range', ...previousEquivalentPeriod(period) };
}

function stripDraft(draft) {
  const { scope, tab, ...period } = draft;
  return period;
}

function isValidPersistedPeriod(period) {
  if (!['month', 'year', 'range'].includes(period?.mode)) return false;
  if (period.mode === 'month') {
    return isValidMonth(period.month) && (!Object.hasOwn(period, 'year') || (isValidYear(period.year) && period.year === Number(period.month.slice(0, 4))));
  }
  if (period.mode === 'year') {
    return isValidYear(period.year) && (!period.month || (isValidMonth(period.month) && Number(period.month.slice(0, 4)) === period.year));
  }
  if (!isIsoDate(period.from) || !isIsoDate(period.to) || period.from > period.to) return false;
  if (period.month && !isValidMonth(period.month)) return false;
  return !Object.hasOwn(period, 'year') || isValidYear(period.year);
}
