import { icon, renderIcons } from '../icons.js';
import { dismissToast, setSettingsPage, setView, state, undo } from '../state.js';
import { periodLabel } from '../utils/format.js';

export function renderShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app">
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
  bindShellEvents();
  renderIcons(app);
}

export function renderHeader() {
  return `
    <header class="topbar">
      <div class="topbar-main">
        <button class="icon-button" data-action="drawer" aria-label="Abrir menú">${icon('menu')}</button>
        <div class="brand">
          <div class="brand-title">CFO <span>Personal</span></div>
          <div class="brand-subtitle">Dashboard financiero</div>
        </div>
        <div class="header-actions">
          <button class="icon-button" data-action="search" aria-label="Buscar">${icon('search')}</button>
        </div>
      </div>
      <div class="period-pill">
        <button data-action="prev-period" aria-label="Periodo anterior">${icon('chevronLeft')}</button>
        <button class="period-value" data-action="period">${periodLabel(state.period)}</button>
        <button data-action="next-period" aria-label="Periodo siguiente">${icon('chevronRight')}</button>
      </div>
    </header>
  `;
}

export function renderBottomNav() {
  const items = [
    ['balances', 'walletCards', 'Balances'],
    ['summary', 'barChart', 'Resumen'],
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
    <div class="drawer-backdrop ${open}" data-action="close-drawer">
      <aside class="drawer" onclick="event.stopPropagation()">
        <div class="brand" style="text-align:left;margin-bottom:14px;">
          <div class="brand-title">CFO <span>Personal</span></div>
          <div class="brand-subtitle">Centro operativo</div>
        </div>
        <div class="drawer-section">Principal</div>
        ${drawerRow('balances', 'walletCards', 'Balances', 'Situación financiera')}
        ${drawerRow('summary', 'barChart', 'Resumen', 'Indicadores y gráficos')}
        ${drawerRow('categories', 'grid', 'Categorías', 'Presupuesto detallado')}
        ${drawerRow('audit', 'listChecks', 'Auditoría', 'Explorar movimientos')}
        <div class="drawer-section">Herramientas</div>
        ${settingsRow('tools', 'database', 'Gestión de datos', 'Importación, exportación y respaldos')}
        ${settingsRow('planning', 'calendarClock', 'Planeación', 'Presupuesto, provisiones y recurrencias')}
        ${settingsRow('catalogs', 'tags', 'Catálogos', 'Cuentas, categorías, iconos y colores')}
        ${settingsRow('health', 'chart', 'Salud de datos', 'Calidad y posibles errores')}
        ${settingsRow('settings', 'settings', 'Configuración', 'Preferencias y reglas KPI')}
      </aside>
    </div>
  `;
}

function drawerRow(view, iconName, title, subtitle) {
  return `
    <button class="drawer-row" data-view="${view}">
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon(iconName)}</span>
      <span><strong>${title}</strong><small>${subtitle}</small></span>
      ${icon('chevronRight')}
    </button>
  `;
}

function settingsRow(page, iconName, title, subtitle) {
  return `
    <button class="drawer-row" data-settings="${page}">
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon(iconName)}</span>
      <span><strong>${title}</strong><small>${subtitle}</small></span>
      ${icon('chevronRight')}
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
    renderShell();
    window.dispatchEvent(new CustomEvent('cfo:render'));
  });
  document.querySelectorAll('[data-action="close-drawer"]').forEach(el => {
    el.addEventListener('click', () => {
      state.ui.drawerOpen = false;
      renderShell();
      window.dispatchEvent(new CustomEvent('cfo:render'));
    });
  });
  document.querySelector('[data-action="new-record"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:new-record'));
  });
  document.querySelector('[data-action="period"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:period'));
  });
  document.querySelector('[data-action="search"]')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('cfo:global-search'));
  });
  document.querySelector('[data-action="prev-period"]')?.addEventListener('click', () => shiftMonth(-1));
  document.querySelector('[data-action="next-period"]')?.addEventListener('click', () => shiftMonth(1));
}

function shiftMonth(delta) {
  const period = state.period;
  if (period.mode === 'year') period.year = Number(period.year || period.month.slice(0, 4)) + delta;
  else {
    const [year, month] = String(period.month).split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    period.mode = 'month';
    period.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  window.dispatchEvent(new CustomEvent('cfo:persist-render'));
}

export function setScreenActive() {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  document.getElementById(`screen-${state.activeView}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === state.activeView));
}

export function card(children, classes = '') {
  return `<div class="card ${classes}">${children}</div>`;
}

export function metricCard({ title, value, note, iconName, color = 'var(--blue)', wide = false, delta = null }) {
  const deltaText = delta === null ? '' : `<div class="metric-note ${delta >= 0 ? 'success' : 'danger'}">${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%</div>`;
  return card(`
    <div class="metric-top">
      <span class="metric-icon" style="background:${softColor(color)};color:${color}">${icon(iconName)}</span>
      ${deltaText}
    </div>
    <div class="metric-title">${title}</div>
    <div class="metric-value money" style="color:${color}">${value}</div>
    <div class="metric-note">${note || ''}</div>
    ${sparkline(color)}
  `, `metric-card ${wide ? 'wide' : ''}`);
}

export function softColor(color) {
  if (color.startsWith('#')) return `${color}18`;
  if (color.includes('green')) return 'var(--green-soft)';
  if (color.includes('red')) return 'var(--red-soft)';
  return 'var(--blue-soft)';
}

function sparkline(color) {
  return `<svg class="sparkline" viewBox="0 0 120 32">
    <path d="M2 25 C18 19 18 14 31 17 S47 28 62 18 S83 12 95 18 S108 13 118 7" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function emptyState(iconName, title, subtitle = '') {
  return `<div class="empty-state">${icon(iconName)}<strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ''}</div>`;
}

export function toastRoot() {
  const root = document.getElementById('toast-root');
  const toast = state.ui.toast;
  root.innerHTML = toast ? `
    <div class="toast show">
      <span>${toast.message}</span>
      <span>
        ${toast.action ? `<button data-toast-action>${toast.action.label}</button>` : ''}
        <button data-toast-dismiss>${icon('x')}</button>
      </span>
    </div>
  ` : '';
  root.querySelector('[data-toast-dismiss]')?.addEventListener('click', dismissToast);
  root.querySelector('[data-toast-action]')?.addEventListener('click', () => {
    if (toast.action?.type === 'undo') undo();
    dismissToast();
  });
}
