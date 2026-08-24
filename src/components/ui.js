import { icon, renderIcons } from '../icons.js';
import { dismissToast, setSettingsPage, setView, state, undo } from '../state.js';
import { html, periodLabel, safeColor } from '../utils/format.js';

export function ensureShell() {
  const app = document.getElementById('app');
  if (!app || app.dataset.shellMounted === 'true') return app;
  app.innerHTML = `
    <div class="app" data-cfo-shell>
      ${renderHeader()}
      <main id="content" class="content">
        <section id="screen-balances" class="screen"></section>
        <section id="screen-summary" class="screen"></section>
        <section id="screen-categories" class="screen"></section>
        <section id="screen-audit" class="screen"></section>
        <section id="screen-settings" class="screen"></section>
      </main>
      ${renderBottomNav()}
      ${renderDrawer()}
      <div id="sheet-root"></div>
      <div id="record-root"></div>
    </div>
  `;
  app.dataset.shellMounted = 'true';
  bindShellEvents();
  renderIcons(app);
  return app;
}

export function updateShellState() {
  const app = document.getElementById('app');
  if (!app) return;
  const scope = activePeriodScope();
  const period = scope === 'audit' ? state.auditPeriod : state.period;
  const label = app.querySelector('[data-period-label]');
  if (label) label.textContent = periodLabel(period);
  const periodPill = app.querySelector('.period-pill');
  periodPill?.setAttribute('data-period-scope', scope);
  const periodContext = app.querySelector('[data-period-context]');
  if (periodContext) {
    periodContext.textContent = 'Sólo afecta Auditoría';
    periodContext.hidden = scope !== 'audit';
  }
  app.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === state.activeView;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute?.('aria-current');
  });
  const drawerButton = app.querySelector('[data-action="drawer"]');
  drawerButton?.setAttribute('aria-expanded', String(Boolean(state.ui.drawerOpen)));
  const drawer = app.querySelector('.drawer-backdrop');
  drawer?.classList.toggle('open', Boolean(state.ui.drawerOpen));
  drawer?.setAttribute('aria-hidden', String(!state.ui.drawerOpen));
}

export function renderShell() {
  ensureShell();
  updateShellState();
}

export function renderHeader() {
  const scope = activePeriodScope();
  const period = scope === 'audit' ? state.auditPeriod : state.period;
  return `
    <header class="topbar">
      <div class="topbar-main">
        <button class="icon-button" data-action="drawer" aria-label="Abrir menú" aria-expanded="${String(Boolean(state.ui.drawerOpen))}">${icon('menu')}</button>
        <div class="brand">
          <div class="brand-title">CFO <span>Personal</span></div>
          <div class="brand-subtitle">Dashboard financiero</div>
        </div>
        <div class="header-actions">
          <button class="icon-button" data-action="search" aria-label="Buscar">${icon('search')}</button>
        </div>
      </div>
      <div class="period-pill" data-period-scope="${scope}">
        <button data-action="prev-period" aria-label="Periodo anterior">${icon('chevronLeft')}</button>
        <button class="period-value" data-action="period">${icon('calendar')}<span class="period-value-copy"><span data-period-label>${periodLabel(period)}</span><small data-period-context ${scope === 'audit' ? '' : 'hidden'}>Sólo afecta Auditoría</small></span></button>
        <button data-action="next-period" aria-label="Periodo siguiente">${icon('chevronRight')}</button>
      </div>
    </header>
  `;
}

export function renderBottomNav() {
  const items = [
    ['balances', 'walletCards', 'Balances'],
    ['summary', 'chart', 'Resumen'],
    ['categories', 'grid', 'Categorías'],
    ['audit', 'listChecks', 'Auditoría']
  ];
  return `
    <nav class="bottom-nav">
      ${navItem(items[0])}
      ${navItem(items[1])}
      <button class="fab-center" data-action="new-record" aria-label="Nuevo registro">${icon('plus')}</button>
      ${navItem(items[2])}
      ${navItem(items[3])}
    </nav>
  `;
}

function navItem([view, iconName, label]) {
  return `<button class="nav-item ${state.activeView === view ? 'active' : ''}" data-view="${view}">${icon(iconName)}<span>${label}</span></button>`;
}

export function renderDrawer() {
  const open = state.ui.drawerOpen ? 'open' : '';
  return `
    <div class="drawer-backdrop ${open}" data-action="close-drawer" aria-hidden="${String(!state.ui.drawerOpen)}">
      <aside class="drawer" onclick="event.stopPropagation()">
        <div class="brand drawer-brand">
          <div class="brand-title">CFO <span>Personal</span></div>
          <div class="brand-subtitle">Centro operativo</div>
        </div>
        <div class="drawer-section">Herramientas</div>
        ${settingsRow('tools', 'database', 'Gestión de datos', 'Importación, exportación y respaldos')}
        ${settingsRow('planning', 'calendarClock', 'Planeación', 'Presupuesto, provisiones y recurrencias')}
        ${settingsRow('accounts', 'landmark', 'Cuentas', 'Orden, KPIs, iconos y colores')}
        ${settingsRow('categories-admin', 'tags', 'Categorías y subcategorías', 'Catálogo de gasto y presupuesto')}
        ${settingsRow('health', 'chart', 'Salud de datos', 'Calidad y posibles errores')}
        ${settingsRow('settings', 'settings', 'Configuración', 'Preferencias y reglas KPI')}
      </aside>
    </div>
  `;
}

function settingsRow(page, iconName, title, subtitle) {
  return `
    <button class="drawer-row" data-settings="${page}">
      ${iconBubble(iconName)}
      <span><strong>${title}</strong><small>${subtitle}</small></span>
      ${trailingIcon()}
    </button>
  `;
}

export function bindShellEvents() {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  document.querySelectorAll('[data-settings]').forEach(button => {
    button.addEventListener('click', () => setSettingsPage(button.dataset.settings));
  });
  document.querySelector('[data-action="drawer"]')?.addEventListener('click', () => {
    state.ui.drawerOpen = true;
    window.dispatchEvent(new CustomEvent('cfo:render', { detail: ['shell'] }));
  });
  document.querySelectorAll('[data-action="close-drawer"]').forEach(el => {
    el.addEventListener('click', () => {
      state.ui.drawerOpen = false;
      window.dispatchEvent(new CustomEvent('cfo:render', { detail: ['shell'] }));
    });
  });
  document.querySelector('[data-action="new-record"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:new-record'));
  });
  document.querySelector('[data-action="period"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:period', { detail: { scope: activePeriodScope() } }));
  });
  document.querySelector('[data-action="search"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:global-search'));
  });
  document.querySelector('[data-action="prev-period"]')?.addEventListener('click', () => requestPeriodShift(-1));
  document.querySelector('[data-action="next-period"]')?.addEventListener('click', () => requestPeriodShift(1));
}

function activePeriodScope() {
  return state.activeView === 'audit' ? 'audit' : 'global';
}

function requestPeriodShift(delta) {
  window.dispatchEvent(new CustomEvent('cfo:period-shift', { detail: { scope: activePeriodScope(), delta } }));
}

export function setScreenActive() {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(`screen-${state.activeView}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === state.activeView));
}

export function card(children, classes = '') {
  return `<div class="card ${classes}">${children}</div>`;
}

export function iconBubble(iconName, color = 'var(--blue)', solid = false, classes = '') {
  const safe = safeColor(color);
  const bg = solid ? safe : softColor(safe);
  const fg = solid ? '#fff' : safe;
  return `<span class="icon-bubble ${solid ? 'solid' : ''} ${classes}" style="--icon-bg:${bg};--icon-fg:${fg};">${icon(iconName)}</span>`;
}

export function metricCard({ title, value, note, iconName, color = 'var(--blue)', wide = false, compact = false, delta = null }) {
  const safe = safeColor(color);
  const deltaText = delta === null ? '' : `<div class="metric-note ${delta >= 0 ? 'success' : 'danger'}">${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%</div>`;
  return card(`
    <div class="metric-top">
      ${iconBubble(iconName, safe, false, 'metric-icon')}
      ${deltaText}
    </div>
    <div class="metric-title">${html(title)}</div>
    <div class="metric-value money" style="color:${safe}">${html(value)}</div>
    <div class="metric-note">${html(note || '')}</div>
    ${sparkline(safe)}
  `, `metric-card ${wide ? 'wide' : ''} ${compact ? 'compact' : ''}`);
}

export function softColor(color) {
  const safe = safeColor(color);
  if (/^#[\da-f]{6}$/i.test(safe)) return `${safe}18`;
  if (safe.includes('green')) return 'var(--green-soft)';
  if (safe.includes('red')) return 'var(--red-soft)';
  return 'var(--blue-soft)';
}

function sparkline(color) {
  const safe = safeColor(color);
  return `<svg class="sparkline" viewBox="0 0 120 32">
    <path d="M2 25 C18 19 18 14 31 17 S47 28 62 18 S83 12 95 18 S108 13 118 7" fill="none" stroke="${safe}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function emptyState(iconName, title, subtitle = '') {
  return `<div class="empty-state">${icon(iconName)}<strong>${html(title)}</strong>${subtitle ? `<small>${html(subtitle)}</small>` : ''}</div>`;
}

export function trailingIcon(iconName = 'chevronRight') {
  return `<span class="trailing-icon" aria-hidden="true">${icon(iconName)}</span>`;
}

export function toastRoot() {
  const root = document.getElementById('toast-root');
  const toast = state.ui.toast;
  if (!root) return;
  root.innerHTML = toast ? `
    <div class="toast show">
      <span>${html(toast.message)}</span>
      <span class="toast-actions">
        ${toast.action ? `<button data-toast-action>${html(toast.action.label)}</button>` : ''}
        <button class="icon-only-button toast-dismiss" data-toast-dismiss aria-label="Cerrar notificación">${icon('x')}</button>
      </span>
    </div>
  ` : '';
  root.querySelector('[data-toast-dismiss]')?.addEventListener('click', dismissToast);
  root.querySelector('[data-toast-action]')?.addEventListener('click', () => {
    if (toast.action?.type === 'undo') undo();
    dismissToast();
  });
}
