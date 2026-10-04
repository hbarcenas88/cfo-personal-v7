import { periodBounds, todayISO } from '../utils/format.js';

export function normalizeProvision(provision = {}) {
  return {
    ...provision,
    balance: nonNegativeAmount(provision.balance),
    monthlyAmount: nonNegativeAmount(provision.monthlyAmount),
    targetAmount: nonNegativeAmount(provision.targetAmount),
    releaseDate: normalizeReleaseDate(provision.releaseDate),
    events: Array.isArray(provision.events) ? provision.events.map(event => ({ ...event })) : []
  };
}

export function normalizeReleaseDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? text
    : '';
}

export function provisionStatus(provision, today = new Date()) {
  const normalized = normalizeProvision(provision);
  if (normalized.balance === 0) return normalized.lastReleasedAt || normalized.events.some(event => event.kind === 'release') ? 'Liberada' : 'Sin saldo';

  const hasTarget = normalized.targetAmount > 0;
  const hasReleaseDate = Boolean(normalized.releaseDate);
  if (!hasTarget && !hasReleaseDate) return 'Sin meta';

  const todayKey = dateKey(today);
  if (hasReleaseDate && todayKey && normalized.releaseDate < todayKey) return 'Vencida';
  if ((hasTarget && normalized.balance >= normalized.targetAmount) ||
      (hasReleaseDate && todayKey && normalized.releaseDate === todayKey)) {
    return 'Lista para liberar';
  }
  return 'En planeación';
}

export function managedProvisionReserve(state = {}) {
  return (state.provisions || []).reduce(
    (sum, provision) => sum + nonNegativeAmount(provision.balance),
    0
  );
}

export function releasedProvisionAmount(state = {}, period = null) {
  const events = (Array.isArray(state.provisionEvents) ? state.provisionEvents : []).concat(
    (state.provisions || []).flatMap(provision =>
      (Array.isArray(provision.events) ? provision.events : [])
        .map(event => ({ ...event, provisionId: event.provisionId || provision.id || '' }))
    )
  );
  const cutoff = period && period.mode !== 'all' ? periodBounds(period).to : '';
  return events
    .filter(event => event.kind === 'release' && releaseOccursBy(event, cutoff))
    .reduce((sum, event) => sum + nonNegativeAmount(event.amount), 0);
}

function releaseOccursBy(event, cutoff) {
  if (!cutoff) return true;
  const eventDate = normalizeReleaseDate(event.date);
  return !eventDate || eventDate <= cutoff;
}

function nonNegativeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function dateKey(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return '';
}


export function getProvisionPlanningStatus(state, provisionId, today = todayISO()) {
  const provision = state.provisions?.find(item => item.id === provisionId);
  const date = normalizeReleaseDate(today);
  const month = date.slice(0, 7);
  const amountCents = provisionAmountCents(provision?.monthlyAmount ?? 0);
  const amount = (amountCents ?? 0) / 100;
  const balance = (provisionAmountCents(provision?.balance ?? 0) ?? 0) / 100;
  const events = (state.provisionEvents || []).concat((state.provisions || []).flatMap(item =>
    (item.events || []).map(event => ({ ...event, provisionId: event.provisionId || item.id }))));
  const releaseAmounts = events.filter(event => event.kind === 'release' && releaseOccursBy(event, date)).map(event => provisionAmountCents(event.amount));
  const releasedCents = releaseAmounts.reduce((sum, value) => sum + (value ?? 0), 0);
  const movementAmounts = (state.transactions || []).filter(tx => tx.date && tx.date <= date).map(tx => provisionAmountCents(tx.provisionDelta ?? 0, { signed: true }));
  const movementCents = movementAmounts.reduce((sum, value) => sum + (value ?? 0), 0);
  const reserve = Math.max(0, movementCents - releasedCents) / 100;
  const assignedAmounts = (state.provisions || []).map(item => provisionAmountCents(item.balance ?? 0));
  const assigned = assignedAmounts.reduce((sum, value) => sum + (value ?? 0), 0) / 100;
  const invalidReserve = [...releaseAmounts, ...movementAmounts, ...assignedAmounts].some(value => value === null);
  const unassigned = Math.max(0, Math.round((reserve - assigned) * 100)) / 100;
  const shortfall = Math.max(0, Math.round((amount - unassigned) * 100)) / 100;
  const alreadyApplied = events.some(event => event.kind === 'allocation' && event.provisionId === provisionId && event.month === month);
  const reason = !provision ? 'La provisión no existe' : !date ? 'Fecha inválida' : amountCents === null ? 'El importe mensual requiere máximo dos decimales' : invalidReserve ? 'Revisa los importes de reserva y saldo: requieren máximo dos decimales' : amount <= 0 ? 'Configura un importe mensual positivo' : alreadyApplied ? 'La planeación de este mes ya fue aplicada' : shortfall > 0 ? 'La reserva sin asignar no alcanza' : '';
  return { month, amount, balance, reserve, assigned, unassigned, alreadyApplied, canApply: !reason, shortfall, reason };
}


export function provisionAmountCents(value, { signed = false } = {}) {
  const text = String(value ?? '').trim().replace(',', '.');
  const pattern = signed ? /^-?\d+(?:\.\d{1,2})?$/ : /^\d+(?:\.\d{1,2})?$/;
  if (!pattern.test(text)) return null;
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? negative ? -amount : amount : null;
}
