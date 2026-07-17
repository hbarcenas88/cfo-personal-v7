import { icon } from '../icons.js';
import { iconBubble } from '../components/ui.js';
import { renderKeypad } from '../components/keypad.js';
import { formatMoney, todayISO } from '../utils/format.js';

export function renderRecordRoot(state) {
  const flow = state.ui.recordFlow;
  if (!flow) return '';
  if (flow.step === 'choose') return renderChoose();
  return renderForm(state, flow);
}

function renderChoose() {
  const choices = [
    ['Gasto', 'cart', 'Registra un gasto realizado.', 'expense'],
    ['Ingreso', 'wallet', 'Registra un ingreso recibido.', 'income'],
    ['Transferencia', 'repeat', 'Transfiere dinero entre cuentas.', 'transfer'],
    ['Presupuesto', 'calendar', 'Crea o ajusta un presupuesto.', 'budget'],
    ['Provisión', 'shield', 'Reserva dinero para un objetivo.', 'provision']
  ];
  return `
    <section class="record-screen open">
      <header class="record-header">
        <button class="icon-button" data-record-close aria-label="Cerrar registro">${icon('x')}</button>
        <h2>Nuevo registro</h2>
        <span></span>
      </header>
      <main class="record-body">
        <h1 class="welcome-title record-choice-title">¿Qué deseas registrar?</h1>
        ${choices.map(([title, iconName, text, type]) => `
          <button class="record-choice" data-record-type="${type}">
            ${iconBubble(iconName)}
            <span><strong>${title}</strong><small>${text}</small></span>
            ${icon('chevronRight')}
          </button>
        `).join('')}
        <div class="card mt-lg"><strong>Tip rápido</strong><p class="muted">Usa transferencias para mover dinero entre cuentas sin afectar ingresos, gastos ni presupuesto.</p></div>
      </main>
    </section>
  `;
}

function renderForm(state, flow) {
  const type = flow.type || 'expense';
  const labels = {
    expense: ['Nuevo gasto', 'Gasto', 'var(--red)', 'Gasto'],
    income: ['Nuevo ingreso', 'Ingreso', 'var(--green)', 'Ingreso'],
    transfer: ['Nueva transferencia', 'Transferencia', 'var(--blue)', 'Transferencia'],
    budget: ['Nuevo presupuesto', 'Presupuesto', 'var(--blue)', 'Presupuesto'],
    provision: ['Nueva provisión', 'Provisión', 'var(--amber)', 'Provisión']
  }[type];
  const title = flow.editTransactionId ? `Editar ${labels[1].toLowerCase()}` : labels[0];
  return `
    <section class="record-screen open">
      <header class="record-header">
        <button class="icon-button" data-record-back aria-label="${flow.editTransactionId ? 'Cancelar edición' : 'Volver a tipos'}">${icon('chevronLeft')}</button>
        <h2>${title}</h2>
        <button class="icon-button primary" data-record-save aria-label="${flow.editTransactionId ? 'Guardar cambios' : 'Guardar movimiento'}">${icon('check')}</button>
      </header>
      <main class="record-body">
        <button class="flow-box flow-box-full" data-record-calendar>
          <small>Fecha</small><strong>${flow.date || todayISO()}</strong>
        </button>
        ${type === 'transfer' ? renderTransferFields(state, flow) : renderStandardFields(state, flow, type)}
        <div class="amount-hero">
          <small>${labels[1]}</small>
          <strong class="money record-amount-value" style="--record-accent:${labels[2]}">USD ${flow.displayAmount || '0.00'}</strong>
          ${flow.keypadError ? `<div class="danger mt-xs">${flow.keypadError}</div>` : ''}
        </div>
        <div class="field"><label>Descripción</label><input class="input" data-record-field="description" placeholder="Notas (opcional)..." value="${flow.description || ''}"></div>
        ${type === 'transfer' ? `<div class="card"><strong>Transferencia auditable</strong><p class="muted">Genera dos movimientos vinculados y no impacta ingresos, gastos ni presupuesto.</p></div>` : ''}
        ${renderKeypad({ value: flow.amountExpression, variant: type === 'income' ? 'income' : 'expense', currency: 'USD' })}
      </main>
    </section>
  `;
}

function renderStandardFields(state, flow, type) {
  return `
    ${flow.editTransactionId ? `<div class="record-type-edit">${fieldButton('Tipo', typeLabel(type), 'Seleccionar', 'movement')}</div>` : ''}
    <div class="flow-pair record-field-pair">
      ${fieldButton(type === 'income' ? 'A cuenta' : type === 'budget' ? 'Cuenta presupuesto' : 'De cuenta', flow.account, 'Seleccionar', 'account')}
      ${fieldButton(type === 'income' ? 'Origen' : 'Categoría', flow.category, type === 'income' ? 'Sin categoría' : 'Seleccionar', 'category')}
    </div>
    <div class="chip-row record-chip-row">
      ${subcategories(state, flow.category).map(sub => `<button class="chip dense ${flow.subcategory === sub ? 'active' : ''}" data-record-sub="${sub}"><span class="chip-label">${sub}</span></button>`).join('')}
    </div>
  `;
}

function typeLabel(type) {
  return { expense: 'Gasto', income: 'Ingreso', provision: 'Provisión' }[type] || 'Gasto';
}

function renderTransferFields(state, flow) {
  return `
    <div class="flow-pair record-field-pair">
      ${fieldButton('Desde', flow.account, 'Seleccionar', 'account')}
      ${fieldButton('Hacia', flow.accountTo, 'Seleccionar', 'accountTo')}
    </div>
  `;
}

function fieldButton(label, value, placeholder, key) {
  return `
    <button class="flow-box select-flow" data-record-pick="${key}" type="button">
      <small>${label}</small>
      <strong>${value || placeholder}</strong>
      ${icon('chevronDown')}
    </button>
  `;
}

function subcategories(state, categoryName) {
  return state.categories.find(c => c.name === categoryName)?.subcategories?.map(s => s.name || s) || [];
}

export function recordPayload(flow) {
  const typeMap = { expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', budget: 'Presupuesto', provision: 'Provisión' };
  return {
    movement: typeMap[flow.type],
    date: flow.date || todayISO(),
    account: flow.account || '',
    accountTo: flow.accountTo || '',
    amount: Number(flow.amount) || 0,
    category: flow.category || '',
    subcategory: flow.subcategory || '',
    description: flow.description || ''
  };
}
