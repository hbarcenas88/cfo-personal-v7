import { currentMonth, monthEnd, monthStart, parseDate, previousEquivalentPeriod } from '../utils/format.js';

const isIsoDate = value => {
  const iso = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && parseDate(iso) === iso;
};
const monthFor = period => period?.month || currentMonth();

export function migrateAuditPeriod(period) {
  if (!period || period.mode === 'all') return { mode: 'all', compare: false };
  const draft = createPeriodDraft(period, { scope: 'audit', compare: Boolean(period.compare) });
  const validation = validatePeriodDraft(draft);
  return validation.ok ? stripDraft(draft) : { mode: 'all', compare: false };
}

export function createPeriodDraft(period = {}, { scope = 'global', compare = false } = {}) {
  if (scope === 'audit' && period.mode === 'all') {
    return { scope, mode: 'all', month: monthFor(period), year: Number(monthFor(period).slice(0, 4)), from: '', to: '', compare: false, tab: 'range' };
  }
  const mode = ['month', 'year', 'range'].includes(period.mode) ? period.mode : 'month';
  const month = monthFor(period);
  const year = Number(period.year || month.slice(0, 4));
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
  if (draft.mode === 'all') return { ok: true };
  if (draft.mode !== 'range') return { ok: true };
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
