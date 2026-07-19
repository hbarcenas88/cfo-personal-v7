import { icon } from '../icons.js';
import { buildCategoryComparison, categoryRows } from '../services/financeService.js';
import { card, emptyState, softColor } from '../components/ui.js';
import { canon, formatMoney, html, periodLabel } from '../utils/format.js';

export function renderCategories(state) {
  const filters = state.filters.categories;
  const comparison = filters.compare && filters.view !== 'budget'
    ? buildCategoryComparison(state, state.period, filters)
    : null;
  let rows = comparison?.rows || categoryRows(state);
  if (!comparison) {
    if (filters.text) rows = rows.filter(row => canon(row.name).includes(canon(filters.text)));
    if (filters.categories.length) rows = rows.filter(row => filters.categories.some(cat => canon(cat) === canon(row.name)));
    rows = rows.filter(row => filters.view === 'budget' ? row.planned > 0 : filters.view === 'spend' ? row.spent > 0 : row.planned > 0 || row.spent > 0);
  }
  return `
    ${renderFilterPanel(filters, state)}
    <div class="segmented">
      <button class="${filters.view === 'combined' ? 'active' : ''}" data-cat-view="combined">Combinado</button>
      <button class="${filters.view === 'budget' ? 'active' : ''}" data-cat-view="budget">Solo presupuesto</button>
      <button class="${filters.view === 'spend' ? 'active' : ''}" data-cat-view="spend">Solo gasto</button>
    </div>
    <div class="section-title"><h2>Categorías</h2></div>
    ${comparison ? renderComparisonSummary(comparison) : ''}
    ${rows.length ? rows.map(row => categoryCard(row, filters.expanded.includes(row.name), Boolean(comparison))).join('') : emptyState('grid', 'Sin datos en este período', 'Ajusta fechas, filtros o carga datos')}
  `;
}

function renderComparisonSummary(comparison) {
  const percentage = comparison.percent === null
    ? 'Sin base anterior'
    : `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toFixed(1)}%`;
  return `
    <div class="category-comparison-summary">
      <div><span>Gasto del período</span><strong>${formatMoney(comparison.currentSpent)}</strong></div>
      <div><span>vs. período anterior (${periodLabel(comparison.previousPeriod)})</span><strong class="${comparison.delta > 0 ? 'danger' : comparison.delta < 0 ? 'success' : ''}">${formatSignedDelta(comparison.delta)} · ${percentage}</strong></div>
    </div>
  `;
}

function renderFilterPanel(filters, state) {
  const activeCount = filters.categories.length;
  const label = activeCount ? `Categorías (${activeCount})` : 'Todas las categorías';
  return card(`
    <div class="metric-top">
      <h2 class="card-heading">Filtros de categorías</h2>
      <button class="chip dense" data-clear-cat-filters>Limpiar filtros</button>
    </div>
    <div class="category-filter-controls">
      <input class="input" data-cat-search placeholder="Buscar categorías..." value="${html(filters.text || '')}">
      <div class="category-selector">
        <button class="chip dense category-filter-trigger" data-open-category-filter aria-expanded="${Boolean(state.ui.categoryDropdown)}"><span class="chip-label">${label}</span>${icon('chevronDown')}</button>
        ${state.ui.categoryDropdown ? renderCategoryDropdown(state) : ''}
      </div>
    </div>
  `);
}

function renderCategoryDropdown(state) {
  const selected = state.filters.categories.categories;
  return `
    <div class="category-filter-dropdown" role="dialog" aria-label="Filtrar categorías">
      <div class="audit-dropdown-head"><strong>Categorías</strong><button class="icon-button compact" data-category-filter-close aria-label="Cerrar selector">${icon('x')}</button></div>
      <div class="category-filter-options">
        ${state.categories.length ? state.categories.map(category => {
          const included = selected.includes(category.name);
          return `<button class="category-filter-option ${included ? 'selected' : ''}" data-category-filter-toggle="${html(category.name)}"><span>${html(category.name)}</span>${included ? icon('check') : ''}</button>`;
        }).join('') : '<div class="empty-state">Sin categorías</div>'}
      </div>
      <div class="audit-dropdown-footer"><button class="audit-dropdown-clear" data-category-filter-clear>Limpiar</button><button class="secondary-button compact" data-category-filter-close>Listo</button></div>
    </div>
  `;
}

function categoryCard(row, expanded, showComparison) {
  const pct = row.planned ? Math.min(999, row.spent / row.planned * 100) : 0;
  const over = row.planned && row.spent > row.planned;
  const color = row.color || '#0A8FE8';
  return card(`
    <button class="row-card interactive" data-cat-expand="${row.name}">
      <span class="row-icon" style="background:${softColor(color)};color:${color}">${icon(row.icon || 'folder')}</span>
      <span class="row-main">
        <span class="row-title">${row.name}</span>
        <span class="row-subtitle">${row.planned ? `${formatMoney(row.spent)} / ${formatMoney(row.planned)}` : `${formatMoney(row.spent)} sin presupuesto`}</span>
      </span>
      <span class="row-amount ${over ? 'danger' : ''}">${formatMoney(row.spent)}<small class="row-amount-note" style="--amount-note-color:${over ? 'var(--red)' : 'var(--green)'}">${row.planned ? `${pct.toFixed(0)}%` : 'sin ppto'}</small></span>
    </button>
    <div class="progress"><span style="width:${row.planned ? Math.min(100, pct) : 100}%;background:${over ? 'var(--red)' : color}"></span></div>
    ${showComparison ? renderComparisonNote(row) : ''}
    ${over ? `<div class="row-subtitle mt-sm">Exceso: <strong class="danger">${formatMoney(row.spent - row.planned)}</strong></div>` : ''}
    ${expanded ? `<div class="subrows">${row.subcategories.length ? row.subcategories.map(sub => `<div class="subrow"><span>${sub.name}</span><strong>${formatMoney(sub.spent)} / ${formatMoney(sub.planned)}</strong></div>`).join('') : '<div class="row-subtitle">Sin subcategorías</div>'}</div>` : ''}
  `, 'category-card');
}

function renderComparisonNote(row) {
  if (row.spentDeltaPercent === null) return '<div class="category-comparison-note">vs. período anterior: Sin base anterior</div>';
  const percentage = `${row.spentDeltaPercent > 0 ? '+' : ''}${row.spentDeltaPercent.toFixed(1)}%`;
  const deltaClass = row.spentDelta > 0 ? 'danger' : row.spentDelta < 0 ? 'success' : '';
  return `<div class="category-comparison-note">vs. período anterior: <strong class="${deltaClass}">${formatSignedDelta(row.spentDelta)} · ${percentage}</strong></div>`;
}

function formatSignedDelta(value) {
  return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatMoney(value)}`;
}
