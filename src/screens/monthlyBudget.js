import { icon } from '../icons.js';
import { renderKeypad } from '../components/keypad.js';
import { monthlyBudgetTotals } from '../services/budgetPlanningService.js';
import { MONTHS, formatMoney, html, monthLabel } from '../utils/format.js';

const accountLabel = value => !value || value === 'Budget' ? 'Sin cuenta' : value;

export function renderMonthlyBudget(state) {
  const draft = state.ui?.monthlyBudgetDraft;
  if (!draft) return '';
  const totals = monthlyBudgetTotals(draft);
  const errors = state.ui.monthlyBudgetErrors || [];
  const base = draft.mode === 'base';
  return `<section class="monthly-budget-screen" aria-label="Planeación mensual" data-monthly-budget-screen>
    <header class="monthly-budget-header">
      <button type="button" class="icon-button" data-monthly-budget-close aria-label="Cerrar planeación">${icon('chevronLeft')}</button>
      <div><small>PLANEACIÓN</small><h2>${base ? 'Presupuesto base' : 'Presupuesto mensual'}</h2></div>
    </header>
    <main class="monthly-budget-body">
      <section class="monthly-budget-intro">
        ${base ? '<p>Tu plantilla habitual. Cárgala en un mes y ajusta lo que cambie.</p>' : `<div class="monthly-budget-month-nav">
          <button type="button" class="icon-button" data-monthly-budget-month-step="-1" aria-label="Mes anterior">${icon('chevronLeft')}</button>
          <button type="button" class="monthly-budget-month-button" data-monthly-budget-month-toggle aria-expanded="${Boolean(state.ui.monthlyBudgetMonthPicker)}">${icon('calendar')} ${html(monthLabel(draft.month))} ${icon('chevronDown')}</button>
          <button type="button" class="icon-button" data-monthly-budget-month-step="1" aria-label="Mes siguiente">${icon('chevronRight')}</button>
        </div>
        ${state.ui.monthlyBudgetMonthPicker ? renderMonthPicker(state, draft) : ''}
        <p>Planea por categoría y ajusta cada importe. Los cambios se guardan juntos al terminar.</p>
        <button type="button" class="secondary-button monthly-budget-copy" data-monthly-budget-copy="">${icon('copy')} Completar desde ${html(monthLabel(draft.previousMonth))}</button>
        <button type="button" class="secondary-button monthly-budget-copy" data-monthly-budget-copy-base>${icon('copy')} Cargar presupuesto base</button>
        <small>Ambas opciones completan filas faltantes y conservan tus importes actuales.</small>`}
        <button type="button" class="secondary-button mt-sm" data-monthly-budget-new-category>${icon('plus')} Añadir categoría</button>
      </section>
      ${errors.length ? `<div class="monthly-budget-errors" role="alert">${errors.map(error => `<p>${html(error.message || error)}</p>`).join('')}</div>` : ''}
      <div class="monthly-budget-categories">${totals.categories.map(category => renderCategory(draft, category)).join('')}</div>
      ${totals.categories.length ? '' : '<div class="card"><strong>Primero crea tus categorías</strong><p>El presupuesto utiliza las categorías de tu catálogo.</p></div>'}
    </main>
    <footer class="monthly-budget-footer">
      <div><small>${base ? 'Total del presupuesto base' : `Total de ${html(monthLabel(draft.month))}`}</small><strong data-monthly-budget-total>${formatMoney(totals.total)}</strong><span>${draft.dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</span></div>
      <div class="monthly-budget-footer-actions"><button type="button" class="secondary-button" data-monthly-budget-close>Cancelar</button><button type="button" class="primary-button" data-monthly-budget-save>Guardar plan</button></div>
    </footer>
  </section>`;
}

function renderMonthPicker(state, draft) {
  const year = Number(state.ui.monthlyBudgetPickerYear || draft.month.slice(0, 4));
  return `<section class="monthly-budget-month-picker" aria-label="Elegir mes y año">
    <div class="monthly-budget-picker-year"><button type="button" class="icon-button" data-monthly-budget-year-step="-1" aria-label="Año anterior">${icon('chevronLeft')}</button><strong>${year}</strong><button type="button" class="icon-button" data-monthly-budget-year-step="1" aria-label="Año siguiente">${icon('chevronRight')}</button></div>
    <div class="monthly-budget-month-grid">${MONTHS.map((name, index) => {
      const value = `${year}-${String(index + 1).padStart(2, '0')}`;
      return `<button type="button" data-monthly-budget-month="${value}" aria-pressed="${value === draft.month}">${name}</button>`;
    }).join('')}</div>
  </section>`;
}

function renderCategory(draft, category) {
  const expanded = (draft.expandedCategories || []).includes(category.name);
  return `<section class="monthly-budget-category">
    <button type="button" class="monthly-budget-category-header" data-monthly-budget-toggle="${html(category.name)}" aria-expanded="${expanded}">
      <span><strong>${html(category.name)}</strong>${draft.mode === 'base' ? '' : `<small>Anterior: ${formatMoney(category.previousTotal)}</small>`}</span><span class="monthly-budget-category-value">${formatMoney(category.total)} ${icon(expanded ? 'chevronUp' : 'chevronDown')}</span>
    </button>
    ${expanded ? `<div class="monthly-budget-category-rows">${category.rows.map(row => renderRow(draft, row)).join('')}
      <button type="button" class="monthly-budget-add" data-monthly-budget-add="${html(category.name)}">${icon('plus')} Añadir otra fila</button>
    </div>` : ''}
  </section>`;
}

function renderRow(draft, row) {
  const previous = (draft.previousRows || []).filter(item => item.category === row.category && (item.subcategory || '') === (row.subcategory || '') && (item.account || 'Budget') === (row.account || 'Budget')).reduce((sum, item) => sum + Math.round(Number(item.amount || 0) * 100), 0) / 100;
  const blank = row.amount === '' || row.amount === null || row.amount === undefined;
  return `<article class="monthly-budget-row" data-monthly-budget-row-id="${html(row.draftId)}">
    <div class="monthly-budget-row-heading"><strong>${html(row.subcategory || 'Sin subcategoría')}</strong><small>${html(accountLabel(row.account))}${row.importMeta ? ' · Importado' : ''}</small></div>
    <button type="button" class="monthly-budget-amount ${blank ? 'is-empty' : ''}" data-monthly-budget-amount="${html(row.draftId)}" aria-label="Editar monto de ${html(row.subcategory || row.category)}">${blank ? 'Asignar monto' : formatMoney(Number(String(row.amount).replace(',', '.')))}</button>
    ${draft.mode === 'base' ? '' : `<small class="monthly-budget-previous">Anterior: ${formatMoney(previous)}</small>`}
    <div class="monthly-budget-row-actions"><button type="button" data-monthly-budget-edit="${html(row.draftId)}" aria-label="Editar detalles de ${html(row.subcategory || row.category)}">${icon('edit')} Detalles</button><button type="button" data-monthly-budget-delete="${html(row.draftId)}" aria-label="Eliminar fila de ${html(row.subcategory || row.category)}">${icon('trash')} Eliminar</button></div>
  </article>`;
}

export function renderMonthlyBudgetAmountSheet(state, row = state.ui?.monthlyBudgetAmountRow) {
  if (!row) return '';
  const display = state.ui?.monthlyBudgetAmountDisplay ?? (row.amount || '0.00');
  const error = state.ui?.monthlyBudgetAmountError || '';
  return `<div class="monthly-budget-modal-backdrop"><section class="monthly-budget-modal monthly-budget-amount-sheet" role="dialog" aria-modal="true" aria-label="Ajustar importe">
    <header><div><small>${html(row.category)}</small><h2>${html(row.subcategory || 'Sin subcategoría')}</h2></div><button type="button" class="icon-button" data-monthly-budget-amount-cancel aria-label="Cancelar importe">${icon('x')}</button></header>
    <div class="monthly-budget-amount-hero"><small>Importe planeado</small><strong data-monthly-budget-amount-display>USD ${html(display)}</strong><p data-monthly-budget-amount-error role="alert" ${error ? '' : 'hidden'}>${html(error)}</p></div>
    ${renderKeypad()}
    <footer><button type="button" class="secondary-button" data-monthly-budget-amount-cancel>Cancelar</button><button type="button" class="primary-button" data-monthly-budget-amount-apply>Usar importe</button></footer>
  </section></div>`;
}

export function renderMonthlyBudgetRowSheet(state, row = state.ui?.monthlyBudgetEditRow) {
  if (!row) return '';
  const quick = Boolean(state.ui?.monthlyBudgetQuickEdit);
  return `<div class="monthly-budget-modal-backdrop"><section class="monthly-budget-modal monthly-budget-row-sheet" role="dialog" aria-modal="true" aria-label="Editar presupuesto puntual">
    <header><div><small>${state.ui.monthlyBudgetDraft?.mode === 'base' && !quick ? 'Presupuesto base' : html(monthLabel(row.month || state.ui.monthlyBudgetDraft?.month))}</small><h2>${quick ? 'Ajuste puntual' : 'Detalles de la fila'}</h2></div><button type="button" class="icon-button" data-monthly-budget-row-cancel aria-label="Cancelar edición">${icon('x')}</button></header>
    <p class="monthly-budget-row-hint">${quick ? 'Este ajuste guarda sólo esta fila.' : 'Guardar incorpora esta fila al borrador. Confirma el conjunto con Guardar plan.'}</p>
    ${[['category', 'Categoría', row.category], ['subcategory', 'Subcategoría', row.subcategory || 'Sin subcategoría'], ['account', 'Cuenta de referencia', accountLabel(row.account)]].map(([field, label, value]) => `<button type="button" class="monthly-budget-field" data-monthly-budget-pick="${field}" data-monthly-budget-row="${html(row.draftId)}"><small>${label}</small><strong>${html(value)}</strong>${icon('chevronDown')}</button>`).join('')}
    <button type="button" class="monthly-budget-field" data-monthly-budget-row-amount-open><small>Importe</small><strong>${formatMoney(Number(String(row.amount || 0).replace(',', '.')))}</strong>${icon('edit')}</button>
    <label class="monthly-budget-description">Nota opcional<input type="text" maxlength="500" value="${html(row.description || '')}" data-monthly-budget-description></label>
    <footer><button type="button" class="secondary-button" data-monthly-budget-row-cancel>Cancelar</button><button type="button" class="primary-button" data-monthly-budget-row-apply>Guardar</button></footer>
  </section></div>`;
}
