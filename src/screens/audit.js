import { icon } from '../icons.js';
import { periodTransactions } from '../services/financeService.js';
import { card, emptyState, iconBubble } from '../components/ui.js';
import { canon, formatDate, formatMoney, html } from '../utils/format.js';

export function renderAudit(state) {
  const filters = state.filters.audit;
  const base = periodTransactions(state);
  const rows = filterRows(base, filters);
  const subtotal = rows.reduce((sum, tx) => sum + signedAmount(tx), 0);
  return `
    ${renderFilters(state, filters)}
    ${card(`<div class="metric-grid audit-summary-grid"><div><div class="metric-title">Total registros</div><div class="metric-value metric-value-sm">${rows.length}</div></div><div><div class="metric-title">Subtotal filtrado</div><div class="metric-value metric-value-sm ${subtotal < 0 ? 'danger' : 'success'}">${subtotal < 0 ? '-' : ''}${formatMoney(subtotal)}</div></div></div>`)}
    <div class="section-title"><h2>Movimientos</h2></div>
    ${rows.length ? rows.map(tx => transactionCard(tx, state)).join('') : emptyState('listChecks', 'Sin movimientos', 'Crea un registro o ajusta los filtros')}
  `;
}

function renderFilters(state, filters) {
  return card(`
    <div class="audit-filter-head"><strong>Registros</strong><small>Busca y combina filtros</small></div>
    <div class="search-panel">
      <input class="input" data-audit-search placeholder="Buscar movimientos..." value="${filters.text || ''}">
      <button class="filter-button" data-audit-clear>${icon('x')}</button>
    </div>
    <div class="chip-row audit-active-filters">
      ${filterChips(filters)}
    </div>
    <div class="chip-row audit-filter-selectors">
      ${selectorChip('Cuenta', 'account', state)}
      ${selectorChip('Tipo', 'type', state)}
      ${selectorChip('Categoría', 'category', state)}
      ${selectorChip('Subcategoría', 'subcategory', state)}
    </div>
  `);
}

function selectorChip(label, type, state) {
  return `
    <div class="audit-selector">
      <button class="chip dense" data-open-filter="${type}" aria-expanded="${state.ui.auditDropdown === type}"><span class="chip-label">${label}</span> ${icon('chevronDown')}</button>
      ${state.ui.auditDropdown === type ? renderAuditDropdown(state) : ''}
    </div>
  `;
}

function renderAuditDropdown(state) {
  const type = state.ui.auditDropdown;
  if (!type) return '';
  const key = { account: 'accounts', type: 'types', category: 'categories', subcategory: 'subcategories' }[type];
  const search = state.ui.auditDropdownSearch || '';
  const options = auditDropdownOptions(state, type)
    .filter(value => !search || canon(value).includes(canon(search)))
    .slice(0, 80);
  return `
    <div class="audit-dropdown" role="dialog" aria-label="Opciones de filtro">
      <div class="audit-dropdown-head"><strong>${auditDropdownTitle(type)}</strong><button class="icon-button compact" data-audit-dropdown-close aria-label="Cerrar selector">${icon('x')}</button></div>
      ${options.length > 8 ? `<input class="input audit-dropdown-search" data-audit-dropdown-search placeholder="Buscar..." value="${html(search)}" autofocus>` : ''}
      <div class="audit-dropdown-options">
        ${options.map(value => `
          <button class="audit-dropdown-option ${state.filters.audit[key].includes(value) ? 'selected' : ''}" data-audit-dropdown-toggle="${type}:${html(value)}">
            <span>${html(value)}</span>${state.filters.audit[key].includes(value) ? icon('check') : ''}
          </button>
        `).join('') || '<div class="empty-state">Sin opciones</div>'}
      </div>
      <div class="audit-dropdown-footer"><button class="audit-dropdown-clear" data-audit-dropdown-clear="${type}">Limpiar</button><button class="secondary-button compact" data-audit-dropdown-close>Listo</button></div>
    </div>
  `;
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

function filterChips(filters) {
  const chips = [];
  filters.accounts.forEach(value => chips.push(['accounts', value]));
  filters.types.forEach(value => chips.push(['types', value]));
  filters.categories.forEach(value => chips.push(['categories', value]));
  filters.subcategories.forEach(value => chips.push(['subcategories', value]));
  return chips.map(([type, value]) => `<button class="chip dense active" data-filter-remove="${type}:${value}"><span class="chip-label">${value}</span> ${icon('x')}</button>`).join('') || '<span class="row-subtitle">Sin filtros activos</span>';
}

function transactionCard(tx, state) {
  const category = state.categories.find(cat => canon(cat.name) === canon(tx.category));
  const color = category?.color || (tx.movement === 'Ingreso' ? '#07966F' : tx.movement === 'Transferencia' ? '#0A8FE8' : '#DC3F61');
  const amount = signedAmount(tx);
  return card(`
    <div class="audit-card">
      ${iconBubble(category?.icon || txIcon(tx), color, false, 'row-icon')}
      <span class="row-main">
        <span class="row-title">${tx.description || tx.movement}</span>
        <span class="row-subtitle">${tx.category || tx.movement}${tx.subcategory ? ` · ${tx.subcategory}` : ''}</span>
        <span class="row-subtitle audit-meta">${formatDate(tx.date)} · ${tx.account}</span>
        ${tx.transferId ? `<span class="transfer-link">${tx.account} ${icon('link')} ${tx.accountTo || 'Cuenta vinculada'}</span>` : ''}
      </span>
      <span class="audit-side"><span class="row-amount ${amount < 0 ? 'danger' : 'success'}">${amount < 0 ? '-' : ''}${formatMoney(amount)}</span><button class="menu-button" data-tx-menu="${tx.id}" aria-label="Abrir acciones">${icon('more')}</button></span>
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

function filterRows(rows, filters) {
  return rows.filter(tx => {
    const text = canon([tx.description, tx.category, tx.subcategory, tx.account, tx.movement].join(' '));
    if (filters.text && !text.includes(canon(filters.text))) return false;
    if (filters.accounts.length && !filters.accounts.some(v => canon(v) === canon(tx.account))) return false;
    if (filters.types.length) {
      const type = tx.transferId ? 'Transferencia' : tx.movement;
      if (!filters.types.some(v => canon(v) === canon(type))) return false;
    }
    if (filters.categories.length && !filters.categories.some(v => canon(v) === canon(tx.category))) return false;
    if (filters.subcategories.length && !filters.subcategories.some(v => canon(v) === canon(tx.subcategory))) return false;
    return true;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
