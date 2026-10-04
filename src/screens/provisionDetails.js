import { icon } from '../icons.js';
import { card, emptyState } from '../components/ui.js';
import { renderKeypad } from '../components/keypad.js';
import { getProvisionPlanningStatus } from '../services/planningService.js';
import { formatDate, formatMoney, html, monthLabel } from '../utils/format.js';

export function renderProvisionDetails(state) {
  const provision = state.provisions.find(item => item.id === state.ui.provisionDetailsId);
  if (!provision) return `${backButton()}${emptyState('shield', 'La provisión ya no existe')}`;
  const status = getProvisionPlanningStatus(state, provision.id);
  const events = (state.provisionEvents || []).filter(event => event.provisionId === provision.id).slice().reverse();
  return `
    <section class="provision-details">
      <div class="section-title"><h2>${html(provision.name)}</h2>${backButton()}</div>
      ${card(`<small>Saldo vigente</small><strong class="planning-balance money">${formatMoney(provision.balance)}</strong><p class="muted">Reserva conceptual actual; no es un saldo bancario.</p><div class="summary-stat-grid"><div><small>Planeación mensual</small><strong>${formatMoney(provision.monthlyAmount)}</strong></div><div><small>Meta</small><strong>${formatMoney(provision.targetAmount)}</strong></div></div>${provision.releaseDate ? `<p>Fecha prevista: ${formatDate(provision.releaseDate)}</p>` : ''}`)}
      ${card(`<h3>Planeación de ${html(monthLabel(status.month))}</h3><p>${status.alreadyApplied ? 'Planeación aplicada este mes.' : `Asignar ${formatMoney(status.amount)} lleva el saldo a ${formatMoney(Number(provision.balance) + status.amount)}.`}</p><p class="muted">Reserva vigente sin asignar: ${formatMoney(status.unassigned)}</p>${!status.canApply && !status.alreadyApplied ? `<p class="danger">${html(status.reason || (status.shortfall ? `Faltan ${formatMoney(status.shortfall)} de reserva sin asignar.` : 'Define una planeación mensual mayor que cero.'))}</p>` : ''}<button class="primary-button" data-provision-apply="${html(provision.id)}" ${status.canApply ? '' : 'disabled'}>${status.alreadyApplied ? 'Aplicada este mes' : `Aplicar planeación · ${formatMoney(status.amount)}`}</button>${status.shortfall > 0 ? '<button class="secondary-button mt-sm" data-provision-create-reserve>Registrar reserva</button>' : ''}`)}
      ${status.shortfall > 0 ? `<p class="danger">Faltan ${formatMoney(status.shortfall)} de reserva sin asignar.</p>` : ''}
      <div class="planning-row-actions"><button class="planning-action" data-provision-edit="${html(provision.id)}">Editar provisión</button><button class="planning-action" data-provision-release="${html(provision.id)}" ${provision.balance > 0 ? '' : 'disabled'}>Liberar importe</button></div>
      <div class="section-title"><h2>Historial conceptual</h2></div>
      ${card(events.length ? events.map(event => `<div class="row-card"><span class="row-main"><strong>${event.kind === 'allocation' ? 'Planeación asignada' : 'Liberación'}</strong><small>${formatDate(event.date)}${event.month ? ` · ${html(monthLabel(event.month))}` : ''}</small></span><strong>${formatMoney(event.amount)}</strong></div>`).join('') : emptyState('shield', 'Sin operaciones registradas'))}
    </section>
  `;
}

function backButton() {
  return `<button class="chip dense" data-provision-details-back>${icon('chevronLeft')} Volver</button>`;
}

export function renderProvisionAmountSheet(state) {
  const draft = state.ui.planningDraft || {};
  const provision = state.provisions.find(item => item.id === draft.provisionId);
  if (!provision) return '';
  const amount = Number(draft.releaseAmount ?? provision.balance);
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide planning-amount-sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Liberar provisión</h2>
      <p>${html(provision.name)} · saldo vigente ${formatMoney(provision.balance)}</p>
      <div class="planning-amount-hero"><small>Importe a liberar</small><strong class="money" data-planning-amount>${draft.amountExpression ? html(draft.amountExpression) : formatMoney(amount)}</strong></div>
      <button class="chip dense" data-provision-release-all>Liberar todo</button>
      <p>Saldo resultante: <strong data-release-remaining>${formatMoney(Math.max(0, provision.balance - amount))}</strong></p>
      <p class="muted">Reduce la reserva conceptual. No modifica ninguna cuenta ni registra un gasto.</p>
      <p class="danger" data-planning-amount-error role="alert"></p>
      ${renderKeypad()}
      <button class="primary-button" data-confirm-release-provision="${html(provision.id)}">Confirmar liberación</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cancelar</button>
    </section></div>
  `;
}
