import { icon } from '../icons.js';
import { MONTHS, currentMonth, formatDate, monthEnd, monthStart, periodLabel } from '../utils/format.js';
import { renderCalendarSheet } from './calendar.js';

export function renderPeriodSheet(period) {
  const draft = { mode: period.mode || 'month', month: period.month || currentMonth(), from: period.from, to: period.to, year: period.year || period.month?.slice(0, 4) || new Date().getFullYear(), tab: period.tab || 'range' };
  return `
    <div class="sheet-backdrop open" data-period-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">Selecciona un período</h2>
        <div class="segmented" data-period-tabs>
          <button class="${draft.tab === 'range' ? 'active' : ''}" data-period-tab="range">Por rango</button>
          <button class="${draft.tab === 'compare' ? 'active' : ''}" data-period-tab="compare">Comparar</button>
          <button class="${draft.tab === 'year' ? 'active' : ''}" data-period-tab="year">Por año</button>
        </div>
        <div id="period-draft" data-period='${JSON.stringify(draft)}'>
          ${draft.tab === 'year' ? renderYear(draft) : renderRange(draft)}
        </div>
        <button class="primary-button" data-period-apply>Aplicar período</button>
        <button class="secondary-button" style="margin-top:8px;" data-period-close>Cancelar</button>
      </section>
    </div>
  `;
}

function renderRange(draft) {
  const presets = [
    ['thisMonth', 'Este mes', periodLabel({ mode: 'month', month: currentMonth() })],
    ['lastMonth', 'Mes pasado', periodLabel({ mode: 'month', month: shiftMonth(currentMonth(), -1) })],
    ['quarter', 'Este trimestre', 'Trimestre actual'],
    ['year', 'Este año', String(new Date().getFullYear())],
    ['custom', 'Personalizado', draft.from && draft.to ? `${formatDate(draft.from)} - ${formatDate(draft.to)}` : 'Rango libre']
  ];
  return `
    <div class="tour-list" style="margin:12px 0;">
      ${presets.map(([key, title, subtitle]) => `
        <button class="record-choice" data-period-preset="${key}">
          <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('calendar')}</span>
          <span><strong>${title}</strong><small>${subtitle}</small></span>
          ${icon('chevronRight')}
        </button>
      `).join('')}
    </div>
    <div class="two-col">
      <button class="flow-box" data-period-date="from"><small>Desde</small><strong>${draft.from ? formatDate(draft.from, true) : 'Seleccionar'}</strong></button>
      <button class="flow-box" data-period-date="to"><small>Hasta</small><strong>${draft.to ? formatDate(draft.to, true) : 'Seleccionar'}</strong></button>
    </div>
    ${draft.tab === 'compare' ? '<div class="card"><strong>Comparación inicial</strong><p class="muted">Se compara contra el período anterior equivalente. Luego podremos cambiarlo a media del año o últimos 12 meses.</p></div>' : ''}
  `;
}

function renderYear(draft) {
  const current = Number(draft.year || new Date().getFullYear());
  const years = Array.from({ length: 8 }, (_, i) => current - 4 + i);
  return `
    <div class="icon-grid" style="margin:12px 0;">
      ${years.map(year => `<button class="icon-choice ${year === Number(draft.year) ? 'active' : ''}" data-period-year="${year}">${year}</button>`).join('')}
    </div>
  `;
}

export function applyPreset(key) {
  const now = new Date();
  if (key === 'thisMonth') return { mode: 'month', month: currentMonth() };
  if (key === 'lastMonth') return { mode: 'month', month: shiftMonth(currentMonth(), -1) };
  if (key === 'year') return { mode: 'year', year: now.getFullYear(), month: `${now.getFullYear()}-01` };
  if (key === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), q * 3, 1);
    const end = new Date(now.getFullYear(), q * 3 + 3, 0);
    return { mode: 'range', from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), month: start.toISOString().slice(0, 7) };
  }
  return null;
}

export function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function rangeFromMonth(month) {
  return { from: monthStart(month), to: monthEnd(month) };
}

export { renderCalendarSheet };
