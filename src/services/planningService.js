import { periodBounds } from '../utils/format.js';

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
  if (normalized.balance === 0) return 'Liberada';

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
  return Math.max(0, Number(value) || 0);
}

function dateKey(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return '';
}
