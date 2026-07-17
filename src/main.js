import { renderShell, setScreenActive, toastRoot } from './components/ui.js';
import { createKeypadController } from './components/keypad.js';
import { renderCalendarSheet, shiftMonth as shiftCalendarMonth } from './components/calendar.js';
import { applyPreset, renderPeriodSheet } from './components/periodPicker.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderBalances } from './screens/balances.js';
import { renderSummary } from './screens/summary.js';
import { renderCategories } from './screens/categories.js';
import { renderAudit } from './screens/audit.js';
import { renderSettings, renderIconColorPickerContent, renderIconPickerSheet, renderTemplateSheet } from './screens/settings.js';
import { recordPayload, renderRecordRoot } from './screens/recordFlow.js';
import { accountDeleteImpact, addAccount, addCategory, addProvision, categoryDeleteImpact, closeSheet, convertToTransfer, createBalanceAdjustment, deleteAccount, deleteCategory, deleteSubcategory, deleteTransaction, dismissHealthIssue, duplicateTransaction, initState, markRecurring, moveAccount, mutate, openSheet, persist, resetAll, saveRecurring, saveTransaction, setSettingsPage, showToast, state, subcategoryDeleteImpact, subscribe, updateAccount, updateCategory, updateTransaction, setView } from './state.js';
import { createBackup, restoreBackupFile } from './services/backupService.js';
import { downloadTemplate, exportCSVs, importCatalog, importIssuesV702, importTransactions, parseCSV, rowsToObjects, templateHeaders } from './services/importExportService.js';
import { dataHealth } from './services/healthService.js';
import { APP_STORAGE_KEYS, APP_STORAGE_PREFIX, getFinanceLocalStorageKeys, getOtherLocalStorageKeys } from './services/storageService.js';
import { canon, formatMoney, html, parseAmount, todayISO, uid } from './utils/format.js';
import { icon, inferIcon, renderIcons } from './icons.js';

let keypad;
let calendarDraft = { selectedDate: todayISO(), visibleMonth: todayISO().slice(0, 7) };
let draggedAccountId = '';
let pointerDragAccount = null;
let auditDropdownDismissBound = false;
const APP_VERSION = '7.0.4';
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
window.addEventListener('cfo:toast', toastRoot);
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

function rerenderSheetPreserveScroll() {
  const top = document.querySelector('.sheet')?.scrollTop || 0;
  render();
  const sheet = document.querySelector('.sheet');
  if (sheet) sheet.scrollTop = top;
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
  if (sheet === 'option-picker') return optionPickerSheet();
  if (sheet === 'account-actions') return accountActionsSheet();
  if (sheet === 'account-kpis') return accountKpiSheet();
  if (sheet === 'account-visual') return accountVisualSheet();
  if (sheet === 'account-name-type') return accountNameTypeSheet();
  if (sheet === 'account-adjust') return accountAdjustSheet();
  if (sheet === 'confirm-delete-account') return confirmDeleteAccountSheet();
  if (sheet === 'category-actions') return categoryActionsSheet();
  if (sheet === 'category-visual') return categoryVisualSheet();
  if (sheet === 'category-name') return categoryNameSheet();
  if (sheet === 'category-subcategories') return categorySubcategoriesSheet();
  if (sheet === 'confirm-delete-subcategory') return confirmDeleteSubcategorySheet();
  if (sheet === 'confirm-delete-category') return confirmDeleteCategorySheet();
  if (sheet === 'import-transactions') return importSheetV702('transactions');
  if (sheet === 'import-catalogs') return importSheetV702('accounts');
  if (sheet === 'new-account') return accountSheetV704();
  if (sheet === 'new-category') return categorySheet();
  if (sheet === 'new-provision') return provisionSheet();
  if (sheet === 'recurring') return recurringSheet();
  if (sheet === 'search') return searchSheet();
  if (sheet === 'health-detail') return healthDetailSheet();
  if (sheet === 'transaction-menu') return transactionMenuSheet();
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
    if (event.currentTarget === event.target || el.tagName === 'BUTTON') {
      if (state.ui.activeSheet === 'option-picker' && state.ui.optionPicker?.returnSheet) {
        state.ui.activeSheet = state.ui.optionPicker.returnSheet;
        state.ui.optionPicker = null;
        render();
      } else {
        closeSheet();
      }
    }
  }));
  bindSheetDragClose();

  bindRecordEvents();
  bindPeriodEvents();
  bindCalendarEvents();
  bindFilters();
  bindTools();
  bindSheetActions();
}

function bindSheetDragClose() {
  document.querySelectorAll('.sheet').forEach(sheet => {
    let startY = 0;
    let startScroll = 0;
    sheet.addEventListener('pointerdown', event => {
      const rect = sheet.getBoundingClientRect();
      const inGripZone = event.clientY - rect.top < 160;
      if (!event.target.closest('.sheet-handle,.sheet-head-row') && !inGripZone) return;
      startY = event.clientY;
      startScroll = sheet.scrollTop;
    });
    sheet.addEventListener('pointerup', event => {
      if (!startY) return;
      const delta = event.clientY - startY;
      startY = 0;
      if (delta > 72 && startScroll <= 2) closeSheet();
    });
  });
}

function bindRecordEvents() {
  document.querySelectorAll('[data-record-close]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow = null;
    render();
  }));
  document.querySelectorAll('[data-record-back]').forEach(button => button.addEventListener('click', () => {
    state.ui.recordFlow = state.ui.recordFlow?.editTransactionId ? null : { step: 'choose' };
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
    const saved = state.ui.recordFlow.editTransactionId
      ? await updateTransaction(state.ui.recordFlow.editTransactionId, payload)
      : await saveTransaction(payload);
    debugLog('record save result', { saved, transactions: state.transactions.length, budgets: state.budgets.length });
    if (saved) state.ui.recordFlow = null;
    render();
  });
}

function startTransactionEdit(id) {
  const selected = state.transactions.find(tx => tx.id === id);
  if (!selected) return;
  const tx = selected.transferId
    ? state.transactions.find(item => item.transferId === selected.transferId && item.movement === 'Gasto') || selected
    : selected;
  const type = tx.transferId ? 'transfer' : ({ Gasto: 'expense', Ingreso: 'income', 'Provisión': 'provision' }[tx.movement] || 'expense');
  const amount = Number(tx.amount) || 0;
  state.ui.recordFlow = {
    step: 'form',
    editTransactionId: selected.id,
    type,
    date: tx.date || todayISO(),
    account: tx.account || '',
    accountTo: tx.accountTo || '',
    category: tx.category || '',
    subcategory: tx.subcategory || '',
    description: tx.description || '',
    amount,
    amountExpression: String(amount),
    displayAmount: amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };
  closeSheet();
  render();
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
  if (!auditDropdownDismissBound) {
    auditDropdownDismissBound = true;
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !state.ui.auditDropdown) return;
      state.ui.auditDropdown = '';
      state.ui.auditDropdownSearch = '';
      render();
    });
    document.addEventListener('click', event => {
      if (!state.ui.auditDropdown || event.target.closest('.audit-dropdown, [data-open-filter]')) return;
      state.ui.auditDropdown = '';
      state.ui.auditDropdownSearch = '';
      render();
    });
  }
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
    const [key, value] = splitPair(button.dataset.filterRemove);
    state.filters.audit[key] = state.filters.audit[key].filter(item => item !== value);
    render();
  }));
  document.querySelectorAll('[data-open-filter]').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.openFilter;
    state.ui.auditDropdown = state.ui.auditDropdown === type ? '' : type;
    state.ui.auditDropdownSearch = '';
    render();
  }));
  document.querySelector('[data-audit-dropdown-search]')?.addEventListener('input', event => {
    state.ui.auditDropdownSearch = event.target.value;
    render();
  });
  document.querySelectorAll('[data-audit-dropdown-toggle]').forEach(button => button.addEventListener('click', () => {
    const [type, value] = splitPair(button.dataset.auditDropdownToggle);
    const key = auditFilterKey(type);
    if (!key || !value) return;
    const selected = state.filters.audit[key];
    state.filters.audit[key] = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
    render();
  }));
  document.querySelectorAll('[data-audit-dropdown-clear]').forEach(button => button.addEventListener('click', () => {
    const key = auditFilterKey(button.dataset.auditDropdownClear);
    if (key) state.filters.audit[key] = [];
    render();
  }));
  document.querySelectorAll('[data-audit-dropdown-close]').forEach(button => button.addEventListener('click', () => {
    state.ui.auditDropdown = '';
    state.ui.auditDropdownSearch = '';
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
    const list = type === 'account' ? state.accounts : type === 'provision' ? state.provisions : state.categories;
    const item = list.find(x => x.id === id);
    state.ui.iconPicker = { type, id, icon: item?.icon || 'folder', color: item?.color || '#0A8FE8' };
    openSheet('icon');
  }));
  document.querySelectorAll('[data-account-edit]').forEach(button => button.addEventListener('click', () => {
    state.ui.editAccountId = button.dataset.accountEdit;
    state.ui.accountDraft = null;
    openSheet('new-account');
  }));
  document.querySelectorAll('[data-account-actions]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    state.ui.selectedAccountId = button.dataset.accountActions;
    state.ui.editAccountId = button.dataset.accountActions;
    state.ui.accountDraft = null;
    ensureAccountDraft();
    openSheet('account-actions');
  }));
  document.querySelectorAll('[data-account-move]').forEach(button => button.addEventListener('click', async () => {
    await moveAccount(button.dataset.accountMove, Number(button.dataset.direction));
    render();
  }));
  bindAccountDrag();
  document.querySelectorAll('[data-account-kpi]').forEach(input => input.addEventListener('change', async () => {
    const [id, key] = input.dataset.accountKpi.split(':');
    await mutate(s => {
      const account = s.accounts.find(item => item.id === id);
      if (!account) return;
      account.kpi = { income: true, expense: true, balance: true, available: true, visible: true, ...(account.kpi || {}) };
      account.kpi[key] = input.checked;
    }, { undo: 'KPI de cuenta actualizado' });
    render();
  }));
  document.querySelectorAll('[data-picker-tab]').forEach(button => button.addEventListener('click', () => {
    state.ui.iconPicker.tab = button.dataset.pickerTab;
    render();
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
      const list = picker.type === 'account' ? s.accounts : picker.type === 'provision' ? s.provisions : s.categories;
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
  document.querySelectorAll('[data-open-option]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const target = button.dataset.openOption;
    const options = JSON.parse(button.dataset.options || '[]');
    openOptionPicker({
      title: optionTitle(target),
      target,
      options,
      value: optionCurrentValue(target),
      returnSheet: button.dataset.returnSheet || state.ui.activeSheet || ''
    });
  }));
  document.querySelectorAll('[data-option-value]').forEach(button => button.addEventListener('click', () => applyOptionSelection(button.dataset.optionValue || '')));
  document.querySelector('[data-option-search]')?.addEventListener('input', event => {
    if (!state.ui.optionPicker) return;
    state.ui.optionPicker.search = event.target.value;
    render();
  });
  document.querySelectorAll('[data-record-pick]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const key = button.dataset.recordPick;
    const flow = state.ui.recordFlow || {};
    const options = key === 'movement'
      ? optionObjects(['Gasto', 'Ingreso', 'Provisión'])
      : key === 'category'
      ? optionObjects(state.categories.map(category => category.name), flow.type === 'income' ? 'Sin categoría' : 'Seleccionar')
      : optionObjects(state.accounts.map(account => account.name), 'Seleccionar');
    openOptionPicker({
      title: key === 'movement' ? 'Tipo de movimiento' : key === 'accountTo' ? 'Cuenta destino' : key === 'account' ? 'Cuenta' : 'Categoría',
      target: `record.${key}`,
      options,
      value: flow[key] || '',
      returnSheet: ''
    });
  }));
  document.querySelectorAll('[data-account-action]').forEach(button => button.addEventListener('click', () => {
    ensureAccountDraft();
    state.ui.activeSheet = button.dataset.accountAction;
    render();
  }));
  document.querySelectorAll('[data-category-actions]').forEach(button => button.addEventListener('click', () => {
    state.ui.selectedCategoryId = button.dataset.categoryActions;
    state.ui.categoryDraft = null;
    state.ui.activeSheet = 'category-actions';
    render();
  }));
  document.querySelectorAll('[data-category-action]').forEach(button => button.addEventListener('click', () => {
    ensureCategoryDraft();
    state.ui.activeSheet = button.dataset.categoryAction;
    render();
  }));
  document.querySelectorAll('[data-category-draft-field]').forEach(input => input.addEventListener('input', () => {
    ensureCategoryDraft()[input.dataset.categoryDraftField] = input.value;
  }));
  document.querySelectorAll('[data-category-picker-tab]').forEach(button => button.addEventListener('click', () => {
    ensureCategoryDraft().pickerTab = button.dataset.categoryPickerTab;
    rerenderSheetPreserveScroll();
  }));
  document.querySelectorAll('[data-category-sub-input]').forEach(input => input.addEventListener('input', () => {
    const draft = ensureCategoryDraft();
    const index = Number(input.dataset.categorySubInput);
    draft.subcategories[index] = { ...(draft.subcategories[index] || { id: uid('sub') }), name: input.value };
  }));
  document.querySelector('[data-category-sub-add]')?.addEventListener('click', () => {
    ensureCategoryDraft().subcategories.push({ id: uid('sub'), name: '' });
    rerenderSheetPreserveScroll();
  });
  document.querySelectorAll('[data-category-sub-delete]').forEach(button => button.addEventListener('click', () => {
    state.ui.selectedSubcategory = button.dataset.categorySubDelete;
    state.ui.activeSheet = 'confirm-delete-subcategory';
    render();
  }));
  document.querySelectorAll('[data-save-category-section]').forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    const category = selectedCategory();
    if (!category) return;
    const saved = await updateCategory(category.id, normalizedCategoryDraft());
    if (saved) {
      state.ui.categoryDraft = null;
      state.ui.activeSheet = 'category-actions';
      render();
    }
  }));
  document.querySelector('[data-confirm-delete-subcategory]')?.addEventListener('click', async () => {
    const category = selectedCategory();
    if (!category) return;
    const deleted = await deleteSubcategory(category.id, state.ui.selectedSubcategory);
    if (deleted) {
      state.ui.selectedSubcategory = '';
      state.ui.categoryDraft = null;
      state.ui.activeSheet = 'category-actions';
      render();
    }
  });
  document.querySelector('[data-confirm-delete-category]')?.addEventListener('click', async () => {
    const category = selectedCategory();
    if (!category) return;
    const deleted = await deleteCategory(category.id);
    if (deleted) {
      state.ui.selectedCategoryId = '';
      state.ui.categoryDraft = null;
      closeSheet();
      render();
    }
  });
  document.querySelectorAll('[data-account-draft-field]').forEach(input => input.addEventListener('input', () => {
    ensureAccountDraft()[input.dataset.accountDraftField] = input.value;
  }));
  document.querySelectorAll('[data-account-form-kpi]').forEach(input => input.addEventListener('change', () => {
    const draft = ensureAccountDraft();
    draft.kpi = { ...(draft.kpi || {}) };
    draft.kpi[input.dataset.accountFormKpi] = input.checked;
  }));
  document.querySelectorAll('[data-account-picker-tab]').forEach(button => button.addEventListener('click', () => {
    ensureAccountDraft().pickerTab = button.dataset.accountPickerTab;
    rerenderSheetPreserveScroll();
  }));
  document.querySelectorAll('[data-save-account-section]').forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    await saveAccountSection(button.dataset.saveAccountSection);
  }));
  document.querySelectorAll('[data-confirm-delete-account]').forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    const deleted = await deleteAccount(button.dataset.confirmDeleteAccount);
    if (deleted) {
      state.ui.selectedAccountId = '';
      state.ui.accountDraft = null;
      closeSheet();
      render();
    }
  }));
  document.querySelectorAll('[data-form-icon]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const value = button.dataset.formIcon;
    const sheet = button.closest('.sheet');
    const draft = isCategoryDraftSheet() ? ensureCategoryDraft() : ensureAccountDraft();
    draft.icon = value;
    const color = draft.color || sheet?.querySelector('[data-create-field="color"]')?.value || '#0A8FE8';
    const iconInput = sheet?.querySelector('[data-create-field="icon"]');
    if (iconInput) iconInput.value = value;
    sheet?.querySelectorAll('[data-form-icon]').forEach(item => {
      item.classList.toggle('active', item === button);
      item.style.background = item === button ? color : '';
      item.style.color = item === button ? '#fff' : '';
    });
    const preview = sheet?.querySelector('[data-form-icon-preview]');
    if (preview) preview.innerHTML = icon(value);
  }));
  document.querySelectorAll('[data-form-color]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const value = button.dataset.formColor;
    const draft = isCategoryDraftSheet() ? ensureCategoryDraft() : ensureAccountDraft();
    draft.color = value;
    const sheet = button.closest('.sheet');
    const colorInput = sheet?.querySelector('[data-create-field="color"]');
    if (colorInput) colorInput.value = value;
    sheet?.querySelectorAll('[data-form-color]').forEach(item => item.classList.toggle('active', item === button));
    const preview = sheet?.querySelector('[data-form-icon-preview]');
    if (preview) preview.style.background = value;
    const activeIcon = sheet?.querySelector('[data-form-icon].active');
    if (activeIcon) activeIcon.style.background = value;
  }));
  document.querySelectorAll('[data-create-action]').forEach(button => button.addEventListener('click', async () => {
    const isAccount = ['create-account', 'update-account'].includes(button.dataset.createAction);
    const isCategory = button.dataset.createAction === 'create-category';
    const data = isAccount ? normalizedAccountDraft() : isCategory ? normalizedCategoryDraft() : Object.fromEntries([...document.querySelectorAll('[data-create-field]')].map(input => [input.dataset.createField, input.value]));
    let saved = false;
    debugLog('create action validation', { action: button.dataset.createAction, data });
    if (button.dataset.createAction === 'create-account') saved = await addAccount(data);
    if (button.dataset.createAction === 'update-account') saved = await updateAccount(state.ui.editAccountId, data);
    if (button.dataset.createAction === 'create-category') {
      if (!data.name?.trim()) {
        showToast('Nombre de categoría requerido');
      } else if (state.categories.some(c => canon(c.name) === canon(data.name))) {
        showToast('La categoría ya existe');
      } else {
        const before = state.categories.length;
        await addCategory(data);
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
    if (saved) {
      state.ui.accountDraft = null;
      state.ui.categoryDraft = null;
      closeSheet();
    }
    render();
  }));
  document.querySelectorAll('[data-rec-draft-field]').forEach(input => input.addEventListener('input', () => {
    ensureRecurringDraft()[input.dataset.recDraftField] = input.value;
  }));
  document.querySelectorAll('[data-save-recurring]').forEach(button => button.addEventListener('click', async () => {
    const data = ensureRecurringDraft();
    debugLog('recurring save validation', data);
    const saved = await saveRecurring({ ...data, amount: parseAmount(data.amount) || 0 });
    debugLog('recurring save result', { saved, recurring: state.recurring.length });
    if (saved) {
      state.ui.recurringDraft = null;
      closeSheet();
    }
    render();
  }));
  document.querySelectorAll('[data-import-confirm]').forEach(button => button.addEventListener('click', () => {
    confirmImportDraft().catch(error => captureError('confirm import', error));
  }));
  document.querySelectorAll('[data-import-discard]').forEach(button => button.addEventListener('click', () => {
    const draft = state.ui.importDraft;
    if (!draft) return;
    draft.discardedRows = [...new Set([...(draft.discardedRows || []), button.dataset.importDiscard])];
    render();
  }));
  document.querySelectorAll('[data-tx-duplicate]').forEach(button => button.addEventListener('click', async () => {
    await duplicateTransaction(button.dataset.txDuplicate);
    closeSheet();
    render();
  }));
  document.querySelectorAll('[data-tx-edit]').forEach(button => button.addEventListener('click', () => {
    startTransactionEdit(button.dataset.txEdit);
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

function optionTitle(target) {
  return {
    'import.kind': 'Tipo de importación',
    'account.type': 'Tipo de cuenta',
    'recurring.type': 'Tipo',
    'recurring.account': 'Cuenta',
    'recurring.category': 'Categoría',
    'record.account': 'Cuenta',
    'record.accountTo': 'Cuenta destino',
    'record.category': 'Categoría'
  }[target] || 'Seleccionar';
}

function optionCurrentValue(target) {
  if (target === 'import.kind') return state.ui.importDraft?.kind || '';
  if (target === 'account.type') return ensureAccountDraft().type || '';
  if (target.startsWith('recurring.')) return ensureRecurringDraft()[target.split('.')[1]] || '';
  if (target.startsWith('record.')) return state.ui.recordFlow?.[target.split('.')[1]] || '';
  return '';
}

function normalizedAccountDraft() {
  const draft = ensureAccountDraft();
  const type = draft.type === 'Otro' && draft.customType?.trim() ? draft.customType.trim() : draft.type;
  return {
    name: draft.name || '',
    type,
    icon: draft.icon || inferIcon(draft.name || '', 'account'),
    color: draft.color || '#0A8FE8',
    kpi: {
      income: draft.kpi?.income !== false,
      expense: draft.kpi?.expense !== false,
      balance: draft.kpi?.balance !== false,
      available: draft.kpi?.available !== false,
      visible: draft.kpi?.visible !== false
    }
  };
}

async function saveAccountSection(section) {
  const account = selectedAccount();
  if (!account) return;
  const draft = ensureAccountDraft();
  if (section === 'adjust') {
    const saved = await createBalanceAdjustment(account.name, draft.adjustAmount, draft.adjustNote);
    if (saved) {
      closeSheet();
      render();
    }
    return;
  }
  const saved = await updateAccount(account.id, normalizedAccountDraft());
  debugLog('account section saved', { section, saved });
  if (saved) {
    state.ui.accountDraft = null;
    closeSheet();
    render();
  }
}

function bindAccountDrag() {
  document.querySelectorAll('[data-account-drag]').forEach(handle => {
    handle.addEventListener('dragstart', event => {
      draggedAccountId = handle.dataset.accountDrag;
      handle.closest('.account-admin-card')?.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
    });
    handle.addEventListener('dragend', () => {
      draggedAccountId = '';
      document.querySelectorAll('.account-admin-card.dragging').forEach(card => card.classList.remove('dragging'));
    });
    handle.addEventListener('dragover', event => event.preventDefault());
    handle.addEventListener('drop', event => {
      event.preventDefault();
      reorderAccountTo(draggedAccountId, handle.dataset.accountDrag).catch(error => captureError('account drag drop', error));
    });
    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      pointerDragAccount = { id: handle.dataset.accountDrag, x: event.clientX, y: event.clientY };
      handle.setPointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointerup', event => {
      if (!pointerDragAccount) return;
      const delta = Math.abs(event.clientY - pointerDragAccount.y);
      const sourceId = pointerDragAccount.id;
      pointerDragAccount = null;
      if (delta < 12) return;
      const targetHandle = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-account-drag]');
      if (targetHandle) reorderAccountTo(sourceId, targetHandle.dataset.accountDrag).catch(error => captureError('account pointer reorder', error));
    });
  });
}

async function reorderAccountTo(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  await mutate(s => {
    const accounts = [...s.accounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const sourceIndex = accounts.findIndex(account => account.id === sourceId);
    const targetIndex = accounts.findIndex(account => account.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [item] = accounts.splice(sourceIndex, 1);
    accounts.splice(targetIndex, 0, item);
    accounts.forEach((account, order) => { account.order = order; });
    s.accounts = accounts;
  }, { undo: 'Orden de cuentas actualizado' });
  render();
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
  if (action === 'import-transactions') {
    state.ui.importDraft = { kind: 'transactions', objects: [], issues: [] };
    return openSheet('import-transactions');
  }
  if (action === 'import-catalogs') {
    state.ui.importDraft = { kind: 'accounts', objects: [], issues: [] };
    return openSheet('import-catalogs');
  }
  if (action === 'new-account') {
    state.ui.editAccountId = '';
    state.ui.accountDraft = null;
    return openSheet(action);
  }
  if (action === 'new-category') {
    state.ui.selectedCategoryId = '';
    state.ui.categoryDraft = null;
    return openSheet(action);
  }
  if (['new-provision', 'recurring'].includes(action)) return openSheet(action);
  if (action === 'icons') return showToast('Elige Icono dentro de una cuenta o categoría');
  if (action === 'rules') return setSettingsPage('rules');
  if (action === 'appearance' || action === 'security' || action === 'cloud') return showToast('Próximamente');
  showToast('Función en preparación');
}

function openOptionPicker(config) {
  state.ui.optionPicker = {
    title: config.title || 'Seleccionar',
    options: config.options || [],
    value: config.value || '',
    target: config.target,
    returnSheet: config.returnSheet || state.ui.activeSheet,
    search: ''
  };
  state.ui.activeSheet = 'option-picker';
  render();
}

function optionPickerSheet() {
  const picker = state.ui.optionPicker || {};
  const searchable = (picker.options || []).length > 8;
  const search = picker.search || '';
  const options = (picker.options || []).filter(option => !search || canon(option.label || option.value).includes(canon(search)));
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet picker-sheet ${searchable ? 'has-search' : ''}" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${html(picker.title || 'Seleccionar')}</h2>
        ${searchable ? `<input class="input" data-option-search placeholder="Buscar..." value="${html(search)}" autofocus>` : ''}
        <div class="option-list">
          ${options.map(option => `
            <button class="option-row ${option.value === picker.value ? 'selected' : ''}" data-option-value="${html(option.value)}">
              <span>${html(option.label || option.value)}</span>
              ${option.value === picker.value ? icon('check') : ''}
            </button>
          `).join('') || '<div class="empty-state">Sin opciones</div>'}
        </div>
        <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

function applyOptionSelection(value) {
  const picker = state.ui.optionPicker;
  if (!picker?.target) return;
  if (picker.target === 'import.kind') {
    state.ui.importDraft = { kind: value, objects: [], issues: [], discardedRows: [] };
  } else if (picker.target === 'account.type') {
    ensureAccountDraft().type = value;
  } else if (picker.target.startsWith('recurring.')) {
    const key = picker.target.split('.')[1];
    ensureRecurringDraft()[key] = value;
  } else if (picker.target.startsWith('record.')) {
    const key = picker.target.split('.')[1];
    if (state.ui.recordFlow) {
      if (key === 'movement') {
        state.ui.recordFlow.type = { Gasto: 'expense', Ingreso: 'income', 'Provisión': 'provision' }[value] || 'expense';
        state.ui.recordFlow.category = '';
        state.ui.recordFlow.subcategory = '';
      } else {
        state.ui.recordFlow[key] = value;
        if (key === 'category') state.ui.recordFlow.subcategory = '';
      }
    }
  }
  state.ui.activeSheet = picker.returnSheet || '';
  state.ui.optionPicker = null;
  render();
}

function pickerButton(value, placeholder, target, options, returnSheet, extraClass = '') {
  return `
    <button class="select-button ${extraClass}" data-open-option="${target}" data-return-sheet="${returnSheet}" data-options="${html(JSON.stringify(options))}">
      <span>${value ? html(value) : html(placeholder)}</span>
      ${icon('chevronDown')}
    </button>
  `;
}

function optionObjects(values, emptyLabel = '') {
  const list = values.map(value => ({ value, label: value }));
  return emptyLabel ? [{ value: '', label: emptyLabel }, ...list] : list;
}

function ensureAccountDraft() {
  const editId = state.ui.editAccountId || '';
  const existing = state.accounts.find(item => item.id === editId);
  if (!state.ui.accountDraft || state.ui.accountDraft.id !== editId) {
    state.ui.accountDraft = {
      id: editId,
      name: existing?.name || '',
      type: existing?.type || 'Cuenta Corriente',
      customType: '',
      icon: existing?.icon || inferIcon(existing?.name || '', 'account'),
      color: existing?.color || '#0A8FE8',
      kpi: {
        income: existing?.kpi?.income !== false,
        expense: existing?.kpi?.expense !== false,
        balance: existing?.kpi?.balance !== false,
        available: existing?.kpi?.available !== false,
        visible: existing?.kpi?.visible !== false
      },
      adjustAmount: '',
      adjustNote: '',
      pickerTab: 'icon'
    };
  }
  return state.ui.accountDraft;
}

function ensureRecurringDraft() {
  if (!state.ui.recurringDraft) {
    state.ui.recurringDraft = { type: 'Pago', day: '1', name: '', amount: '', account: '', category: '' };
  }
  return state.ui.recurringDraft;
}

function selectedAccount() {
  return state.accounts.find(account => account.id === state.ui.selectedAccountId || account.id === state.ui.editAccountId);
}

function selectedCategory() {
  return state.categories.find(category => category.id === state.ui.selectedCategoryId);
}

function isCategoryDraftSheet() {
  return ['category-visual', 'new-category'].includes(state.ui.activeSheet);
}

function ensureCategoryDraft() {
  const category = selectedCategory();
  if (!state.ui.categoryDraft || state.ui.categoryDraft.id !== state.ui.selectedCategoryId) {
    state.ui.categoryDraft = {
      id: state.ui.selectedCategoryId || '',
      name: category?.name || '',
      icon: category?.icon || inferIcon(category?.name || '', 'category'),
      color: category?.color || '#0A8FE8',
      subcategories: (category?.subcategories || []).map(sub => ({ id: sub.id || uid('sub'), name: sub.name || sub })),
      pickerTab: 'icon'
    };
  }
  return state.ui.categoryDraft;
}

function normalizedCategoryDraft() {
  const draft = ensureCategoryDraft();
  const subcategories = typeof draft.subcategoriesText === 'string'
    ? draft.subcategoriesText.split(',').map(name => ({ id: uid('sub'), name: name.trim() })).filter(sub => sub.name)
    : (draft.subcategories || []).map(sub => ({
      id: sub.id || uid('sub'),
      name: (sub.name || '').trim()
    })).filter(sub => sub.name);
  return {
    name: draft.name || '',
    icon: draft.icon || inferIcon(draft.name || '', 'category'),
    color: draft.color || '#0A8FE8',
    subcategories
  };
}

function importSheetV702(defaultKind) {
  const catalog = state.ui.activeSheet === 'import-catalogs';
  const kinds = catalog
    ? [['accounts', 'Cuentas'], ['categories', 'Categorías y subcategorías'], ['provisions', 'Provisiones'], ['recurring', 'Pagos e ingresos recurrentes']]
    : [['transactions', 'Movimientos'], ['budgets', 'Presupuesto']];
  const draft = state.ui.importDraft || { kind: defaultKind, objects: [], issues: [] };
  const kindOptions = kinds.map(([value, label]) => ({ value, label }));
  const headers = templateHeaders[draft.kind] || [];
  const issues = draft.issues || [];
  const discarded = new Set(draft.discardedRows || []);
  const reviewRows = (draft.objects || [])
    .map((row, index) => ({ row, index, issue: issues.find(item => item.row === row) }))
    .filter(item => item.issue && !discarded.has(rowKey(item.row, item.index)));
  const importableRows = (draft.objects || [])
    .filter((row, index) => !discarded.has(rowKey(row, index)) && !isBlockingImportIssue(issues.find(item => item.row === row)));
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${catalog ? 'Importar catálogos' : 'Importar datos'}</h2>
        <div class="field"><label>Tipo</label>${pickerButton(kinds.find(([k]) => k === draft.kind)?.[1] || draft.kind, 'Seleccionar', 'import.kind', kindOptions, state.ui.activeSheet)}</div>
        <label class="import-dropzone">
          <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('fileUp')}</span>
          <span><strong>Seleccionar CSV</strong><small>Se validará antes de guardar</small></span>
          <input type="file" accept=".csv,text/csv" data-import-file class="file-input-native">
        </label>
        ${draft.objects?.length ? `<div class="card import-summary"><strong>${draft.objects.length} filas leidas</strong><small>${importableRows.length} listas para importar · ${reviewRows.length} por revisar · ${discarded.size} descartadas.</small></div>` : ''}
        ${reviewRows.length ? `<div class="import-card-list">${reviewRows.slice(0, 40).map(item => importRowCard(item.row, item.index, headers, item.issue)).join('')}</div>` : ''}
        ${reviewRows.length > 40 ? `<div class="card"><small class="muted">Mostrando 40 de ${reviewRows.length} filas por revisar.</small></div>` : ''}
        ${draft.objects?.length && !reviewRows.length ? '<div class="card"><strong>Sin filas con errores</strong><small class="muted">Se importaran solo las filas validas.</small></div>' : ''}
        ${draft.objects?.length ? `<button class="primary-button" data-import-confirm ${importableRows.length ? '' : 'disabled'}>Confirmar importacion (${importableRows.length})</button>` : ''}
        <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

function importRowCard(row, index, headers, issue = null) {
  const showHeaders = headers.length ? headers : Object.keys(row).filter(key => key !== '__row');
  return `
    <div class="import-preview-row ${issue ? 'issue' : ''}">
      <div class="import-row-head">
        <strong>Fila ${row.__row || index + 2}</strong>
        ${issue ? `<span class="issue-pill">${issue.fields.join(' · ')}</span>` : '<span class="ok-pill">Lista</span>'}
      </div>
      <div class="import-field-grid">
        ${showHeaders.map(field => `
          <label class="field compact-field">
            <span>${field.replace(/_/g, ' ')}</span>
            <input class="input" data-import-edit="${index}:${field}" value="${html(row[field] ?? '')}">
          </label>
        `).join('')}
      </div>
      <button class="secondary-button compact-danger" data-import-discard="${rowKey(row, index)}">Descartar fila</button>
    </div>
  `;
}

function rowKey(row, index) {
  return String(row.__row || index + 2);
}

function isBlockingImportIssue(issue) {
  return !!issue?.fields?.some(field => /inval|inv.|requer/i.test(String(field)));
}

function categoryActionsSheet() {
  const category = selectedCategory();
  if (!category) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <div class="account-form-preview">
          <span class="icon-preview-medium" style="background:${category.color || '#0A8FE8'};color:#fff;">${icon(category.icon || 'folder')}</span>
          <div><strong>${html(category.name)}</strong><small>${(category.subcategories || []).length} subcategorias</small></div>
        </div>
        ${categoryActionRow('category-visual', 'sparkles', 'Cambiar icono y color', 'Preview antes de guardar')}
        ${categoryActionRow('category-name', 'edit', 'Cambiar nombre', 'Renombra categoria y registros asociados')}
        ${categoryActionRow('category-subcategories', 'listChecks', 'Editar subcategorias', 'Agregar, renombrar o eliminar subcategorias')}
        ${categoryActionRow('confirm-delete-category', 'trash', 'Borrar categoria', 'Elimina sus movimientos y presupuestos', 'danger-action-row')}
        <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

function categoryActionRow(sheet, iconName, title, subtitle, extraClass = '') {
  return `<button class="settings-row ${extraClass}" data-category-action="${sheet}"><span class="row-icon solid-icon" style="background:var(--blue);color:#fff;">${icon(iconName)}</span><span><strong>${title}</strong><small>${subtitle}</small></span>${icon('chevronRight')}</button>`;
}

function categoryVisualSheet() {
  const draft = ensureCategoryDraft();
  const tab = draft.pickerTab || 'icon';
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide icon-picker-sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row">
          <button class="ghost-icon" data-category-action="category-actions" aria-label="Volver">${icon('chevronLeft')}</button>
          <h2 class="sheet-title">Icono y color</h2>
          <button class="done-button" data-save-category-section="visual">Hecho</button>
        </div>
        ${renderDraftIconColorPicker(draft, 'category')}
      </section>
    </div>
  `;
}

function categoryNameSheet() {
  const draft = ensureCategoryDraft();
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Cambiar nombre</h2>
      <div class="field"><label>Nombre</label><input class="input" data-category-draft-field="name" value="${html(draft.name || '')}" placeholder="Nombre de categoria"></div>
      <button class="primary-button" data-save-category-section="name">Guardar nombre</button>
      <button class="secondary-button mt-sm" data-category-action="category-actions">Volver</button>
    </section></div>
  `;
}

function categorySubcategoriesSheet() {
  const draft = ensureCategoryDraft();
  const rows = draft.subcategories || [];
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Subcategorias</h2>
      <div class="card import-summary"><strong>${rows.length}</strong><small>subcategorias en esta categoria</small></div>
      <div class="subcat-edit-list">
        ${rows.map((sub, index) => `
          <div class="subcat-edit-row">
            <input class="input" data-category-sub-input="${index}" value="${html(sub.name || '')}" placeholder="Subcategoria">
            <button class="ghost-icon compact-edit" data-category-sub-delete="${html(sub.name || '')}" aria-label="Eliminar subcategoria">${icon('trash')}</button>
          </div>
        `).join('') || '<div class="empty-state compact-empty">Sin subcategorias</div>'}
      </div>
      <button class="create-action-button create-action-button-muted" data-category-sub-add><span class="create-icon">${icon('plus')}</span><span><strong>Agregar subcategoria</strong><small>Incluye una nueva opcion dentro de esta categoria.</small></span>${icon('chevronRight')}</button>
      <button class="primary-button mt-sm" data-save-category-section="subcategories">Guardar subcategorias</button>
      <button class="secondary-button mt-sm" data-category-action="category-actions">Volver</button>
    </section></div>
  `;
}

function confirmDeleteSubcategorySheet() {
  const category = selectedCategory();
  const subcategory = state.ui.selectedSubcategory || '';
  if (!category || !subcategory) return '';
  const impact = subcategoryDeleteImpact(category.id, subcategory);
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Eliminar subcategoria</h2>
      <p class="muted">Los registros asociados seguiran vivos dentro de "${html(category.name)}", pero quedaran sin subcategoria.</p>
      <div class="import-summary card"><strong>Impacto estimado</strong><small>${impact.transactions} movimientos · ${impact.budgets} presupuestos</small></div>
      <button class="danger-button" data-confirm-delete-subcategory>Eliminar subcategoria</button>
      <button class="secondary-button mt-sm" data-category-action="category-subcategories">Cancelar</button>
    </section></div>
  `;
}

function confirmDeleteCategorySheet() {
  const category = selectedCategory();
  if (!category) return '';
  const impact = categoryDeleteImpact(category.id);
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Borrar categoria</h2>
      <p class="muted">Borrar esta categoria eliminara sus movimientos y presupuestos asociados. Esto puede cambiar balances, ingresos, gastos y presupuesto historico.</p>
      <p class="muted">Si quieres conservar historial, cambia el nombre de la categoria o corrige registros desde Auditoria.</p>
      <div class="import-summary card"><strong>Impacto estimado</strong><small>${impact.transactions} movimientos · ${impact.budgets} presupuestos · ${impact.recurring} recurrencias quedaran sin categoria</small></div>
      <button class="danger-button" data-confirm-delete-category>Eliminar categoria definitivamente</button>
      <button class="secondary-button mt-sm" data-category-action="category-actions">Cancelar</button>
    </section></div>
  `;
}

function accountActionsSheet() {
  const account = selectedAccount();
  if (!account) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <div class="account-form-preview">
          <span class="icon-preview-medium" style="background:${account.color || '#0A8FE8'};color:#fff;">${icon(account.icon || 'landmark')}</span>
          <div><strong>${html(account.name)}</strong><small>${html(account.type || 'Cuenta Corriente')}</small></div>
        </div>
        ${accountActionRow('account-kpis', 'settings', 'KPIs', 'Define qué métricas impacta esta cuenta')}
        ${accountActionRow('account-visual', 'sparkles', 'Icono y color', 'Biblioteca completa y preview antes de guardar')}
        ${accountActionRow('account-name-type', 'edit', 'Nombre y tipo', 'Edita nombre y clasificación')}
        ${accountActionRow('account-adjust', 'badgeDollar', 'Ajustar saldo', 'Crea movimiento auditable')}
        ${accountActionRow('confirm-delete-account', 'trash', 'Eliminar cuenta', 'Borra la cuenta y sus registros asociados', 'danger-action-row')}
        <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

function accountActionRow(sheet, iconName, title, subtitle, extraClass = '') {
  return `<button class="settings-row ${extraClass}" data-account-action="${sheet}"><span class="row-icon solid-icon" style="background:var(--blue);color:#fff;">${icon(iconName)}</span><span><strong>${title}</strong><small>${subtitle}</small></span>${icon('chevronRight')}</button>`;
}

function renderDraftIconColorPicker(draft, kind, showPreview = true) {
  const iconName = draft.icon || (kind === 'category' ? 'folder' : 'landmark');
  const color = draft.color || '#0A8FE8';
  return renderIconColorPickerContent({
    iconName,
    color,
    tab: draft.pickerTab || 'icon',
    tabDataset: kind === 'category' ? 'data-category-picker-tab' : 'data-account-picker-tab',
    iconDataset: 'data-form-icon',
    colorDataset: 'data-form-color',
    showPreview
  });
}

function accountKpiSheet() {
  const draft = ensureAccountDraft();
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">KPIs de cuenta</h2>
      <div class="switch-grid single">
        ${formKpiSwitch('income', 'Ingresos', draft.kpi?.income !== false)}
        ${formKpiSwitch('expense', 'Gastos', draft.kpi?.expense !== false)}
        ${formKpiSwitch('balance', 'Balance total', draft.kpi?.balance !== false)}
        ${formKpiSwitch('available', 'Disponible', draft.kpi?.available !== false)}
        ${formKpiSwitch('visible', 'Visible en Balances', draft.kpi?.visible !== false)}
      </div>
      <button class="primary-button" data-save-account-section="kpis">Guardar KPIs</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function accountVisualSheet() {
  const draft = ensureAccountDraft();
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide icon-picker-sheet" onclick="event.stopPropagation()">
      <div class="sheet-head-row">
        <button class="ghost-icon" data-account-action="account-actions" aria-label="Volver">${icon('chevronLeft')}</button>
        <h2 class="sheet-title">Icono y color</h2>
        <button class="done-button" data-save-account-section="visual">Hecho</button>
      </div>
      ${renderDraftIconColorPicker(draft, 'account')}
    </section></div>
  `;
}

function accountNameTypeSheet() {
  const draft = ensureAccountDraft();
  const knownTypes = [...new Set([...(state.accountTypes || []), 'Cuenta Corriente', 'Cuenta de Ahorros', 'Tarjeta de Crédito', 'Cuenta de Inversiones', 'Otro'])];
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Nombre y tipo</h2>
      <div class="field"><label>Nombre</label><input class="input" data-account-draft-field="name" value="${html(draft.name || '')}" placeholder="Nombre de cuenta"></div>
      <div class="field"><label>Tipo de cuenta</label>${pickerButton(draft.type, 'Seleccionar tipo', 'account.type', optionObjects(knownTypes), 'account-name-type')}</div>
      <div class="field"><label>Otro tipo</label><input class="input" data-account-draft-field="customType" value="${html(draft.customType || '')}" placeholder="Personalizado" ${draft.type === 'Otro' ? '' : 'disabled'}></div>
      <button class="primary-button" data-save-account-section="name-type">Guardar cambios</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function accountAdjustSheet() {
  const account = selectedAccount();
  const draft = ensureAccountDraft();
  if (!account) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Ajustar saldo</h2>
      <p class="muted">Se creará un movimiento auditable que afecta saldo, pero no ingresos, gastos ni presupuesto.</p>
      <div class="field"><label>Cuenta</label><div class="readonly-field">${html(account.name)}</div></div>
      <div class="field"><label>Monto del ajuste</label><input class="input" data-account-draft-field="adjustAmount" inputmode="decimal" value="${html(draft.adjustAmount || '')}" placeholder="Ej. 25.00 o -10.00"></div>
      <div class="field"><label>Nota</label><input class="input" data-account-draft-field="adjustNote" value="${html(draft.adjustNote || '')}" placeholder="Motivo del ajuste"></div>
      <button class="primary-button" data-save-account-section="adjust">Crear ajuste</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function confirmDeleteAccountSheet() {
  const account = selectedAccount();
  if (!account) return '';
  const impact = accountDeleteImpact(account.id);
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Eliminar cuenta</h2>
      <div class="account-form-preview">
        <span class="icon-preview-medium" style="background:${account.color || '#0A8FE8'};color:#fff;">${icon(account.icon || 'landmark')}</span>
        <div><strong>${html(account.name)}</strong><small>${html(account.type || 'Cuenta Corriente')}</small></div>
      </div>
      <p class="muted">Eliminar esta cuenta borrará sus movimientos asociados y puede cambiar balances, ingresos, gastos y presupuesto histórico. Las transferencias vinculadas se eliminarán completas para evitar registros huérfanos. Las recurrencias quedarán sin cuenta.</p>
      <p class="muted">Si solo quieres que no aparezca en Balances, apaga "Visible en Balances" en KPIs.</p>
      <div class="import-summary card">
        <strong>Impacto estimado</strong>
        <small>${impact.transactions} movimientos · ${impact.transfers} transferencias · ${impact.budgets} presupuestos · ${impact.recurring} recurrencias</small>
      </div>
      <button class="danger-button" data-confirm-delete-account="${account.id}">Eliminar cuenta definitivamente</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cancelar</button>
    </section></div>
  `;
}

function accountSheetV704() {
  const draft = ensureAccountDraft();
  const account = state.accounts.find(item => item.id === draft.id);
  const type = draft.type || 'Cuenta Corriente';
  const knownTypes = [...new Set([...(state.accountTypes || []), 'Cuenta Corriente', 'Cuenta de Ahorros', 'Tarjeta de Crédito', 'Cuenta de Inversiones', 'Otro'])];
  const typeOptions = optionObjects(knownTypes);
  const iconName = draft.icon || inferIcon(draft.name || '', 'account');
  const color = draft.color || '#0A8FE8';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">${account ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
      <div class="account-form-preview">
        <span class="icon-preview-medium" data-form-icon-preview style="background:${color};color:#fff;">${icon(iconName)}</span>
        <div>
          <strong>${draft.name ? html(draft.name) : 'Cuenta nueva'}</strong>
          <small>Define icono, color, tipo y KPIs antes de guardar.</small>
        </div>
      </div>
      <div class="field"><label>Nombre</label><input class="input" data-account-draft-field="name" value="${html(draft.name || '')}" placeholder="Nombre de cuenta"></div>
      <div class="two-col">
        <div class="field"><label>Tipo de cuenta</label>${pickerButton(type, 'Seleccionar tipo', 'account.type', typeOptions, 'new-account')}</div>
        <div class="field"><label>Otro tipo</label><input class="input" data-account-draft-field="customType" value="${html(draft.customType || '')}" placeholder="Personalizado" ${type === 'Otro' ? '' : 'disabled'}></div>
      </div>
      <div class="inline-picker-card">
        <div class="inline-picker-head"><strong>Icono y color</strong><small>El preview se actualiza al seleccionar.</small></div>
        ${renderDraftIconColorPicker(draft, 'account', false)}
      </div>
      <div class="switch-grid">
        ${formKpiSwitch('income', 'Ingresos', draft.kpi?.income !== false)}
        ${formKpiSwitch('expense', 'Gastos', draft.kpi?.expense !== false)}
        ${formKpiSwitch('balance', 'Balance', draft.kpi?.balance !== false)}
        ${formKpiSwitch('available', 'Disponible', draft.kpi?.available !== false)}
        ${formKpiSwitch('visible', 'Visible', draft.kpi?.visible !== false)}
      </div>
      <button class="primary-button" data-create-action="${account ? 'update-account' : 'create-account'}">${account ? 'Guardar cuenta' : 'Crear cuenta'}</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function formKpiSwitch(key, label, checked) {
  return `
    <label class="switch-row">
      <span>${label}</span>
      <input type="checkbox" data-account-form-kpi="${key}" ${checked ? 'checked' : ''}>
      <i></i>
    </label>
  `;
}

function accountSheet() {
  return simpleCreateSheet('Nueva cuenta', [['name', 'Nombre de cuenta'], ['type', 'Tipo o descripción']], 'Crear cuenta', 'create-account');
}

function categorySheet() {
  const draft = ensureCategoryDraft();
  const iconName = draft.icon || inferIcon(draft.name || '', 'category');
  const color = draft.color || '#0A8FE8';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">Nueva categoría</h2>
      <div class="account-form-preview">
        <span class="icon-preview-medium" data-form-icon-preview style="background:${color};color:#fff;">${icon(iconName)}</span>
        <div>
          <strong>${draft.name ? html(draft.name) : 'Categoría nueva'}</strong>
          <small>Define nombre, subcategorías, icono y color antes de guardar.</small>
        </div>
      </div>
      <div class="field"><label>Nombre</label><input class="input" data-category-draft-field="name" value="${html(draft.name || '')}" placeholder="Nombre de categoría"></div>
      <div class="field"><label>Subcategorías</label><input class="input" data-category-draft-field="subcategoriesText" value="${html(draft.subcategoriesText || '')}" placeholder="Separadas por coma"></div>
      <div class="inline-picker-card">
        <div class="inline-picker-head"><strong>Icono y color</strong><small>El preview se actualiza al seleccionar.</small></div>
        ${renderDraftIconColorPicker(draft, 'category', false)}
      </div>
      <button class="primary-button" data-create-action="create-category">Crear categoría</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function provisionSheet() {
  return simpleCreateSheet('Nueva provisión', [['name', 'Nombre de provisión'], ['balance', 'Saldo conceptual'], ['monthlyAmount', 'Planeación mensual']], 'Crear provisión', 'create-provision');
}

function recurringSheet() {
  const draft = ensureRecurringDraft();
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Pagos e ingresos recurrentes</h2>
      <div class="two-col"><div class="field"><label>Tipo</label>${pickerButton(draft.type, 'Tipo', 'recurring.type', optionObjects(['Pago', 'Ingreso']), 'recurring')}</div><div class="field"><label>Día mensual</label><input class="input" data-rec-draft-field="day" inputmode="numeric" value="${html(draft.day || '1')}"></div></div>
      <div class="field"><label>Nombre</label><input class="input" data-rec-draft-field="name" value="${html(draft.name || '')}" placeholder="Internet, tarjeta, salario..."></div>
      <div class="two-col"><div class="field"><label>Monto esperado</label><input class="input" data-rec-draft-field="amount" inputmode="decimal" value="${html(draft.amount || '')}" placeholder="Opcional"></div><div class="field"><label>Cuenta</label>${pickerButton(draft.account, 'Sin cuenta', 'recurring.account', optionObjects(state.accounts.map(a => a.name), 'Sin cuenta'), 'recurring')}</div></div>
      <div class="field"><label>Categoría</label>${pickerButton(draft.category, 'Sin categoría', 'recurring.category', optionObjects(state.categories.map(c => c.name), 'Sin categoría'), 'recurring')}</div>
      <button class="primary-button" data-save-recurring>Guardar recurrencia</button><button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function simpleCreateSheet(title, fields, button, action) {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet wide" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${title}</h2>
      ${fields.map(([key, label]) => `<div class="field"><label>${label}</label><input class="input" data-create-field="${key}" ${key.toLowerCase().includes('amount') || key === 'balance' || key === 'monthlyAmount' ? 'inputmode="decimal"' : ''}></div>`).join('')}
      <button class="primary-button" data-create-action="${action}">${button}</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
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
      <div class="search-results-list">${q ? rows.map(tx => `<button class="settings-row" data-open-tx="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('receipt')}</span><span><strong>${tx.description || tx.movement}</strong><small>${tx.account} · ${tx.category || tx.movement} · ${formatMoney(tx.amount)}</small></span>${icon('chevronRight')}</button>`).join('') || '<div class="empty-state">Sin resultados</div>' : '<div class="empty-state">Escribe para buscar</div>'}</div>
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
      <button class="primary-button" data-dismiss-health>Descartar alerta</button><button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function transactionMenuSheet() {
  const tx = state.transactions.find(item => item.id === state.ui.selectedTransactionId);
  if (!tx) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">${tx.description || tx.movement}</h2>
      <button class="settings-row" data-tx-edit="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('edit')}</span><span><strong>Editar</strong><small>${tx.transferId ? 'Actualiza las dos partes vinculadas' : 'Modifica los datos del movimiento'}</small></span>${icon('chevronRight')}</button>
      ${!tx.transferId ? `<button class="settings-row" data-tx-duplicate="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('copy')}</span><span><strong>Duplicar</strong><small>Crea una copia editable luego</small></span>${icon('chevronRight')}</button>` : ''}
      <button class="settings-row" data-tx-transfer="${tx.id}"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('repeat')}</span><span><strong>Convertir en transferencia</strong><small>Requiere contrapartida compatible</small></span>${icon('chevronRight')}</button>
      <button class="settings-row" data-tx-delete="${tx.id}"><span class="row-icon" style="background:var(--red-soft);color:var(--red)">${icon('trash')}</span><span><strong>Eliminar</strong><small>Podrás deshacerlo</small></span>${icon('chevronRight')}</button>
      <button class="secondary-button" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}


function debugSheet() {
  const financeLocalKeys = getFinanceLocalStorageKeys(localStorage);
  const otherLocalKeys = getOtherLocalStorageKeys(localStorage);
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
        <strong>localStorage de Finance</strong>
        <p class="muted">Prefijo: ${html(APP_STORAGE_PREFIX)}</p>
        <p class="muted">${financeLocalKeys.length ? financeLocalKeys.map(html).join(' · ') : 'Sin claves de Finance en localStorage'}</p>
      </div>
      <div class="card">
        <strong>Otras apps en este origen</strong>
        <p class="muted">Detectadas solo como referencia. Finance no las lee ni las borra.</p>
        <p class="muted">${otherLocalKeys.length ? otherLocalKeys.map(html).join(' · ') : 'No se detectaron claves externas'}</p>
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
      <button class="secondary-button mt-sm" data-debug-action="refresh">Refrescar inspector</button>
      <button class="danger-button mt-sm" data-debug-action="clear-cache">Limpiar service worker/cache de esta app</button>
      <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
    </section></div>
  `;
}

function restoreSheet() {
  return `
    <div class="sheet-backdrop open" data-sheet-close><section class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-handle"></div><h2 class="sheet-title">Restaurar respaldo</h2>
      <label class="card upload-label-card">
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
      <button class="danger-button" data-confirm-reset>Borrar data</button><button class="secondary-button mt-sm" data-sheet-close>Cancelar</button>
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
  localStorage.setItem(APP_STORAGE_KEYS.debugTest, JSON.stringify(value));
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
  if (event.target.matches('[data-import-edit]')) {
    const [index, field] = event.target.dataset.importEdit.split(':');
    const draft = state.ui.importDraft;
    if (!draft?.objects?.[Number(index)]) return;
    draft.objects[Number(index)][field] = event.target.value;
    draft.issues = importIssuesV702(draft.kind, draft.objects, state);
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('[data-import-file]')) {
    readImportFile(event.target.files[0]).catch(error => captureError('import csv', error));
  }
  if (event.target.matches('[data-import-edit]')) {
    const draft = state.ui.importDraft;
    if (draft) {
      draft.issues = importIssuesV702(draft.kind, draft.objects || [], state);
      render();
    }
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
  const text = await readCsvText(file);
  const parsed = parseCSV(text);
  const objects = rowsToObjects(parsed.rows);
  const kind = state.ui.importDraft?.kind || (state.ui.activeSheet === 'import-catalogs' ? 'accounts' : 'transactions');
  state.ui.importDraft = {
    kind,
    objects,
    issues: importIssuesV702(kind, objects, state),
    delimiter: parsed.delimiter,
    discardedRows: []
  };
  debugLog('import file parsed', { kind, rows: objects.length, issues: state.ui.importDraft.issues.length, delimiter: parsed.delimiter });
  render();
}

async function readCsvText(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  const text = utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
  return text.replace(/^\uFEFF/, '');
}

async function confirmImportDraft() {
  const draft = state.ui.importDraft;
  if (!draft?.objects?.length) return;
  const discarded = new Set(draft.discardedRows || []);
  const rows = draft.objects.filter((row, index) => !discarded.has(rowKey(row, index)) && !isBlockingImportIssue((draft.issues || []).find(item => item.row === row)));
  if (!rows.length) {
    showToast('No hay filas validas para importar');
    render();
    return;
  }
  debugLog('import confirm start', { kind: draft.kind, rows: rows.length, skipped: draft.objects.length - rows.length });
  if (['accounts', 'categories', 'provisions', 'recurring'].includes(draft.kind)) await importCatalog(draft.kind, rows);
  else await importTransactions(draft.kind, rows, state);
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
