import { icon } from '../icons.js';
import { periodPresetState } from '../services/periodService.js';
import { currentMonth, formatDate, periodLabel } from '../utils/format.js';

export function renderPeriodSheet(draft, options) {
  const scope = options.scope;
  return `
    <div class="sheet-backdrop open" data-period-close>
      <section class="sheet wide period-sheet" data-period-scope="${scope}" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${scope === 'audit' ? 'Período de Auditoría' : 'Selecciona un período'}</h2>
        <div class="period-sheet-content" data-period-mode="${draft.tab}">
          <div class="segmented" data-period-tabs>
            <button class="${draft.tab === 'range' ? 'active' : ''}" data-period-tab="range">Por rango</button>
            <button class="${draft.tab === 'year' ? 'active' : ''}" data-period-tab="year">Por año</button>
          </div>
          ${scope === 'audit' ? renderAuditScopeActions(draft, options.dashboardPeriod) : ''}
          <div id="period-draft" data-period-draft-region>
            ${draft.tab === 'year' ? renderYear(draft) : renderRange(draft, options.dashboardPeriod)}
          </div>
          ${options.showComparison ? `
            <label class="analysis-toggle period-compare-toggle">
              <span><strong>Comparar con período anterior</strong><small>${options.previousLabel}</small></span>
              <input type="checkbox" data-period-compare ${draft.compare ? 'checked' : ''} ${draft.mode === 'all' ? 'disabled' : ''}>
              <i></i>
            </label>
          ` : ''}
          ${draft.error ? `<p class="period-draft-error" role="alert">${draft.error}</p>` : ''}
        </div>
        <div class="period-sheet-footer">
          <button class="secondary-button" data-period-close>Cancelar</button>
          <button class="primary-button" data-period-apply${options.applyEnabled ? ' aria-disabled="false"' : ' disabled aria-disabled="true"'}>Aplicar</button>
        </div>
      </section>
    </div>
  `;
}

function renderRange(draft, dashboardPeriod) {
  const presets = [
    ['thisMonth', 'Este mes', periodLabel({ mode: 'month', month: currentMonth() })],
    ['lastMonth', 'Mes pasado', 'Período mensual anterior'],
    ['thisYear', 'Este año', String(new Date().getFullYear())],
    ['custom', 'Personalizado', draft.from && draft.to ? `${formatDate(draft.from)} - ${formatDate(draft.to)}` : 'Rango libre']
  ];
  return `
    <div class="tour-list period-preset-list">
      ${presets.map(([key, title, subtitle]) => {
        const state = periodPresetState(draft, key, dashboardPeriod);
        return `
        <button class="record-choice ${state.selected ? 'selected' : ''}" data-period-preset="${key}" aria-pressed="${state.selected}">
          <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('calendar')}</span>
          <span><strong>${title}</strong><small>${subtitle}</small></span>
          ${state.selected ? periodSelectedIndicator() : icon('chevronRight')}
        </button>
      `;
      }).join('')}
    </div>
    ${draft.mode === 'range' ? `<div class="two-col period-date-fields">
      <button class="flow-box" data-period-date="from"><small>Desde</small><strong>${draft.from ? formatDate(draft.from, true) : 'Seleccionar'}</strong></button>
      <button class="flow-box" data-period-date="to"><small>Hasta</small><strong>${draft.to ? formatDate(draft.to, true) : 'Seleccionar'}</strong></button>
    </div>` : ''}
  `;
}

function renderAuditScopeActions(draft, dashboardPeriod) {
  const allState = periodPresetState(draft, 'all', dashboardPeriod);
  return `
    <div class="tour-list period-scope-actions">
      <button class="record-choice ${allState.selected ? 'selected' : ''}" data-period-preset="all" aria-pressed="${allState.selected}">
        <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('calendar')}</span>
        <span><strong>Todo el historial</strong><small>Todos los registros disponibles</small></span>
        ${allState.selected ? periodSelectedIndicator() : icon('chevronRight')}
      </button>
      <button class="record-choice" data-period-copy-dashboard>
        <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('copy')}</span>
        <span><strong>Usar período del dashboard</strong><small>Copia el período global actual</small></span>
        ${icon('chevronRight')}
      </button>
    </div>
  `;
}

function renderYear(draft) {
  const current = Number(draft.year || new Date().getFullYear());
  const years = Array.from({ length: 8 }, (_, i) => current - 4 + i);
  return `
    <div class="icon-grid period-mode-grid">
      ${years.map(year => {
        const selected = draft.mode === 'year' && year === Number(draft.year);
        return `<button class="icon-choice ${selected ? 'active selected' : ''}" data-period-year="${year}" aria-pressed="${selected}"><span>${year}</span>${selected ? periodSelectedIndicator() : ''}</button>`;
      }).join('')}
    </div>
  `;
}

function periodSelectedIndicator() {
  return `<span class="period-selected-indicator" data-period-selected-indicator aria-hidden="true">${icon('check')}</span>`;
}
