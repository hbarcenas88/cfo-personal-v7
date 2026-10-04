import { icon } from '../icons.js';
import { accountBalances, kpis, provisionAssigned, provisionReserve } from '../services/financeService.js';
import { card, emptyState, iconBubble, metricCard } from '../components/ui.js';
import { formatDate, formatMoney, formatSignedMoney, html, periodBounds, todayISO, safeColor } from '../utils/format.js';

export function renderBalances(state) {
  const data = kpis(state);
  const balances = accountBalances(state);
  const ordered = [...state.accounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const visible = ordered.filter(account => account.kpi?.visible !== false);
  const hidden = ordered.filter(account => account.kpi?.visible === false);
  return `
    <div class="metric-grid balances-metrics">
      ${balanceComboCard(data, state)}
      ${metricCard({ title: 'Ingresos período', value: formatMoney(data.income), note: 'Según selector de período', iconName: 'arrowUpRight', color: 'var(--green)', compact: true, delta: data.incomeDelta })}
      ${metricCard({ title: 'Gastos período', value: formatMoney(data.expense), note: 'Sin transferencias', iconName: 'arrowDownRight', color: 'var(--red)', compact: true, delta: data.expenseDelta })}
    </div>
    <div class="section-title"><h2>Saldos por cuenta</h2></div>
    ${card(renderAccountList(visible, balances, 'Sin cuentas visibles', 'Crea una cuenta o importa catálogos para empezar') + renderHiddenAccounts(hidden, balances) + renderAccountTotal(data.balanceTotal), 'account-total-card')}
    <div class="section-title"><h2>Provisiones</h2><button class="chip dense" data-planning-focus="provisions">${icon('shield')} Administrar</button></div>
    ${renderProvisionCard(state)}
    <div class="section-title"><h2>Próximos pagos e ingresos</h2><button class="chip dense" data-settings="planning">${icon('calendarClock')} Administrar</button></div>
    ${card(renderUpcoming(state))}
  `;
}

function balanceComboCard(data, state) {
  const cutoff = formatDate(periodBounds(state.period).to || todayISO());
  return card(`
    ${balanceMetricItem({
      title: 'Balance total',
      value: formatSignedMoney(data.balanceTotal),
      noteLines: [`${data.includedAccounts} de ${data.totalAccounts} cuentas`, `hasta ${cutoff}`],
      iconName: 'walletCards',
      color: data.balanceTotal < 0 ? 'var(--red)' : 'var(--blue)'
    })}
    ${balanceMetricItem({
      title: 'Disponible',
      value: formatSignedMoney(data.available),
      noteLines: [`${data.availableAccounts} de ${data.totalAccounts} cuentas`, 'menos reserva'],
      iconName: 'badgeDollar',
      color: data.available < 0 ? 'var(--red)' : 'var(--green)'
    })}
  `, 'balance-combo-card');
}

function balanceMetricItem({ title, value, noteLines, iconName, color }) {
  return `
    <div class="balance-combo-item">
      ${iconBubble(iconName, color, false, 'metric-icon')}
      <div class="metric-title">${title}</div>
      <div class="metric-value money" style="color:${color}">${value}</div>
      <div class="metric-note">${noteLines.map(line => `<span>${line}</span>`).join('')}</div>
    </div>
  `;
}

function renderAccountList(accounts, balances, emptyTitle, emptySub) {
  if (!accounts.length) return emptyState('wallet', emptyTitle, emptySub);
  return accounts.map(account => accountRow(account, balances[account.name] || 0)).join('');
}

function renderHiddenAccounts(accounts, balances) {
  if (!accounts.length) return '';
  return `
    <details class="hidden-details">
      <summary>Cuentas ocultas (${accounts.length}) ${icon('chevronDown')}</summary>
      ${accounts.map(account => accountRow(account, balances[account.name] || 0)).join('')}
    </details>
  `;
}

function accountRow(account, balance) {
  const color = safeColor(account.color, '#0A8FE8');
  const accountName = html(account.name);
  return `
    <div class="row-card account-balance-row">
      ${iconBubble(account.icon || 'landmark', color, true, 'row-icon solid-icon')}
      <span class="row-main">
        <span class="row-title">${accountName}</span>
        <span class="row-subtitle">${html(account.type || 'Cuenta')}</span>
      </span>
      <span class="account-balance-actions">
        <span class="row-amount ${balance < 0 ? 'neg' : ''}">${balance < 0 ? '-' : ''}${formatMoney(balance)}</span>
        <button class="text-button account-audit-action" data-audit-account="${accountName}">Auditar saldo</button>
      </span>
    </div>
  `;
}

function renderAccountTotal(total) {
  return `<div class="row-card row-card-summary account-total-row"><strong>Total de cuentas</strong><strong class="row-amount ${total < 0 ? 'danger' : 'blue'}">${formatSignedMoney(total)}</strong></div>`;
}

function renderProvisionCard(state) {
  const reserve = provisionReserve(state, { mode: 'range', from: '0001-01-01', to: todayISO() });
  const assigned = provisionAssigned(state);
  const available = (Math.round(reserve * 100) - Math.round(assigned * 100)) / 100;
  const provisions = state.provisions || [];
  return card(`
    <p class="provision-summary-note">Saldos conceptuales vigentes</p>
    <div class="provision-number-grid">
      <div class="provision-number" data-provision-summary="reserve"><span>Reserva acumulada</span><strong>${formatMoney(reserve)}</strong></div>
      <div class="provision-number" data-provision-summary="assigned"><span>Asignado</span><strong>${formatMoney(assigned)}</strong></div>
      <div class="provision-number provision-number-highlight ${available < 0 ? 'danger' : ''}" data-provision-summary="unassigned"><span>Sin asignar</span><strong>${available < 0 ? '-' : ''}${formatMoney(available)}</strong></div>
    </div>
    <div class="provision-summary-rows">${provisions.length ? provisions.map(p => `<button class="row-card account-balance-row provision-open" data-provision-details="${html(p.id)}">${iconBubble(p.icon || 'shield', p.color || '#C68000', true, 'row-icon solid-icon')}<span class="row-main"><span class="row-title">${html(p.name)}</span><span class="row-subtitle">Planeado ${formatMoney(p.monthlyAmount || 0)}/mes</span></span><strong class="row-amount">${formatMoney(p.balance || 0)}</strong></button>`).join('') : emptyState('shield', 'Sin provisiones', 'Crea una provisión desde Planeación')}</div>
  `, 'provision-summary-card');
}

function renderUpcoming(state) {
  const month = state.period.month || new Date().toISOString().slice(0, 7);
  const done = state.recurringDone[month] || {};
  if (!state.recurring.length) return emptyState('calendarClock', 'Sin pagos o ingresos recurrentes', 'Agrégalos desde Planeación');
  return state.recurring
    .slice()
    .sort((a, b) => a.day - b.day)
    .map(item => {
      const completed = Boolean(done[item.id]);
      const status = completed ? 'Completo' : dueStatus(item.day, month);
      return `
        <div class="row-card upcoming-row">
          ${iconBubble(item.icon || 'calendarClock', item.color || '#0A8FE8', false, 'row-icon')}
          <span class="row-main"><span class="row-title">${html(item.name)}</span><span class="row-subtitle">${html(item.account || 'Sin cuenta')} · ${formatDate(`${month}-${String(item.day).padStart(2, '0')}`)}</span></span>
          <span class="upcoming-state">${item.amount ? `<strong class="row-amount">${formatMoney(item.amount)}</strong>` : ''}<button class="check-pill${completed ? ' selected' : ''}" data-recurring-done="${html(item.id)}" aria-pressed="${completed}">${completed ? icon('check') : ''}${status}</button></span>
        </div>
      `;
    }).join('');
}

function dueStatus(day, month) {
  const today = new Date();
  const due = new Date(`${month}-${String(day).padStart(2, '0')}T12:00:00`);
  const diff = Math.ceil((due - today) / 86400000);
  if (diff < 0) return 'Vencido';
  if (diff <= 3) return `${diff} días`;
  return 'Pendiente';
}

function monthName(month) {
  const date = new Date(`${month}-01T12:00:00`);
  return date.toLocaleDateString('es-PA', { month: 'long' });
}
