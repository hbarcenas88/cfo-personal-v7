import { renderShell, setScreenActive, toastRoot } from './components/ui.js';
import { createKeypadController } from './components/keypad.js';
import { renderCalendarSheet, shiftMonth as shiftCalendarMonth } from './components/calendar.js';
import { applyPreset, renderPeriodSheet } from './components/periodPicker.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderBalances } from './screens/balances.js';
import { renderSummary } from './screens/summary.js';
import { renderCategories } from './screens/categories.js';
import { renderAudit } from './screens/audit.js';
import { renderSettings, renderIconPickerSheet, renderTemplateSheet } from './screens/settings.js';
import { recordPayload, renderRecordRoot } from './screens/recordFlow.js';
import { addAccount, addCategory, addProvision, closeSheet, convertToTransfer, deleteTransaction, dismissHealthIssue, duplicateTransaction, initState, markRecurring, mutate, openSheet, persist, resetAll, saveRecurring, saveTransaction, setSettingsPage, setView, showToast, state, subscribe } from './state.js';
import { createBackup, restoreBackupFile } from './services/backupService.js';
import { downloadTemplate, exportCSVs, importCatalog, importIssues, importTransactions, parseCSV, rowsToObjects } from './services/importExportService.js';
import { dataHealth } from './services/healthService.js';
import { canon, formatMoney, html, parseAmount, todayISO, uid } from './utils/format.js';
import { COLOR_CATALOG, ICON_CATALOG, icon, inferIcon, renderIcons } from './icons.js';

let keypad;
let calendarDraft = { selectedDate: todayISO(), visibleMonth: todayISO().slice(0, 7) };
const APP_VERSION = '7.0.1';
window.CFO_DEBUG = window.CFO_DEBUG || { logs: [] };

function debugLog(action, detail = {}) {
  const entry = { at: new Date().toISOString(), action, detail };
  window.CFO_DEBUG.logs.push(entry);
  window.CFO_DEBUG.logs = window.CFO_DEBUG.logs.slice(-80);
  state.debug = { ...(state.debug || {}), lastAction: `${entry.at} · ${action}` };
  console.info('[CFO V7]', action, detail);
}

function captureError(context, error) {
  const message = error?.message || String(error || 'Error desconocido');
  state.debug = { ...(state.debug || {}), lastError: `${context}: ${message}` };
  console.error('[CFO V7]', context, error);
  showToast(`Error: ${message}`);
}

await initState();
state.version = APP_VERSION;
debugLog('state loaded', {
  accounts: state.accounts.length,
  transactions: state.transactions.length,
  origin: location.origin,
  path: location.pathname
});
subscribe(render);
render();
registerServiceWorker();

window.addEventListener('cfo:render', render);
window.addEventListener('cfo:persist-render', async () => {
  await persist();
  render();
});
window.addEventListener('cfo:new-record', () => {
  state.ui.recordFlow = { step: 'choose' };
  render();
});
window.addEventListener('cfo:period', () => {
  state.ui.activeSheet = 'period';
  render();
});
window.addEventListener('cfo:global-search', () => {
  state.ui.activeSheet = 'search';
  render();
});
window.addEventListener('error', event => captureError('window.error', event.error || event.message));
window.addEventListener('unhandledrejection', event => captureError('unhandledrejection', event.reason));
document.addEventListener('submit', event => {
  event.preventDefault();
  debugLog('submit prevented', { target: event.target?.tagName });
});
document.addEventListener('click', event => {
  const target = event.target.closest?.('button,[data-tool],[data-record-save],[data-import-confirm],[data-restore-file],[data-import-file]');
  if (!target) return;
  const attrs = {};
  [...target.attributes].forEach(attr => {
    if (attr.name.startsWith('data-')) attrs[attr.name] = attr.value;
  });
  debugLog('click', { tag: target.tagName, text: target.textContent?.trim().slice(0, 80), attrs });
}, true);

function render() {
  renderShell();
  setScreenActive();
  if (!state.onboarded && emptyData()) {
    document.getElementById('screen-balances').innerHTML = renderOnboarding();
  } else {
    document.getElementById('screen-balances').innerHTML = renderBalances(state);
  }
  document.getElementById('screen-summary').innerHTML = renderSummary(state);
  document.getElementById('screen-categories').innerHTML = renderCategories(state);
  document.getElementById('screen-audit').innerHTML = renderAudit(state);
  document.getElementById('screen-settings').innerHTML = renderSettings(state);
  injectDebugTool();
  document.getElementById('record-root').innerHTML = renderRecordRoot(state);
  document.getElementById('sheet-root').innerHTML = renderActiveSheet();
  setScreenActive();
  toastRoot();
  bindDynamicEvents();
  renderIcons(document);
}

function emptyData() {
  return !state.accounts.length && !state.categories.length && !state.transactions.length && !state.budgets.length && !state.provisions.length;
}

function injectDebugTool() {
  if (state.activeView !== 'settings' || (state.settingsPage || 'tools') !== 'tools') return;
  const settingsScreen = document.getElementById('screen-settings');
  if (!settingsScreen || settingsScreen.querySelector('[data-tool="debug"]')) return;
  const firstToolCard = settingsScreen.querySelector('.tool-card, .card');
  if (!firstToolCard) return;
  firstToolCard.insertAdjacentHTML('beforeend', `
    <button class="settings-row" data-tool="debug">
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('chart')}</span>
      <span><strong>Debug / Storage Inspector</strong><small>Temporal: storage, errores y cache</small></span>
      ${icon('chevronRight')}
    </button>
  `);
}

function splitPair(value = '') {
  const idx = value.indexOf(':');
  if (idx < 0) return [value, ''];
  return [value.slice(0, idx), value.slice(idx + 1)];
}

function auditFilterKey(type) {
  return {
    account: 'accounts',
    type: 'types',
    category: 'categories',
    subcategory: 'subcategories'
  }[type];
}

function renderActiveSheet() {
  const sheet = state.ui.activeSheet;
  if (sheet === 'period') return renderPeriodSheet(state.period);
  if (sheet === 'calendar') return renderCalendarSheet(calendarDraft);
  if (sheet === 'templates') return renderTemplateSheet();
  if (sheet === 'icon') return renderIconPickerSheet(state);
  if (sheet === 'import-transactions') return importSheet('transactions');
  if (sheet === 'import-catalogs') return importSheet('accounts');
  if (sheet === 'new-account') return accountSheet();
  if (sheet === 'new-category') return categorySheet();
  if (sheet === 'new-provision') return provisionSheet();
  if (sheet === 'recurring') return recurringSheet();
  if (sheet === 'search') return searchSheet();
  if (sheet === 'health-detail') return healthDetailSheet();
  if (sheet === 'transaction-menu') return transactionMenuSheet();
  if (sheet === 'audit-filter') return auditFilterSheet();
  if (sheet === 'debug') return debugSheet();
  if (sheet === 'restore') return restoreSheet();
  if (sheet === 'confirm-reset') return confirmResetSheet();
  return '';
}

function bindDynamicEvents() {
  document.querySelectorAll('[data-onboarding-action]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.onboardingAction;
    if (action === 'import') {
      state.onboarded = true;
      setSettingsPage('tools');
      openSheet('import-catalogs');
    } else if (action === 'manual') {
      state.onboarded = true;
      setSettingsPage('catalogs');
      openSheet('new-account');
    } else {
      state.onboarded = true;
      persist();
      render();
    }
  }));

  document.querySelectorAll('[data-settings-back]').forEach(button => button.addEventListener('click', () => {
    state.ui.drawerOpen = true;
    render();
  }));

  document.querySelectorAll('[data-settings]').forEach(button => button.addEventListener('click', () => setSettingsPage(button.dataset.settings)));
  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    handleTool(button.dataset.tool).catch(error => captureError(`tool:${button.dataset.tool}`, error));
  }));
  document.querySelectorAll('[data-sheet-close]').forEach(el => el.addEventListener('click', event => {
    if (event.currentTarget === event.target || el.tagName === 'BUTTON') closeSheet();
  }));

  bindRecordEvents();
  bindPeriodEvents();
  bindCalendarEvents();
  bindFilters();
  bindTools();
  bindSheetActions();
}

function bindRecordEvents() {
  document.querySelectorAll('[data-record-close]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow = null;
    render();
  }));
  document.querySelectorAll('[data-record-back]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow = { step: 'choose' };
    render();
  }));
  document.querySelectorAll('[data-record-type]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow = {
      step: 'form',
      type: button.dataset.recordType,
      date: todayISO(),
      amount: 0,
      amountExpression: '',
      displayAmount: '0.00'
    };
    render();
  }));
  document.querySelectorAll('[data-record-field]').forEach(input => {
    const update = () => {
      if (!state.ui.recordFlow) return;
      state.ui.recordFlow[input.dataset.recordField] = input.value;
      if (input.dataset.recordField === 'category') state.ui.recordFlow.subcategory = '';
      debugLog('record field changed', { field: input.dataset.recordField, value: input.value });
      render();
    };
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  });
  document.querySelectorAll('[data-record-sub]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow.subcategory = button.dataset.recordSub;
    render();
  }));
  document.querySelector('[data-record-calendar]')?.addEventListener('click', () => {
    state.ui.calendarTarget = 'record-date';
    calendarDraft = {
      selectedDate: state.ui.recordFlow.date || todayISO(),
      visibleMonth: (state.ui.recordFlow.date || todayISO()).slice(0, 7),
      title: 'Selecciona fecha'
    };
    openSheet('calendar');
  });
  if (state.ui.recordFlow?.step === 'form') {
    keypad = createKeypadController({
      initial: state.ui.recordFlow.amountExpression || '',
      onChange: (display, expression, error) => {
        state.ui.recordFlow.amountExpression = expression;
        state.ui.recordFlow.displayAmount = display;
        state.ui.recordFlow.keypadError = error || '';
        const parsed = Number(expression);
        if (!Number.isNaN(parsed)) state.ui.recordFlow.amount = parsed;
        render();
      },
      onConfirm: value => {
        state.ui.recordFlow.amount = value;
        state.ui.recordFlow.displayAmount = Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      onCalendarOpen: () => document.querySelector('[data-record-calendar]')?.click()
    });
    document.querySelectorAll('[data-key]').forEach(button => button.addEventListener('click', () => keypad.press(button.dataset.key)));
  }
  document.querySelector('[data-record-save]')?.addEventListener('click', async () => {
    const payload = recordPayload(state.ui.recordFlow);
    debugLog('record save validation', payload);
    const saved = await saveTransaction(payload);
    debugLog('record save result', { saved, transactions: state.transactions.length, budgets: state.budgets.length });
    if (saved) state.ui.recordFlow = null;
    render();
  });
}

function bindPeriodEvents() {
  document.querySelectorAll('[data-period-close]').forEach(el => el.addEventListener('click', event => {
    if (event.currentTarget === event.target || el.tagName === 'BUTTON') closeSheet();
  }));
  document.querySelectorAll('[data-period-tab]').forEach(button => button.addEventListener('click', () => {
    state.period.tab = button.dataset.periodTab;
    render();
  }));
  document.querySelectorAll('[data-period-preset]').forEach(button => button.addEventListener('click', () => {
    const next = applyPreset(button.dataset.periodPreset);
    if (next) Object.assign(state.period, next);
    else {
      state.period.mode = 'range';
      state.period.from = state.period.from || todayISO();
      state.period.to = state.period.to || todayISO();
    }
    render();
  }));
  document.querySelectorAll('[data-period-year]').forEach(button => button.addEventListener('click', () => {
    state.period.mode = 'year';
    state.period.year = Number(button.dataset.periodYear);
    state.period.month = `${button.dataset.periodYear}-01`;
    render();
  }));
  document.querySelectorAll('[data-period-date]').forEach(button => button.addEventListener('click', () => {
    state.ui.calendarTarget = `period-${button.dataset.periodDate}`;
    calendarDraft = {
      selectedDate: state.period[button.dataset.periodDate] || todayISO(),
      visibleMonth: (state.period[button.dataset.periodDate] || todayISO()).slice(0, 7),
      title: button.dataset.periodDate === 'from' ? 'Fecha inicial' : 'Fecha final'
    };
    openSheet('calendar');
  }));
  document.querySelector('[data-period-apply]')?.addEventListener('click', async () => {
    state.period.tab = '';
    closeSheet();
    await persist();
    render();
  });
}

function bindCalendarEvents() {
  document.querySelectorAll('[data-cal-date]').forEach(button => button.addEventListener('click', () => {
    calendarDraft.selectedDate = button.dataset.calDate;
    calendarDraft.visibleMonth = button.dataset.calDate.slice(0, 7);
    render();
  }));
  document.querySelectorAll('[data-cal-nav]').forEach(button => button.addEventListener('click', () => {
    calendarDraft.visibleMonth = shiftCalendarMonth(calendarDraft.visibleMonth, Number(button.dataset.calNav));
    render();
  }));
  document.querySelectorAll('[data-cal-quick]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.calQuick;
    const now = new Date();
    if (key === 'today') calendarDraft.selectedDate = todayISO();
    if (key === 'yesterday') {
      now.setDate(now.getDate() - 1);
      calendarDraft.selectedDate = now.toISOString().slice(0, 10);
    }
    if (key === 'monthStart') calendarDraft.selectedDate = `${calendarDraft.visibleMonth}-01`;
    calendarDraft.visibleMonth = calendarDraft.selectedDate.slice(0, 7);
    render();
  }));
  document.querySelector('[data-cal-confirm]')?.addEventListener('click', async () => {
    const target = state.ui.calendarTarget;
    if (target === 'record-date') state.ui.recordFlow.date = calendarDraft.selectedDate;
    if (target === 'period-from') {
      state.period.mode = 'range';
      state.period.from = calendarDraft.selectedDate;
      state.period.month = calendarDraft.selectedDate.slice(0, 7);
    }
    if (target === 'period-to') {
      state.period.mode = 'range';
      state.period.to = calendarDraft.selectedDate;
    }
    state.ui.calendarTarget = null;
    closeSheet();
    await persist();
    render();
  });
}

function bindFilters() {
  document.querySelector('[data-cat-search]')?.addEventListener('input', event => {
    state.filters.categories.text = event.target.value;
    render();
  });
  document.querySelectorAll('[data-cat-view]').forEach(button => button.addEventListener('click', () => {
    state.filters.categories.view = button.dataset.catView;
    render();
  }));
  document.querySelector('[data-budget-toggle]')?.addEventListener('click', () => {
    state.filters.categories.budgetExpanded = state.filters.categories.budgetExpanded === false;
    render();
  });
  document.querySelectorAll('[data-cat-expand]').forEach(button => button.addEventListener('click', () => {
    const list = state.filters.categories.expanded;
    const name = button.dataset.catExpand;
    state.filters.categories.expanded = list.includes(name) ? list.filter(x => x !== name) : [...list, name];
    render();
  }));
  document.querySelectorAll('[data-add-cat-filter]').forEach(button => button.addEventListener('click', () => {
    state.filters.categories.categories.push(button.dataset.addCatFilter);
    render();
  }));
  document.querySelectorAll('[data-remove-cat-filter]').forEach(button => button.addEventListener('click', () => {
    state.filters.categories.categories = state.filters.categories.categories.filter(v => v !== button.dataset.removeCatFilter);
    render();
  }));
  document.querySelector('[data-clear-cat-filters]')?.addEventListener('click', () => {
    state.filters.categories.text = '';
    state.filters.categories.categories = [];
    render();
  });
  document.querySelectorAll('[data-chart-toggle]').forEach(button => button.addEventListener('click', () => {
    const name = button.dataset.chartToggle;
    const list = state.filters.excludedChartCategories;
    state.filters.excludedChartCategories = list.includes(name) ? list.filter(v => v !== name) : [...list, name];
    render();
  }));
  document.querySelector('[data-audit-search]')?.addEventListener('input', event => {
    state.filters.audit.text = event.target.value;
    render();
  });
  document.querySelector('[data-audit-clear]')?.addEventListener('click', () => {
    state.filters.audit = { text: '', accounts: [], types: [], categories: [], subcategories: [] };
    render();
  });
  document.querySelectorAll('[data-filter-remove]').forEach(button => button.addEventListener('click', () => {
    const [key, value] = button.dataset.filterRemove.split(':');
    state.filters.audit[key] = state.filters.audit[key].filter(item => item !== value);
    render();
  }));
  document.querySelectorAll('[data-open-filter]').forEach(button => button.addEventListener('click', () => {
    state.ui.auditFilter = button.dataset.openFilter;
    state.ui.filterSearch = '';
    openSheet('audit-filter');
  }));
  document.querySelectorAll('[data-filter-add]').forEach(button => button.addEventListener('click', () => {
    const [type, value] = splitPair(button.dataset.filterAdd);
    const key = auditFilterKey(type);
    if (key && value && !state.filters.audit[key].includes(value)) state.filters.audit[key].push(value);
    debugLog('audit filter added', { type, value });
    closeSheet();
    render();
  }));
  document.querySelector('[data-audit-excess]')?.addEventListener('dblclick', () => {
    setView('audit');
    showToast('Auditoría abierta. Filtra gastos no presupuestados o excesos por categoría.');
  });
  document.querySelectorAll('[data-audit-account]').forEach(button => {
    button.addEventListener('dblclick', () => {
      state.filters.audit.accounts = [button.dataset.auditAccount];
      setView('audit');
    });
  });
}

function bindTools() {
  document.querySelectorAll('[data-template]').forEach(button => button.addEventListener('click', () => downloadTemplate(button.dataset.template)));
  document.querySelectorAll('[data-open-icon]').forEach(button => button.addEventListener('click', () => {
    const [type, id] = button.dataset.openIcon.split(':');
    const item = type === 'account' ? state.accounts.find(x => x.id === id) : state.categories.find(x => x.id === id);
    state.ui.iconPicker = { type, id, icon: item?.icon || 'folder', color: item?.color || '#0A8FE8' };
    openSheet('icon');
  }));
  document.querySelectorAll('[data-pick-icon]').forEach(button => button.addEventListener('click', () => {
    state.ui.iconPicker.icon = button.dataset.pickIcon;
    render();
  }));
  document.querySelectorAll('[data-pick-color]').forEach(button => button.addEventListener('click', () => {
    state.ui.iconPicker.color = button.dataset.pickColor;
    render();
  }));
  document.querySelector('[data-save-icon]')?.addEventListener('click', async () => {
    const picker = state.ui.iconPicker;
    await mutate(s => {
      const list = picker.type === 'account' ? s.accounts : s.categories;
      const item = list.find(x => x.id === picker.id);
      if (item) Object.assign(item, { icon: picker.icon, color: picker.color });
    }, { undo: 'Icono actualizado' });
    closeSheet();
    render();
  });
  document.querySelectorAll('[data-health]').forEach(button => button.addEventListener('click', () => {
    state.ui.selectedHealthIssue = button.dataset.health;
    openSheet('health-detail');
  }));
  document.querySelector('[data-dismiss-health]')?.addEventListener('click', async () => {
    await dismissHealthIssue(state.ui.selectedHealthIssue);
    closeSheet();
    render();
  });
  document.querySelectorAll('[data-recurring-done]').forEach(button => button.addEventListener('click', async () => {
    const month = state.period.month;
    const current = !!state.recurringDone[month]?.[button.dataset.recurringDone];
    await markRecurring(month, button.dataset.recurringDone, !current);
    render();
  }));
  document.querySelectorAll('[data-tx-menu]').forEach(button => button.addEventListener('click', () => {
    state.ui.selectedTransactionId = button.dataset.txMenu;
    openSheet('transaction-menu');
  }));
  document.querySelectorAll('[data-open-tx]').forEach(button => button.addEventListener('click', () => {
    state.ui.selectedTransactionId = button.dataset.openTx;
    openSheet('transaction-menu');
  }));
  document.querySelectorAll('[data-debug-action]').forEach(button => button.addEventListener('click', () => {
    handleDebugAction(button.dataset.debugAction).catch(error => captureError(`debug:${button.dataset.debugAction}`, error));
  }));
}

function bindSheetActions() {
  document.querySelectorAll('[data-create-action]').forEach(button => button.addEventListener('click', async () => {
    const data = Object.fromEntries([...document.querySelectorAll('[data-create-field]')].map(input => [input.dataset.createField, input.value]));
    let saved = false;
    debugLog('create action validation', { action: button.dataset.createAction, data });
    if (button.dataset.createAction === 'create-account') saved = await addAccount(data);
    if (button.dataset.createAction === 'create-category') {
      if (!data.name?.trim()) {
        showToast('Nombre de categoría requerido');
      } else if (state.categories.some(c => canon(c.name) === canon(data.name))) {
        showToast('La categoría ya existe');
      } else {
        const before = state.categories.length;
        await addCategory({ ...data, subcategories: data.subcategories?.split(',').map(s => s.trim()).filter(Boolean) || [] });
        saved = state.categories.length > before;
      }
    }
    if (button.dataset.createAction === 'create-provision') {
      if (!data.name?.trim()) showToast('Nombre de provisión requerido');
      else {
        const before = state.provisions.length;
        await addProvision({ ...data, balance: parseAmount(data.balance), monthlyAmount: parseAmount(data.monthlyAmount) });
        saved = state.provisions.length > before;
      }
    }
    debugLog('create action result', { action: button.dataset.createAction, saved });
    if (saved) closeSheet();
    render();
  }));
  document.querySelectorAll('[data-save-recurring]').forEach(button => button.addEventListener('click', async () => {
    const data = Object.fromEntries([...document.querySelectorAll('[data-rec-field]')].map(input => [input.dataset.recField, input.value]));
    debugLog('recurring save validation', data);
    const saved = await saveRecurring({ ...data, amount: parseAmount(data.amount) || 0 });
    debugLog('recurring save result', { saved, recurring: state.recurring.length });
    if (saved) closeSheet();
    render();
  }));
  document.querySelectorAll('[data-import-confirm]').forEach(button => button.addEventListener('click', () => {
    confirmImportDraft().catch(error => captureError('confirm import', error));
  }));
  document.querySelectorAll('[data-tx-duplicate]').forEach(button => button.addEventListener('click', async () => {
    await duplicateTransaction(button.dataset.txDuplicate);
    closeSheet();
    render();
  }));
  document.querySelectorAll('[data-tx-delete]').forEach(button => button.addEventListener('click', async () => {
    await deleteTransaction(button.dataset.txDelete);
    closeSheet();
    render();
  }));
  document.querySelectorAll('[data-tx-transfer]').forEach(button => button.addEventListener('click', async () => {
    await convertToTransfer(button.dataset.txTransfer);
    closeSheet();
    render();
  }));
  document.querySelectorAll('[data-confirm-reset]').forEach(button => button.addEventListener('click', async () => {
    await resetAll();
    closeSheet();
    render();
  }));
}

async function handleTool(action) {
  state.ui.importDraft = null;
  debugLog('tool action', { action });
  if (action === 'export-csv') return exportCSVs(state);
  if (action === 'backup') return createBackup(state);
  if (action === 'restore') return openSheet('restore');
  if (action === 'debug') return openSheet('debug');
  if (action === 'reset-data') return openSheet('confirm-reset');
  if (action === 'templates') return openSheet('templates');
  if (action === 'import-transactions') return openSheet('import-transactions');
  if (action === 'import-catalogs') return openSheet('import-catalogs');
  if (['new-account', 'new-category', 'new-provision', 'recurring'].includes(action)) return openSheet(action);
  if (action === 'icons') return showToast('Elige Icono dentro de una cuenta o categoría');
  if (action === 'rules' || action === 'appearance' || action === 'security' || action === 'cloud') return showToast(action === 'rules' ? 'Reglas visibles en Configuración' : 'Próximamente');
  showToast('Función en preparación');
}

function importSheet(defaultKind) {
  const catalog = state.ui.activeSheet === 'import-catalogs';
  const kinds = catalog
    ? [['accounts', 'Cuentas'], ['categories', 'Categorías y subcategorías'], ['provisions', 'Provisiones'], ['recurring', 'Pagos e ingresos recurrentes']]
    : [['transactions', 'Movimientos'], ['budgets', 'Presupuesto']];
  const draft = state.ui.importDraft || { kind: defaultKind, objects: [], issues: [] };
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${catalog ? 'Importar catálogos' : 'Importar datos'}</h2>
        <div class="field"><label>Tipo</label><select data-import-kind>${kinds.map(([k, label]) => `<option value="${k}" ${draft.kind === k ? 'selected' : ''}>${label}</option>`).join('')}</select></div>
        <label class="card" style="display:grid;place-items:center;gap:8px;text-align:center;">
          ${icon('fileUp')}<strong>Seleccionar CSV</strong><small class="muted">Se validará antes de guardar</small>
          <input type="file" accept=".csv,text/csv" data-import-file class="file-input-native">
        </label>
        ${draft.objects?.length ? `<div class="card"><strong>${draft.objects.length} filas leídas</strong><p class="muted">${draft.issues.length ? `${draft.issues.length} filas requieren revisión.` : 'Sin errores detectados.'}</p></div>` : ''}
        ${draft.issues?.length ? draft.issues.map(issue => `<div class="import-preview-row issue"><strong>Fila ${issue.row.__row}</strong><small>${issue.fields.join(' · ')}</small><pre style="white-space:pre-wrap;margin:0;">${JSON.stringify(issue.row, null, 2)}</pre></div>`).join('') : ''}
        ${draft.objects?.length ? '<button class="primary-button" data-import-confirm>Confirmar importación</button>' : ''}
        <button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
      </section>
    </div>
  `;
}

function accountSheet() {
  return simpleCreateSheet('Nueva cuenta', [['name', 'Nombre de cuenta'], ['type', 'Tipo o descripción']], 'Crear cuenta', 'create-account');
}

function categorySheet() {
  return simpleCreateSheet('Nueva categoría', [['name', 'Nombre de categoría'], ['subcategories', 'Subcategorías separadas por coma']], 'Crear categoría', 'create-category');
}

function provisionSheet() {
  return simpleCreateSheet('Nueva provisión', [['name', 'Nombre de provisión'], ['balance', 'Saldo conceptual'], ['monthlyAmount', 'Planeación mensual']], 'Crear provisión', 'create-provision');
}

function recurringSheet() {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Pagos e ingresos recurrentes</h2>
      <div class="two-col"><div class="field"><label>Tipo</label><select data-rec-field="type"><option>Pago</option><option>Ingreso</option></select></div><div class="field"><label>Día mensual</label><input class="input" data-rec-field="day" inputmode="numeric" value="1"></div></div>
      <div class="field"><label>Nombre</label><input class="input" data-rec-field="name" placeholder="Internet, tarjeta, salario..."></div>
      <div class="two-col"><div class="field"><label>Monto esperado</label><input class="input" data-rec-field="amount" inputmode="decimal" placeholder="Opcional"></div><div class="field"><label>Cuenta</label><select data-rec-field="account"><option value="">Sin cuenta</option>${state.accounts.map(a => `<option>${a.name}</option>`).join('')}</select></div></div>
      <div class="field"><label>Categoría</label><select data-rec-field="category"><option value="">Sin categoría</option>${state.categories.map(c => `<option>${c.name}</option>`).join('')}</select></div>
      <button class="primary-button" data-save-recurring>Guardar recurrencia</button><button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
    </section></div>
  `;
}

function simpleCreateSheet(title, fields, button, action) {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${title}</h2>
      ${fields.map(([key, label]) => `<div class="field"><label>${label}</label><input class="input" data-create-field="${key}" ${key.toLowerCase().includes('amount') || key === 'balance' || key === 'monthlyAmount' ? 'inputmode="decimal"' : ''}></div>`).join('')}
      <button class="primary-button" data-create-action="${action}">${button}</button>
      <button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
    </section></div>
  `;
}

function searchSheet() {
  const q = state.ui.searchText || '';
  const rows = q ? state.transactions.filter(tx => canon([tx.description, tx.account, tx.category, tx.subcategory].join(' ')).includes(canon(q))).slice(0, 20) : [];
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Búsqueda global</h2>
      <input class="input" data-global-search-input placeholder="Cuenta, categoría, descripción..." value="${q}">
      <div style="margin-top:12px;">${q ? rows.map(tx => `<button class="settings-row" data-open-tx="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('receipt')}</span><span><strong>${tx.description || tx.movement}</strong><small>${tx.account} · ${tx.category || tx.movement} · ${formatMoney(tx.amount)}</small></span>${icon('chevronRight')}</button>`).join('') || '<div class="empty-state">Sin resultados</div>' : '<div class="empty-state">Escribe para buscar</div>'}</div>
      <button class="secondary-button" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function healthDetailSheet() {
  const health = dataHealth(state);
  const issue = health.issues.find(item => item.id === state.ui.selectedHealthIssue);
  if (!issue) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${issue.title}</h2>
      <p class="muted">${issue.count} registros afectados. Si revisaste y no es error, puedes descartarlo para bajar el indicador.</p>
      ${issue.rows.slice(0, 20).map(row => `<div class="import-preview-row"><strong>${row.description || row.name || row.id}</strong><small>${row.account || ''} ${row.amount ? `· ${formatMoney(row.amount)}` : ''}</small></div>`).join('') || '<div class="empty-state">Sin registros activos</div>'}
      <button class="primary-button" data-dismiss-health>Descartar alerta</button><button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
    </section></div>
  `;
}

function transactionMenuSheet() {
  const tx = state.transactions.find(item => item.id === state.ui.selectedTransactionId);
  if (!tx) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${tx.description || tx.movement}</h2>
      <button class="settings-row" data-tx-duplicate="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('copy')}</span><span><strong>Duplicar</strong><small>Crea una copia editable luego</small></span>${icon('chevronRight')}</button>
      <button class="settings-row" data-tx-transfer="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('repeat')}</span><span><strong>Convertir en transferencia</strong><small>Requiere contrapartida compatible</small></span>${icon('chevronRight')}</button>
      <button class="settings-row" data-tx-delete="${tx.id}"><span class="row-icon" style="background:var(--red-soft);color:var(--red)">${icon('trash')}</span><span><strong>Eliminar</strong><small>Podrás deshacerlo</small></span>${icon('chevronRight')}</button>
      <button class="secondary-button" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function auditFilterSheet() {
  const type = state.ui.auditFilter || 'account';
  const title = {
    account: 'Filtrar cuenta',
    type: 'Filtrar tipo',
    category: 'Filtrar categoría',
    subcategory: 'Filtrar subcategoría'
  }[type] || 'Filtrar';
  const search = state.ui.filterSearch || '';
  const options = auditFilterOptions(type)
    .filter(value => !search || canon(value).includes(canon(search)))
    .slice(0, 80);
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${title}</h2>
      <input class="input" data-filter-search placeholder="Buscar..." value="${html(search)}" autofocus>
      <div class="chip-row" style="margin-top:14px;">
        ${options.map(value => `<button class="chip" data-filter-add="${type}:${html(value)}">${html(value)}</button>`).join('') || '<div class="empty-state">Sin opciones</div>'}
      </div>
      <button class="secondary-button" data-sheet-close style="margin-top:12px;">Cerrar</button>
    </section></div>
  `;
}

function auditFilterOptions(type) {
  if (type === 'account') return state.accounts.map(account => account.name);
  if (type === 'type') return ['Gasto', 'Ingreso', 'Transferencia', 'Provisión'];
  if (type === 'category') return [...new Set([...state.categories.map(cat => cat.name), ...state.transactions.map(tx => tx.category).filter(Boolean)])];
  if (type === 'subcategory') return [...new Set([
    ...state.categories.flatMap(cat => cat.subcategories || []).map(sub => sub.name || sub),
    ...state.transactions.map(tx => tx.subcategory).filter(Boolean)
  ])];
  return [];
}

function debugSheet() {
  const localKeys = Object.keys(localStorage);
  const debug = state.debug || {};
  const controller = navigator.serviceWorker?.controller ? 'Activo' : 'Sin controlador';
  const logs = window.CFO_DEBUG?.logs || [];
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Debug / Storage Inspector</h2>
      <div class="debug-grid">
        <div class="debug-item"><small>Versión</small><strong>${html(state.version || APP_VERSION)}</strong></div>
        <div class="debug-item"><small>Origen</small><strong>${html(location.origin)}</strong></div>
        <div class="debug-item"><small>Ruta</small><strong>${html(location.pathname)}</strong></div>
        <div class="debug-item"><small>Service worker</small><strong>${controller}</strong></div>
        <div class="debug-item"><small>Registros</small><strong>${state.transactions.length}</strong></div>
        <div class="debug-item"><small>Cuentas</small><strong>${state.accounts.length}</strong></div>
        <div class="debug-item"><small>Categorías</small><strong>${state.categories.length}</strong></div>
        <div class="debug-item"><small>Presupuestos</small><strong>${state.budgets.length}</strong></div>
      </div>
      <div class="card">
        <strong>localStorage</strong>
        <p class="muted">${localKeys.length ? localKeys.map(html).join(' · ') : 'Sin claves en localStorage'}</p>
      </div>
      <div class="card">
        <strong>Última acción</strong>
        <p class="muted">${html(debug.lastAction || 'Sin acciones registradas')}</p>
        <strong>Último error</strong>
        <p class="muted">${html(debug.lastError || 'Sin errores capturados')}</p>
      </div>
      <div class="card">
        <strong>Logs temporales</strong>
        <pre class="debug-log">${html(JSON.stringify(logs.slice(-12), null, 2))}</pre>
      </div>
      <button class="primary-button" data-debug-action="storage-test">Probar escritura/lectura storage</button>
      <button class="secondary-button" data-debug-action="refresh" style="margin-top:8px;">Refrescar inspector</button>
      <button class="danger-button" data-debug-action="clear-cache" style="margin-top:8px;">Limpiar service worker/cache de esta app</button>
      <button class="secondary-button" data-sheet-close style="margin-top:8px;">Cerrar</button>
    </section></div>
  `;
}

function restoreSheet() {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Restaurar respaldo</h2>
      <label class="card" style="display:grid;place-items:center;gap:8px;text-align:center;">
        ${icon('upload')}<strong>Seleccionar JSON</strong><small class="muted">Reemplaza los datos locales de V7</small>
        <input type="file" accept=".json,application/json" data-restore-file class="file-input-native">
      </label>
      <button class="secondary-button" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function confirmResetSheet() {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Borrar toda la data</h2>
      <p class="muted">Esto elimina datos locales de V7 en este navegador. No afecta V6.</p>
      <button class="danger-button" data-confirm-reset>Borrar data</button><button class="secondary-button" data-sheet-close style="margin-top:8px;">Cancelar</button>
    </section></div>
  `;
}

async function handleDebugAction(action) {
  debugLog('debug action', { action });
  if (action === 'storage-test') {
    const result = await debugStorageRoundTripLocal();
    state.debug = { ...(state.debug || {}), storageTestAt: result?.at || new Date().toISOString(), lastError: '' };
    await persist();
    showToast(result?.ok ? 'Storage OK: escritura y lectura completadas' : 'Storage respondió sin confirmación');
    render();
    return;
  }
  if (action === 'clear-cache') {
    const deleted = await clearAppServiceWorkerAndCaches();
    state.debug = { ...(state.debug || {}), lastAction: `${new Date().toISOString()} · cache limpia (${deleted.caches} caches, ${deleted.registrations} SW)` };
    showToast('Cache/SW de V7 limpiados. Recarga la app.');
    render();
    return;
  }
  if (action === 'refresh') {
    render();
  }
}

async function debugStorageRoundTripLocal() {
  const value = { ok: true, at: new Date().toISOString() };
  localStorage.setItem('cfo_personal_v7_debug_test', JSON.stringify(value));
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('cfo_personal_v7', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('app')) db.createObjectStore('app', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('app', 'readwrite');
    tx.objectStore('app').put({ key: 'debug-test', value, savedAt: value.at });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction('app', 'readonly');
    const req = tx.objectStore('app').get('debug-test');
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}

async function clearAppServiceWorkerAndCaches() {
  let cacheCount = 0;
  let registrationCount = 0;
  if ('caches' in window) {
    const keys = await caches.keys();
    const appKeys = keys.filter(key => key.startsWith('cfo-personal-v7-'));
    await Promise.all(appKeys.map(key => caches.delete(key).then(done => {
      if (done) cacheCount += 1;
    })));
  }
  if ('serviceWorker' in navigator) {
    const expectedScope = new URL('../', import.meta.url).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter(registration => registration.scope === expectedScope)
      .map(registration => registration.unregister().then(done => {
        if (done) registrationCount += 1;
      })));
  }
  debugLog('cache cleared', { caches: cacheCount, registrations: registrationCount });
  return { caches: cacheCount, registrations: registrationCount };
}

document.addEventListener('input', event => {
  if (event.target.matches('[data-global-search-input]')) {
    state.ui.searchText = event.target.value;
    render();
  }
  if (event.target.matches('[data-filter-search]')) {
    state.ui.filterSearch = event.target.value;
    render();
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-import-kind]')) {
    debugLog('import kind changed', { kind: event.target.value });
    state.ui.importDraft = { kind: event.target.value, objects: [], issues: [] };
    render();
  }
  if (event.target.matches('[data-import-file]')) {
    readImportFile(event.target.files[0]).catch(error => captureError('import csv', error));
  }
  if (event.target.matches('[data-restore-file]')) {
    debugLog('restore file selected', { name: event.target.files[0]?.name || '' });
    restoreBackupFile(event.target.files[0]).then(() => {
      debugLog('restore completed', { transactions: state.transactions.length });
      closeSheet();
      render();
    }).catch(error => captureError('restore json', error));
  }
});

async function readImportFile(file) {
  if (!file) return;
  debugLog('import file read start', { name: file.name, size: file.size });
  const text = await file.text();
  const parsed = parseCSV(text);
  const objects = rowsToObjects(parsed.rows);
  const kind = state.ui.importDraft?.kind || 'transactions';
  state.ui.importDraft = {
    kind,
    objects,
    issues: importIssues(kind, objects, state),
    delimiter: parsed.delimiter
  };
  debugLog('import file parsed', { kind, rows: objects.length, issues: state.ui.importDraft.issues.length, delimiter: parsed.delimiter });
  render();
}

async function confirmImportDraft() {
  const draft = state.ui.importDraft;
  if (!draft?.objects?.length) return;
  debugLog('import confirm start', { kind: draft.kind, rows: draft.objects.length });
  if (['accounts', 'categories', 'provisions', 'recurring'].includes(draft.kind)) await importCatalog(draft.kind, draft.objects);
  else await importTransactions(draft.kind, draft.objects, state);
  debugLog('import confirm complete', {
    kind: draft.kind,
    accounts: state.accounts.length,
    categories: state.categories.length,
    transactions: state.transactions.length,
    budgets: state.budgets.length
  });
  closeSheet();
  render();
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      const swUrl = new URL('../service-worker.js', import.meta.url);
      const scope = new URL('../', import.meta.url);
      const registration = await navigator.serviceWorker.register(swUrl.href, { scope: scope.href });
      await registration.update();
      debugLog('service worker registered', { scope: registration.scope, script: swUrl.href });
    } catch (error) {
      captureError('service worker register', error);
      console.warn('Service worker no registrado', error);
    }
  }
}
