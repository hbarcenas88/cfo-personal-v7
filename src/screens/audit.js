import { icon } from '../icons.js';
import { buildAuditComparison } from '../services/financeService.js';
import { card, emptyState, iconBubble } from '../components/ui.js';
import { filterSearchableOptions, renderSearchActivator } from '../components/searchableOptions.js';
import { canon, formatDate, formatMoney, html } from '../utils/format.js';
import { renderAuditCloseEntry, renderAuditCloseList } from './auditClose.js';

export function renderAudit(state) {
  const filters = state.filters.audit;
  return `
    ${renderAuditCloseEntry(state)}
    ${renderAuditCloseList(state)}
    ${renderFilters(state, filters)}
    <div data-audit-results>${renderAuditResults(state)}</div>
  `;
}

export function renderAuditResults(state) {
  const filters = state.filters.audit;
  const comparison = buildAuditComparison(state, state.auditPeriod, filters);
  const rows = comparison.currentRows;
  const subtotal = comparison.currentTotal;
  return `
    ${state.auditPeriod?.compare ? renderComparisonCard(comparison) : ''}
    ${card(`<div class="metric-grid audit-summary-grid"><div><div class="metric-title">Total registros</div><div class="metric-value metric-value-sm">${rows.length}</div></div><div><div class="metric-title">Subtotal filtrado</div><div class="metric-value metric-value-sm ${subtotal < 0 ? 'danger' : 'success'}">${subtotal < 0 ? '-' : ''}${formatMoney(subtotal)}</div></div></div>`)}
    <div class="section-title"><h2>Movimientos</h2></div>
    ${rows.length ? rows.map(tx => transactionCard(tx, state)).join('') : emptyState('listChecks', 'Sin movimientos', 'Crea un registro o ajusta los filtros')}
  `;
}

function renderComparisonCard(comparison) {
  const percentage = comparison.percent === null
    ? 'Sin base anterior'
    : `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toFixed(1)}%`;
  return card(`
    <div class="metric-grid audit-summary-grid">
      <div><div class="metric-title">Total actual</div><div class="metric-value metric-value-sm ${comparison.currentTotal < 0 ? 'danger' : 'success'}">${formatSignedMoney(comparison.currentTotal)}</div></div>
      <div><div class="metric-title">Total anterior</div><div class="metric-value metric-value-sm ${comparison.previousTotal < 0 ? 'danger' : 'success'}">${formatSignedMoney(comparison.previousTotal)}</div></div>
      <div><div class="metric-title">Diferencia</div><div class="metric-value metric-value-sm ${comparison.delta < 0 ? 'danger' : 'success'}">${formatSignedMoney(comparison.delta)}</div></div>
      <div><div class="metric-title">Variación</div><div class="metric-value metric-value-sm">${percentage}</div></div>
    </div>
  `);
}

function renderFilters(state, filters) {
  const activeCount = auditActiveFilterCount(filters);
  const filterLabel = activeCount ? `Filtros (${activeCount})` : 'Filtros';
  return card(`
    <div class="audit-filter-head"><strong>Registros</strong><button type="button" class="chip dense audit-filter-toggle" data-toggle-audit-filters aria-expanded="${Boolean(state.ui.auditFiltersOpen)}" aria-controls="audit-filter-panel"><span data-audit-filter-label>${filterLabel}</span></button></div>
    <div class="search-panel audit-search-panel">
      <input class="input" data-audit-search data-interaction-key="audit-search" placeholder="Buscar movimientos..." aria-label="Buscar movimientos" value="${html(filters.text || '')}">
      <button type="button" class="filter-button audit-clear-button" data-audit-clear-search aria-label="Limpiar búsqueda" ${filters.text ? '' : 'hidden'}>${icon('x')}</button>
    </div>
    <div class="audit-active-summary">
      <div class="chip-row audit-active-filters" data-audit-active-filters>
        ${renderAuditFilterChips(filters)}
      </div>
      <button type="button" class="text-button audit-clear-filters" data-audit-clear-filters ${activeCount ? '' : 'hidden'}>Limpiar todos</button>
    </div>
    ${state.ui.auditFiltersOpen ? `
      <div class="audit-filter-panel" id="audit-filter-panel">
        <div class="chip-row audit-filter-selectors">
          ${selectorChip('Cuenta', 'account', state)}
          ${selectorChip('Tipo', 'type', state)}
          ${selectorChip('Categoría', 'category', state)}
          ${selectorChip('Subcategoría', 'subcategory', state)}
        </div>
      </div>
    ` : ''}
  `);
}

function selectorChip(label, type, state) {
  const alignRight = ['type', 'subcategory'].includes(type) ? ' audit-selector-align-right' : '';
  const controls = `audit-filter-${type}`;
  return `
    <div class="audit-selector${alignRight}">
      <button type="button" class="chip dense audit-filter-control" data-open-filter="${type}" aria-expanded="${state.ui.auditDropdown === type}" aria-controls="${controls}" aria-haspopup="dialog"><span class="chip-label">${label}</span> ${icon('chevronDown')}</button>
      ${state.ui.auditDropdown === type ? renderAuditDropdown(state) : ''}
    </div>
  `;
}

function renderAuditDropdown(state) {
  const type = state.ui.auditDropdown;
  if (!type) return '';
  const key = { account: 'accounts', type: 'types', category: 'categories', subcategory: 'subcategories' }[type];
  const options = auditDropdownOptions(state, type);
  const searchable = options.length > 8;
  const visibleOptions = new Set(filterSearchableOptions(
    options.map(value => ({ value, label: value })),
    state.ui.auditDropdownSearch || ''
  ).map(option => option.value));
  return `
    <div class="audit-dropdown" id="audit-filter-${type}" role="dialog" aria-label="Opciones de ${auditDropdownTitle(type)}">
      <div class="audit-dropdown-head"><strong>${auditDropdownTitle(type)}</strong><button class="icon-button compact" data-audit-dropdown-close aria-label="Cerrar selector">${icon('x')}</button></div>
      ${searchable ? renderAuditSearchActivator(state.ui.auditDropdownSearchActive, state.ui.auditDropdownSearch || '', `audit-filter-${type}-options`) : ''}
      <div class="audit-dropdown-options" id="audit-filter-${type}-options">
        ${options.map(value => `
          <button type="button" class="audit-dropdown-option ${state.filters.audit[key].includes(value) ? 'selected' : ''}" data-audit-dropdown-toggle data-audit-filter-type="${type}" data-audit-dropdown-option="${html(value)}" aria-pressed="${state.filters.audit[key].includes(value)}" ${visibleOptions.has(value) ? '' : 'hidden'}>
            <span>${html(value)}</span>${state.filters.audit[key].includes(value) ? `<span data-option-selected-indicator aria-hidden="true">${icon('check')}</span>` : ''}
          </button>
        `).join('') || '<div class="empty-state">Sin opciones</div>'}
      </div>
      <div class="audit-dropdown-footer"><button class="audit-dropdown-clear audit-filter-footer-action" data-audit-dropdown-clear="${type}">Limpiar</button><button class="secondary-button compact audit-filter-footer-action" data-audit-dropdown-close>Listo</button></div>
    </div>
  `;
}

function renderAuditSearchActivator(active, query, controls) {
  return renderSearchActivator(active, { query, label: 'Buscar opciones de filtro', controls })
    .replace('data-option-search-open', 'data-audit-dropdown-search-open')
    .replace('data-option-search', 'data-audit-dropdown-search')
    .replace('option-search-trigger', 'option-search-trigger audit-dropdown-search-trigger');
}

function auditDropdownOptions(state, type) {
  if (type === 'account') return state.accounts.map(account => account.name);
  if (type === 'type') return ['Gasto', 'Ingreso', 'Transferencia', 'Provisión'];
  if (type === 'category') return [...new Set([...state.categories.map(category => category.name), ...state.transactions.map(tx => tx.category).filter(Boolean)])];
  return [...new Set([
    ...state.categories.flatMap(category => category.subcategories || []).map(sub => sub.name || sub),
    ...state.transactions.map(tx => tx.subcategory).filter(Boolean)
  ])];
}

function auditDropdownTitle(type) {
  return { account: 'Cuenta', type: 'Tipo', category: 'Categoría', subcategory: 'Subcategoría' }[type] || 'Filtro';
}

export function auditActiveFilterCount(filters) {
  return ['accounts', 'types', 'categories', 'subcategories']
    .reduce((count, key) => count + (filters[key]?.length || 0), 0);
}

export function renderAuditFilterChips(filters) {
  const chips = [];
  filters.accounts.forEach(value => chips.push(['accounts', value]));
  filters.types.forEach(value => chips.push(['types', value]));
  filters.categories.forEach(value => chips.push(['categories', value]));
  filters.subcategories.forEach(value => chips.push(['subcategories', value]));
  return chips.map(([type, value]) => `<button type="button" class="chip dense active audit-filter-active" data-filter-remove data-filter-key="${type}" data-filter-value="${html(value)}" aria-label="Quitar filtro ${html(value)}"><span class="chip-label">${html(value)}</span> ${icon('x')}</button>`).join('') || '<span class="row-subtitle">Sin filtros activos</span>';
}

function transactionCard(tx, state) {
  const category = state.categories.find(cat => canon(cat.name) === canon(tx.category));
  const color = category?.color || (tx.movement === 'Ingreso' ? '#07966F' : tx.movement === 'Transferencia' ? '#0A8FE8' : '#DC3F61');
  const amount = signedAmount(tx);
  return card(`
    <div class="audit-card">
      ${iconBubble(category?.icon || txIcon(tx), color, false, 'row-icon')}
      <span class="row-main">
        <span class="row-title">${html(tx.description || tx.movement)}</span>
        <span class="row-subtitle">${html(tx.category || tx.movement)}${tx.subcategory ? ` · ${html(tx.subcategory)}` : ''}</span>
        <span class="row-subtitle audit-meta">${formatDate(tx.date)} · ${html(tx.account)}</span>
        ${tx.transferId ? `<span class="transfer-link">${html(tx.account)} ${icon('link')} ${html(tx.accountTo || 'Cuenta vinculada')}</span>` : ''}
      </span>
      <span class="audit-side"><span class="row-amount ${amount < 0 ? 'danger' : 'success'}">${amount < 0 ? '-' : ''}${formatMoney(amount)}</span><button class="menu-button" data-tx-menu="${html(tx.id)}" aria-label="Abrir acciones">${icon('more')}</button></span>
    </div>
  `, 'audit-card-wrap');
}

function txIcon(tx) {
  if (tx.transferId) return 'repeat';
  if (tx.movement === 'Ingreso') return 'arrowUpRight';
  if (tx.movement === 'Provisión') return 'shield';
  return 'arrowDownRight';
}

function signedAmount(tx) {
  if (tx.movement === 'Gasto') return -Number(tx.amount || 0);
  return Number(tx.amount || 0);
}

function formatSignedMoney(value) {
  return `${value < 0 ? '-' : ''}${formatMoney(value)}`;
}
