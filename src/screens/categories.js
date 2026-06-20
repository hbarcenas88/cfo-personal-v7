import { icon } from '../icons.js';
import { budgetSummary, categoryRows } from '../services/financeService.js';
import { card, emptyState, softColor } from '../components/ui.js';
import { canon, formatMoney } from '../utils/format.js';

export function renderCategories(state) {
  const filters = state.filters.categories;
  const budget = budgetSummary(state);
  let rows = categoryRows(state);
  if (filters.text) rows = rows.filter(row => canon(row.name).includes(canon(filters.text)));
  if (filters.categories.length) rows = rows.filter(row => filters.categories.some(cat => canon(cat) === canon(row.name)));
  rows = rows.filter(row => filters.view === 'budget' ? row.planned > 0 : filters.view === 'spend' ? row.spent > 0 : row.planned > 0 || row.spent > 0);
  return `
    ${renderFilterPanel(filters, state)}
    ${renderBudgetExecution(budget, filters.budgetExpanded !== false)}
    <div class="segmented">
      <button class="${filters.view === 'combined' ? 'active' : ''}" data-cat-view="combined">Combinado</button>
      <button class="${filters.view === 'budget' ? 'active' : ''}" data-cat-view="budget">Solo presupuesto</button>
      <button class="${filters.view === 'spend' ? 'active' : ''}" data-cat-view="spend">Solo gasto</button>
    </div>
    <div class="section-title"><h2>Categorías</h2></div>
    ${rows.length ? rows.map(row => categoryCard(row, filters.expanded.includes(row.name))).join('') : emptyState('grid', 'Sin datos en este período', 'Ajusta fechas, filtros o carga datos')}
  `;
}

function renderFilterPanel(filters, state) {
  return card(`
    <div class="metric-top">
      <h2 class="card-heading">Filtros de categorías</h2>
      <button class="chip dense" data-clear-cat-filters>Limpiar filtros</button>
    </div>
    <div class="search-panel">
      <input class="input" data-cat-search placeholder="Buscar y agregar categorías..." value="${filters.text || ''}">
      <button class="filter-button">${icon('search')}</button>
    </div>
    <div class="chip-row">
      ${filters.categories.map(cat => `<button class="chip dense active" data-remove-cat-filter="${cat}"><span class="chip-label">${cat}</span> ${icon('x')}</button>`).join('')}
      ${state.categories.filter(cat => !filters.categories.includes(cat.name)).slice(0, 6).map(cat => `<button class="chip dense" data-add-cat-filter="${cat.name}"><span class="chip-label">${cat.name}</span></button>`).join('')}
    </div>
  `);
}

function renderBudgetExecution(budget, expanded = true) {
  return card(`
    <div class="metric-top">
      <div><div class="metric-title">Ejecución presupuestaria</div><div class="metric-value metric-value-lg blue">${budget.executedPct.toFixed(0)}%</div></div>
      <button class="chip dense ${expanded ? 'active' : ''}" data-budget-toggle>${expanded ? 'Cerrar' : 'Detalle'}</button>
    </div>
    <div class="progress tight"><span style="width:${Math.min(100, budget.executedPct)}%;background:${budget.executedPct > 100 ? 'var(--red)' : 'var(--green)'}"></span></div>
    ${expanded ? `<div class="budget-grid">
      ${budgetLine('Presupuesto total', budget.totalBudget, 'blue')}
      ${budgetLine('Gasto dentro del presupuesto', budget.used)}
      ${budgetLine('Pendiente por usar', budget.pending)}
      ${budgetLine('No presupuestado', budget.unbudgeted, 'danger')}
      ${budgetLine('Exceso presupuestado', budget.budgetedExcess, 'danger')}
      ${budgetLine('Excedente total', budget.excessTotal, 'danger', 'data-audit-excess')}
      ${budgetLine('Disponible', budget.available, budget.available < 0 ? 'danger' : 'success')}
      ${budgetLine(budget.margin >= 0 ? 'Margen para cubrir pendiente' : 'Faltante para cubrir pendiente', budget.margin, budget.margin < 0 ? 'danger' : 'success')}
    </div>` : ''}
  `);
}

function budgetLine(label, amount, cls = '', attr = '') {
  return `<div class="row-card compact" ${attr}><span><strong>${label}</strong>${attr ? '<small class="row-subtitle">Doble toque para auditar</small>' : ''}</span><strong class="row-amount ${cls}">${amount < 0 ? '-' : ''}${formatMoney(amount)}</strong></div>`;
}

function categoryCard(row, expanded) {
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
    ${over ? `<div class="row-subtitle mt-sm">Exceso: <strong class="danger">${formatMoney(row.spent - row.planned)}</strong></div>` : ''}
    ${expanded ? `<div class="subrows">${row.subcategories.length ? row.subcategories.map(sub => `<div class="subrow"><span>${sub.name}</span><strong>${formatMoney(sub.spent)} / ${formatMoney(sub.planned)}</strong></div>`).join('') : '<div class="row-subtitle">Sin subcategorías</div>'}</div>` : ''}
  `, 'category-card');
}
