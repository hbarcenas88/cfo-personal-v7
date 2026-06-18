import { COLOR_CATALOG, ICON_CATALOG, icon } from '../icons.js';
import { dataHealth } from '../services/healthService.js';
import { card, emptyState, softColor } from '../components/ui.js';
import { explainTemplate, templateHeaders } from '../services/importExportService.js';
import { formatMoney } from '../utils/format.js';

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
    ${page === 'health' ? renderHealth(state) : ''}
    ${page === 'settings' ? renderPreferences(state) : ''}
  `;
}

function pageTitle(page) {
  return {
    tools: 'Gestión de datos',
    planning: 'Planeación',
    catalogs: 'Catálogos',
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
    ${card(`<h3 style="margin-top:0;">Recurrentes actuales</h3>${state.recurring.length ? state.recurring.map(r => `<div class="row-card"><span class="row-icon" style="background:${softColor(r.color || '#0A8FE8')};color:${r.color || '#0A8FE8'}">${icon(r.icon || 'calendarClock')}</span><span class="row-main"><span class="row-title">${r.name}</span><span class="row-subtitle">${r.type} · día ${r.day}${r.amount ? ` · ${formatMoney(r.amount)}` : ''}</span></span></div>`).join('') : emptyState('calendarClock', 'Sin recurrentes')}`)}
  `;
}

function renderCatalogs(state) {
  return `
    ${card(`${tool('new-account', 'landmark', 'Cuentas', 'Crear, editar, ocultar e iconos')}${tool('new-category', 'tags', 'Categorías y subcategorías', 'Estructura de presupuesto y gastos')}${tool('new-provision', 'shield', 'Provisiones', 'Conceptos de reserva y planeación')}${tool('icons', 'sparkles', 'Iconos y colores', 'Biblioteca visual de la app')}`, 'tool-card')}
    ${card(`<h3 style="margin-top:0;">Cuentas (${state.accounts.length})</h3>${state.accounts.length ? state.accounts.map(a => catalogRow(a, 'account')).join('') : emptyState('landmark', 'Sin cuentas')}`)}
    ${card(`<h3 style="margin-top:0;">Categorías (${state.categories.length})</h3>${state.categories.length ? state.categories.map(c => catalogRow(c, 'category')).join('') : emptyState('tags', 'Sin categorías')}`)}
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
    ${card(`<h3 style="margin-top:0;">Reglas KPI</h3>${Object.entries(state.rules).map(([key, rule]) => `<div class="row-card" style="grid-template-columns:1fr auto;"><span><strong>${key}</strong><span class="row-subtitle">Ingresos ${yes(rule.income)} · Gastos ${yes(rule.expense)} · Presupuesto ${yes(rule.budget)} · Balance ${yes(rule.balance)}</span></span></div>`).join('')}`)}
  `;
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

function catalogRow(item, type) {
  return `<div class="row-card"><span class="row-icon" style="background:${softColor(item.color || '#0A8FE8')};color:${item.color || '#0A8FE8'}">${icon(item.icon || 'folder')}</span><span><span class="row-title">${item.name}</span><span class="row-subtitle">${type === 'category' ? `${item.subcategories?.length || 0} subcategorías` : item.type || 'Cuenta'}</span></span><button class="chip" data-open-icon="${type}:${item.id}">Icono</button></div>`;
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
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">Icono y color</h2>
        <div class="icon-grid">${ICON_CATALOG.map(name => `<button class="icon-choice ${picker.icon === name ? 'active' : ''}" data-pick-icon="${name}">${icon(name)}</button>`).join('')}</div>
        <div class="card" style="margin-top:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="row-icon" style="background:${picker.color || '#0A8FE8'}18;color:${picker.color || '#0A8FE8'}">${icon(picker.icon || 'folder')}</span>
            <div><strong>Color del icono</strong><small style="display:block;color:var(--text-muted);margin-top:3px;">Desliza para ver más opciones</small></div>
          </div>
          <div class="color-strip" style="margin-top:12px;">${COLOR_CATALOG.map(color => `<button class="color-choice ${picker.color === color ? 'active' : ''}" style="background:${color}" data-pick-color="${color}"></button>`).join('')}</div>
        </div>
        <button class="primary-button" data-save-icon>Guardar icono</button>
        <button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
      </section>
    </div>
  `;
}
