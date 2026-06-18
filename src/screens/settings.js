import { COLOR_CATALOG, ICON_CATALOG, icon } from '../icons.js';
import { dataHealth } from '../services/healthService.js';
import { card, emptyState } from '../components/ui.js';
import { explainTemplate, templateHeaders } from '../services/importExportService.js';
import { formatMoney, html } from '../utils/format.js';

export function renderSettings(state) {
  const page = state.settingsPage || 'tools';
  return `
    <div class="section-title">
      <h2>${pageTitle(page)}</h2>
      <button class="chip" data-settings-back>${icon('chevronLeft')} Menú</button>
    </div>
    ${page === 'tools' ? renderTools() : ''}
    ${page === 'planning' ? renderPlanning(state) : ''}
    ${page === 'catalogs' ? renderCatalogs(state) : ''}
    ${page === 'accounts' ? renderAccountsAdmin(state) : ''}
    ${page === 'categories-admin' ? renderCategoriesAdmin(state) : ''}
    ${page === 'provisions-admin' ? renderProvisionsAdmin(state) : ''}
    ${page === 'health' ? renderHealth(state) : ''}
    ${page === 'settings' ? renderPreferences(state) : ''}
  `;
}

function pageTitle(page) {
  return {
    tools: 'Gestión de datos',
    planning: 'Planeación',
    catalogs: 'Catálogos',
    accounts: 'Cuentas',
    'categories-admin': 'Categorías y subcategorías',
    'provisions-admin': 'Provisiones',
    health: 'Salud de datos',
    settings: 'Configuración'
  }[page] || 'Configuración';
}

function renderTools() {
  return card(`
    ${tool('import-transactions', 'fileUp', 'Importar movimientos o presupuesto', 'CSV con preview y validación')}
    ${tool('import-catalogs', 'database', 'Importar catálogos', 'Cuentas, categorías, provisiones y recurrentes')}
    ${tool('export-csv', 'download', 'Exportar multi-CSV', 'Movimientos, presupuestos, catálogos y provisiones')}
    ${tool('templates', 'fileDown', 'Descargar templates', 'Formatos CSV esperados')}
    ${tool('backup', 'backup', 'Respaldo JSON', 'Archivo completo para restaurar')}
    ${tool('restore', 'upload', 'Restaurar respaldo', 'Importa un JSON de CFO Personal')}
    ${tool('debug', 'chart', 'Debug / Storage Inspector', 'Temporal: storage, errores y cache')}
    ${tool('reset-data', 'trash', 'Borrar toda la data', 'Reinicia V7 en este navegador')}
  `, 'tool-card');
}

function renderPlanning(state) {
  return `
    ${card(`${tool('budget-planner', 'calendar', 'Planeación presupuestaria', 'Crea o ajusta presupuesto mensual')}${tool('provision-planner', 'shield', 'Planeación de provisiones', 'Reserva mensual y distribución conceptual')}${tool('recurring', 'calendarClock', 'Pagos e ingresos recurrentes', 'Recordatorios mensuales')}`, 'tool-card')}
    ${card(`<h3 style="margin-top:0;">Recurrentes actuales</h3>${state.recurring.length ? state.recurring.map(r => `<div class="row-card"><span class="row-icon solid-icon" style="background:${r.color || '#0A8FE8'};color:#fff;">${icon(r.icon || 'calendarClock')}</span><span class="row-main"><span class="row-title">${html(r.name)}</span><span class="row-subtitle">${r.type} · día ${r.day}${r.amount ? ` · ${formatMoney(r.amount)}` : ''}</span></span></div>`).join('') : emptyState('calendarClock', 'Sin recurrentes')}`)}
  `;
}

function renderCatalogs(state) {
  return card(`
    ${settingsLink('accounts', 'landmark', 'Cuentas', `${state.accounts.length} cuentas · orden, KPIs, iconos y colores`)}
    ${settingsLink('categories-admin', 'tags', 'Categorías y subcategorías', `${state.categories.length} categorías`)}
    ${settingsLink('provisions-admin', 'shield', 'Provisiones', `${state.provisions.length} provisiones conceptuales`)}
  `, 'tool-card');
}

function renderAccountsAdmin(state) {
  const accounts = [...state.accounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return `
    ${card(`<button class="account-create-button" data-tool="new-account"><span class="create-icon">${icon('plus')}</span><span><strong>Nueva cuenta</strong><small>Define nombre, tipo, icono, color y KPIs.</small></span>${icon('chevronRight')}</button>`, 'account-create-card')}
    ${accounts.length ? accounts.map((account, index) => accountAdminCard(account, index, accounts.length)).join('') : card(emptyState('landmark', 'Sin cuentas', 'Crea una cuenta o importa catálogos para empezar'))}
  `;
}

function accountAdminCard(account, index, total) {
  const color = account.color || '#0A8FE8';
  return card(`
    <div class="account-admin-head">
      <span class="row-icon solid-icon" style="background:${color};color:#fff;">${icon(account.icon || 'landmark')}</span>
      <span class="row-main">
        <span class="row-title">${html(account.name)}</span>
        <span class="row-subtitle">${html(account.type || 'Cuenta Corriente')}</span>
      </span>
      <button class="ghost-icon" data-account-edit="${account.id}" aria-label="Editar cuenta">${icon('edit')}</button>
    </div>
    <div class="account-order-row">
      <button class="chip" data-account-move="${account.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>${icon('chevronLeft')} Subir</button>
      <button class="chip" data-account-move="${account.id}" data-direction="1" ${index === total - 1 ? 'disabled' : ''}>Bajar ${icon('chevronRight')}</button>
    </div>
    <div class="switch-grid">
      ${kpiSwitch(account, 'income', 'Ingresos')}
      ${kpiSwitch(account, 'expense', 'Gastos')}
      ${kpiSwitch(account, 'balance', 'Balance')}
      ${kpiSwitch(account, 'available', 'Disponible')}
      ${kpiSwitch(account, 'visible', 'Visible')}
    </div>
  `, 'account-admin-card');
}

function kpiSwitch(account, key, label) {
  const checked = account.kpi?.[key] !== false;
  return `
    <label class="switch-row">
      <span>${label}</span>
      <input type="checkbox" data-account-kpi="${account.id}:${key}" ${checked ? 'checked' : ''}>
      <i></i>
    </label>
  `;
}

function renderCategoriesAdmin(state) {
  return `
    ${card(`<button class="primary-button" data-tool="new-category">${icon('plus')} Nueva categoría</button>`, 'tool-card')}
    ${card(`<h3 style="margin-top:0;">Categorías (${state.categories.length})</h3>${state.categories.length ? state.categories.map(c => catalogRow(c, 'category')).join('') : emptyState('tags', 'Sin categorías')}`)}
  `;
}

function renderProvisionsAdmin(state) {
  return `
    ${card(`<button class="primary-button" data-tool="new-provision">${icon('plus')} Nueva provisión</button>`, 'tool-card')}
    ${card(`<h3 style="margin-top:0;">Provisiones (${state.provisions.length})</h3>${state.provisions.length ? state.provisions.map(p => catalogRow(p, 'provision')).join('') : emptyState('shield', 'Sin provisiones')}`)}
  `;
}

function renderHealth(state) {
  const health = dataHealth(state);
  const status = health.severity === 'good' ? ['good', 'Bueno', 'check'] : health.severity === 'warn' ? ['warn', 'Atención', 'alert'] : ['bad', 'Crítico', 'alert'];
  return `
    ${card(`<span class="health-pill ${status[0]}">${icon(status[2])} Estado general: ${status[1]}</span><div class="metric-note" style="margin-top:12px;">${health.activeCount} posibles puntos activos por revisar.</div>`)}
    ${card(health.issues.map(issue => `
      <button class="settings-row" data-health="${issue.id}">
        <span class="row-icon" style="background:${issue.severity === 'bad' ? 'var(--red-soft)' : issue.severity === 'warn' ? 'var(--amber-soft)' : 'var(--green-soft)'};color:${issue.severity === 'bad' ? 'var(--red)' : issue.severity === 'warn' ? 'var(--amber)' : 'var(--green)'}">${icon(issue.icon)}</span>
        <span><strong>${issue.title}</strong><small>${issue.dismissed ? 'Descartado por usuario' : `${issue.count} registros afectados`}</small></span>
        ${icon('chevronRight')}
      </button>
    `).join(''), 'tool-card')}
  `;
}

function renderPreferences(state) {
  return `
    ${card(`${tool('rules', 'settings', 'Reglas y KPIs', 'Cómo impacta cada tipo de movimiento')}${tool('appearance', 'sparkles', 'Temas y apariencia', 'Próximamente')}${tool('security', 'shield', 'Seguridad', 'Próximamente')}${tool('cloud', 'backup', 'Sincronización en la nube', 'Próximamente')}`, 'tool-card')}
    ${card(`<h3 style="margin-top:0;">Reglas KPI</h3><p class="muted" style="margin-top:-6px;">Resumen visual de cómo cada tipo de movimiento impacta las métricas. Es lectura, no edición.</p><div class="rules-card">${Object.entries(state.rules).map(([key, rule]) => ruleRow(key, rule)).join('')}</div>`)}
  `;
}

function ruleRow(key, rule) {
  const title = {
    income: 'Ingresos',
    expense: 'Gastos',
    transfer: 'Transferencias',
    provision: 'Provisiones',
    adjustment: 'Ajustes'
  }[key] || key;
  return `
    <div class="rule-row">
      <strong>${title}</strong>
      <div class="rule-chip-row">
        ${ruleChip('Ingresos', rule.income)}
        ${ruleChip('Gastos', rule.expense)}
        ${ruleChip('Presupuesto', rule.budget)}
        ${ruleChip('Balance', rule.balance)}
      </div>
    </div>
  `;
}

function ruleChip(label, enabled) {
  return `<span class="rule-chip ${enabled ? 'on' : 'off'}">${label}: ${enabled ? 'Sí' : 'No'}</span>`;
}

function tool(action, iconName, title, subtitle) {
  return `
    <button class="settings-row" data-tool="${action}">
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon(iconName)}</span>
      <span><strong>${title}</strong><small>${subtitle}</small></span>
      ${icon('chevronRight')}
    </button>
  `;
}

function settingsLink(page, iconName, title, subtitle) {
  return `
    <button class="settings-row" data-settings="${page}">
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon(iconName)}</span>
      <span><strong>${title}</strong><small>${subtitle}</small></span>
      ${icon('chevronRight')}
    </button>
  `;
}

function catalogRow(item, type) {
  return `<div class="row-card"><span class="row-icon solid-icon" style="background:${item.color || '#0A8FE8'};color:#fff;">${icon(item.icon || 'folder')}</span><span><span class="row-title">${html(item.name)}</span><span class="row-subtitle">${type === 'category' ? `${item.subcategories?.length || 0} subcategorías` : item.type || 'Cuenta'}</span></span><button class="chip" data-open-icon="${type}:${item.id}">Icono</button></div>`;
}

function yes(value) {
  return value ? 'Sí' : 'No';
}

export function renderTemplateSheet() {
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">Templates CSV</h2>
        ${Object.entries(templateHeaders).map(([kind, headers]) => `
          <button class="settings-row" data-template="${kind}">
            <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('fileDown')}</span>
            <span><strong>${kind}</strong><small>${explainTemplate(kind)} · ${headers.join(', ')}</small></span>
            ${icon('download')}
          </button>
        `).join('')}
        <button class="secondary-button" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

export function renderIconPickerSheet(state) {
  const picker = state.ui.iconPicker || {};
  const tab = picker.tab || 'icon';
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide icon-picker-sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row">
          <button class="ghost-icon" data-sheet-close aria-label="Cerrar">${icon('x')}</button>
          <h2 class="sheet-title">Icono y color</h2>
          <button class="done-button" data-save-icon>Hecho</button>
        </div>
        <div class="icon-preview-large" style="background:${picker.color || '#0A8FE8'}">${icon(picker.icon || 'folder')}</div>
        <div class="segmented">
          <button class="${tab === 'icon' ? 'active' : ''}" data-picker-tab="icon">${icon('sparkles')} Icono</button>
          <button class="${tab === 'color' ? 'active' : ''}" data-picker-tab="color">${icon('pie')} Color</button>
        </div>
        ${tab === 'icon' ? groupedIcons(picker) : colorGrid(picker)}
      </section>
    </div>
  `;
}

function groupedIcons(picker) {
  const accountIcons = ICON_CATALOG.slice(0, 24);
  const categoryIcons = ICON_CATALOG.slice(24);
  return `
    <h3 class="picker-group-title">Cuentas</h3>
    <div class="icon-circle-grid">${accountIcons.map(name => iconChoice(name, picker)).join('')}</div>
    <h3 class="picker-group-title">Categorías</h3>
    <div class="icon-circle-grid">${categoryIcons.map(name => iconChoice(name, picker)).join('')}</div>
  `;
}

function iconChoice(name, picker) {
  const active = picker.icon === name;
  return `<button class="icon-circle-choice ${active ? 'active' : ''}" data-pick-icon="${name}" style="${active ? `background:${picker.color || '#0A8FE8'};color:#fff;` : ''}">${icon(name)}</button>`;
}

function colorGrid(picker) {
  return `
    <div class="color-circle-grid">
      ${COLOR_CATALOG.map(color => `<button class="color-circle-choice ${picker.color === color ? 'active' : ''}" style="background:${color}" data-pick-color="${color}" aria-label="${color}"></button>`).join('')}
    </div>
  `;
}
