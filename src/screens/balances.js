import { icon } from '../icons.js';
import { accountBalances, kpis, provisionAssigned, provisionReserve } from '../services/financeService.js';
import { card, emptyState, iconBubble, metricCard } from '../components/ui.js';
import { formatDate, formatMoney, formatSignedMoney, monthEnd } from '../utils/format.js';

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
    <div class="section-title"><h2>Provisiones</h2></div>
    ${renderProvisionCard(state)}
    <div class="section-title"><h2>Próximos pagos e ingresos</h2><button class="chip dense" data-settings="planning">${icon('calendarClock')} Administrar</button></div>
    ${card(renderUpcoming(state))}
  `;
}

function balanceComboCard(data, state) {
  const cutoff = formatDate(monthEnd(state.period.month || new Date().toISOString().slice(0, 7)));
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
  const color = account.color || '#0A8FE8';
  return `
    <button class="row-card account-balance-row" data-audit-account="${account.name}">
      ${iconBubble(account.icon || 'landmark', color, true, 'row-icon solid-icon')}
      <span class="row-main">
        <span class="row-title">${account.name}</span>
        <span class="row-subtitle stacked"><span>${account.type || 'Cuenta'}</span><em>doble toque audita</em></span>
      </span>
      <span class="row-amount ${balance < 0 ? 'neg' : ''}">${balance < 0 ? '-' : ''}${formatMoney(balance)}</span>
      <span class="chevron">${icon('chevronRight')}</span>
    </button>
  `;
}

function renderAccountTotal(total) {
  return `<div class="row-card row-card-summary account-total-row"><strong>Total de cuentas</strong><strong class="row-amount ${total < 0 ? 'danger' : 'blue'}">${formatSignedMoney(total)}</strong></div>`;
}

function renderProvisionCard(state) {
  const reserve = provisionReserve(state);
  const assigned = provisionAssigned(state);
  const available = reserve - assigned;
  const provisions = state.provisions;
  const segments = provisions.length ? provisions : [{ name: 'Sin provisiones', balance: 0, color: '#BFD0DF' }];
  return card(`
    <div class="provision-layout">
      <div class="donut" style="${donutStyle(segments)}"></div>
      <div class="legend-list">
        <div><strong>Reserva acumulada</strong><div class="row-amount success text-left">${formatMoney(reserve)}</div></div>
        ${segments.slice(0, 4).map(p => `<div class="legend-item"><span class="legend-dot" style="background:${p.color || '#0A8FE8'}"></span><span>${p.name}</span><strong>${formatMoney(p.balance || 0)}</strong></div>`).join('')}
      </div>
    </div>
    <div class="progress provision-progress"><span style="width:${reserve ? Math.min(100, assigned / reserve * 100) : 0}%;background:${available < 0 ? 'var(--red)' : 'var(--amber)'}"></span></div>
    <div class="row-card row-card-summary account-total-row"><strong>Disponible sin asignar</strong><strong class="row-amount ${available < 0 ? 'danger' : 'blue'}">${formatMoney(available)}</strong></div>
    <details class="hidden-details"><summary>Provisiones individuales (${provisions.length}) ${icon('chevronDown')}</summary>${provisions.length ? provisions.map(p => `<div class="row-card account-balance-row">${iconBubble(p.icon || 'shield', p.color || '#C68000', true, 'row-icon solid-icon')}<span class="row-main"><span class="row-title">${p.name}</span><span class="row-subtitle">Reserva conceptual</span></span><strong class="row-amount">${formatMoney(p.balance || 0)}</strong></div>`).join('') : emptyState('shield', 'Sin provisiones', 'Crea una provisión desde Planeación')}</details>
  `);
}

function donutStyle(segments) {
  const total = segments.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  if (!total) return '';
  let start = 0;
  const stops = segments.map(item => {
    const degrees = (Number(item.balance || 0) / total) * 360;
    const color = item.color || '#0A8FE8';
    const part = `${color} ${start}deg ${start + degrees}deg`;
    start += degrees;
    return part;
  });
  return `background:conic-gradient(${stops.join(',')})`;
}

function renderUpcoming(state) {
  const month = state.period.month || new Date().toISOString().slice(0, 7);
  const done = state.recurringDone[month] || {};
  if (!state.recurring.length) return emptyState('calendarClock', 'Sin pagos o ingresos recurrentes', 'Agrégalos desde Planeación');
  return state.recurring
    .slice()
    .sort((a, b) => a.day - b.day)
    .map(item => {
      const status = done[item.id] ? 'Completo' : dueStatus(item.day, month);
      return `
        <div class="row-card upcoming-row">
          ${iconBubble(item.icon || 'calendarClock', item.color || '#0A8FE8', false, 'row-icon')}
          <span class="row-main"><span class="row-title">${item.name}</span><span class="row-subtitle">${item.account || 'Sin cuenta'} · ${item.day} de ${monthName(month)}</span></span>
          <span class="upcoming-state">${item.amount ? `<strong class="row-amount">${formatMoney(item.amount)}</strong>` : ''}<button class="check-pill" data-recurring-done="${item.id}">${status}</button></span>
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
