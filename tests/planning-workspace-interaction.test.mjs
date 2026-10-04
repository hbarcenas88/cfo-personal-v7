import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createKeypadController } from '../src/components/keypad.js';
import { addMonthlyBudgetCategory, createBaseBudgetDraft, copyBaseBudgetIntoDraft, createMonthlyBudgetDraft, hasMonthlyBudgetChanges, updateMonthlyBudgetRow, removeMonthlyBudgetRow, copyMissingPreviousMonth, buildMonthlyBudgetChanges } from '../src/services/budgetPlanningService.js';
import { todayISO, localDateISO, formatMoney, uid } from '../src/utils/format.js';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const signatures = ['function openMonthlyBudget(', 'function returnFromBudgetEditor(', 'function bindPlanningWorkspace(', 'function bindTools(', 'function bindCalendarEvents(', 'function dismissActiveSheet('];
const definitions = signatures.map(signature => extractFunction(main, signature)).join('\n');
const state = {
  settingsPage: 'planning',
  accounts: [{ name: 'Bank' }],
  categories: [{ name: 'Casa', subcategories: ['Comida', 'Servicios'] }],
  provisions: [{ id: 'p1', balance: 100 }],
  budgets: [
    { id: 'b1', month: '2026-10', category: 'Casa', subcategory: 'Comida', account: 'Budget', amount: 50, source: 'Manual' },
    { id: 'b2', month: '2026-10', category: 'Casa', subcategory: 'Servicios', account: 'Budget', amount: 200, source: 'Manual' },
    { id: 'prior', month: '2026-09', category: 'Casa', subcategory: '', account: 'Budget', amount: 30, source: 'Importado' }
  ],
  ui: {}
};
let released = null;
let savedChanges = null;
let saveAllowed = true;
let renders = 0;
const context = {
  state, structuredClone, Date, todayISO, localDateISO, formatMoney, uid,
  createKeypadController, createMonthlyBudgetDraft, hasMonthlyBudgetChanges, updateMonthlyBudgetRow, removeMonthlyBudgetRow, copyMissingPreviousMonth,
  addMonthlyBudgetCategory, createBaseBudgetDraft, copyBaseBudgetIntoDraft,
  bindingContext: root => root,
  focusAfterNextRender: () => {},
  bindAccountDrag: () => {},
  setSettingsPage: page => { state.activeView = 'settings'; state.settingsPage = page; },
  setView: view => { state.activeView = view; state.settingsPage = ''; },
  openSheet: sheet => { state.ui.activeSheet = sheet; },
  closeSheet: () => { state.ui.activeSheet = ''; },
  render: () => { renders++; },
    releaseProvision: async (id, payload) => { released = { id, ...payload }; return true; },
  saveMonthlyBudgetDraft: async draft => { savedChanges = buildMonthlyBudgetChanges(draft, state); return saveAllowed; },
  saveBaseBudgetDraft: async draft => { savedChanges = buildMonthlyBudgetChanges(draft, state); return saveAllowed; }
};
const api = runInNewContext('let pendingPlanningNavigation = null; let calendarDraft = {};\n' + definitions + '\n({ openMonthlyBudget, bindPlanningWorkspace, bindTools, bindCalendarEvents, dismissActiveSheet });', context);

// Partial release: real keypad updates the domain payload and the remaining-balance preview.
state.ui.activeSheet = 'confirm-release-provision';
state.ui.planningDraft = { provisionId: 'p1', amountExpression: '', releaseAmount: 0 };
const key2 = element({ key: '2' });
const key0 = element({ key: '0' });
const confirmRelease = element({ confirmReleaseProvision: 'p1' });
const remaining = element();
const releaseRoot = root({
  '[data-key]': [key2, key0],
  '[data-confirm-release-provision]': [confirmRelease],
  '[data-release-remaining]': [remaining]
});
api.bindTools(releaseRoot);
await key2.click();
await key0.click();
assert.equal(state.ui.planningDraft.releaseAmount, 20);
assert.equal(remaining.textContent, '$80.00');
await confirmRelease.click();
assert.deepEqual(released, { id: 'p1', amount: 20 });
assert.equal(state.ui.planningDraft, null);

// Monthly amount remains a draft until Save; the existing financial row is untouched.
api.openMonthlyBudget('', '2026-10');
const originalBudgets = structuredClone(state.budgets);
const amountButton = element({ monthlyBudgetAmount: 'b1' });
api.bindPlanningWorkspace(root({ '[data-monthly-budget-amount]': [amountButton] }));
await amountButton.click();
const back = element({ key: 'back' });
const key7 = element({ key: '7' });
const amount0 = element({ key: '0' });
const applyAmount = element();
api.bindPlanningWorkspace(root({
  '[data-key]': [back, key7, amount0],
  '[data-monthly-budget-amount-apply]': [applyAmount]
}));
await back.click();
await back.click();
await key7.click();
await amount0.click();
await applyAmount.click();
assert.equal(state.ui.monthlyBudgetDraft.rows.find(row => row.id === 'b1').amount, 70);
assert.deepEqual(state.budgets, originalBudgets);
assert.equal(savedChanges, null);

// Copy prior-month missing groups while retaining the modified and existing groups.
const copy = element();
api.bindPlanningWorkspace(root({ '[data-monthly-budget-copy]': [copy] }));
await copy.click();
await copy.click();
assert.equal(state.ui.monthlyBudgetDraft.rows.filter(row => row.subcategory === '' && row.amount === 30).length, 1);
assert.equal(state.ui.monthlyBudgetDraft.rows.find(row => row.id === 'b1').amount, 70);
assert.equal(state.ui.monthlyBudgetDraft.rows.find(row => row.id === 'b2').amount, 200);
assert.deepEqual(state.budgets, originalBudgets);

// Month navigation with pending edits offers stay/discard and keeps the same draft on stay.
const stay = element();
const discard = element();
api.bindPlanningWorkspace(root({
  '[data-monthly-budget-stay]': [stay],
  '[data-monthly-budget-discard]': [discard]
}));
const pendingDraft = state.ui.monthlyBudgetDraft;
api.openMonthlyBudget('', '2026-11');
assert.equal(state.ui.activeSheet, 'monthly-budget-leave');
assert.equal(state.ui.monthlyBudgetDraft, pendingDraft);
await stay.click();
assert.equal(state.ui.monthlyBudgetDraft, pendingDraft);
assert.equal(state.ui.monthlyBudgetDraft.month, '2026-10');
api.openMonthlyBudget('', '2026-11');
await discard.click();
assert.equal(state.ui.monthlyBudgetDraft.month, '2026-11');
assert.equal(hasMonthlyBudgetChanges(state.ui.monthlyBudgetDraft), false);
assert.deepEqual(state.budgets, originalBudgets);

// A punctual edit uses its own draft, then commits only the chosen financial row.
state.ui.monthlyBudgetQuickDraft = createMonthlyBudgetDraft(state, '2026-10');
state.ui.monthlyBudgetQuickEdit = true;
state.ui.monthlyBudgetEditRow = { ...state.ui.monthlyBudgetQuickDraft.rows.find(row => row.id === 'b1') };
state.ui.activeSheet = 'monthly-budget-row';
const rowAmount = element();
api.bindPlanningWorkspace(root({ '[data-monthly-budget-row-amount-open]': [rowAmount] }));
await rowAmount.click();
assert.equal(state.ui.activeSheet, 'monthly-budget-amount');
const quickBack = element({ key: 'back' });
const quick7 = element({ key: '7' });
const quick0 = element({ key: '0' });
const quickAmountApply = element();
api.bindPlanningWorkspace(root({
  '[data-key]': [quickBack, quick7, quick0],
  '[data-monthly-budget-amount-apply]': [quickAmountApply]
}));
await quickBack.click();
await quickBack.click();
await quick7.click();
await quick0.click();
await quickAmountApply.click();
assert.equal(state.ui.activeSheet, 'monthly-budget-row');
assert.equal(state.ui.monthlyBudgetEditRow.amount, 70);
assert.equal(state.ui.monthlyBudgetQuickDraft.rows.find(row => row.id === 'b1').amount, 50);
const rowApply = element();
api.bindPlanningWorkspace(root({ '[data-monthly-budget-row-apply]': [rowApply] }));
saveAllowed = false;
await rowApply.click();
assert.equal(state.ui.activeSheet, 'monthly-budget-row', 'failed punctual save must retain its editor');
assert.equal(state.ui.monthlyBudgetEditRow.amount, 70);
assert.deepEqual(state.budgets, originalBudgets);
saveAllowed = true;
await rowApply.click();
assert.equal(savedChanges.ok, true);
assert.equal(savedChanges.budgets.find(row => row.id === 'b1').amount, 70);
assert.deepEqual(savedChanges.budgets.filter(row => row.id !== 'b1'), originalBudgets.filter(row => row.id !== 'b1'));
assert.deepEqual(state.budgets, originalBudgets);

// Escape/backdrop dismissal of child surfaces preserves parent drafts.
const existingRow = state.ui.monthlyBudgetEditRow;
state.ui.activeSheet = 'monthly-budget-amount';
state.ui.monthlyBudgetAmountReturnRow = true;
api.dismissActiveSheet();
assert.equal(state.ui.activeSheet, 'monthly-budget-row');
assert.equal(state.ui.monthlyBudgetEditRow, existingRow);
for (const [target, parent] of [['planning.releaseDate', 'planning-provision']]) {
  state.ui.activeSheet = 'calendar';
  state.ui.calendarTarget = target;
  const dates = structuredClone(state.ui.planningDraft);
  api.dismissActiveSheet();
  assert.equal(state.ui.activeSheet, parent);
  assert.equal(state.ui.calendarTarget, null);
  assert.deepEqual(state.ui.planningDraft, dates, 'cancelling calendar must not apply its selected date');
}
state.ui.monthlyBudgetDraft = updateMonthlyBudgetRow(createMonthlyBudgetDraft(state, '2026-10'), 'b1', { amount: 80 });
const retained = state.ui.monthlyBudgetDraft;
api.openMonthlyBudget('', '2026-11');
assert.equal(state.ui.activeSheet, 'monthly-budget-leave');
api.dismissActiveSheet();
assert.equal(state.ui.activeSheet, '');
assert.equal(state.ui.monthlyBudgetDraft, retained);
assert.equal(state.ui.monthlyBudgetDraft.month, '2026-10');

// New categories stay in the draft and saving returns to the actual originating screen.
state.ui.monthlyBudgetDraft = null;
state.ui.activeSheet = '';
state.activeView = 'categories';
state.settingsPage = '';
api.openMonthlyBudget('', '2026-10');
state.ui.monthlyBudgetCategoryName = 'Viajes';
const addCategoryButton = element();
const savePlan = element();
api.bindPlanningWorkspace(root({ '[data-monthly-budget-category-add]': [addCategoryButton], '[data-monthly-budget-save]': [savePlan] }));
await addCategoryButton.click();
assert.equal(state.categories.some(category => category.name === 'Viajes'), false);
assert.equal(state.ui.monthlyBudgetDraft.newCategories[0].name, 'Viajes');
saveAllowed = false;
await savePlan.click();
assert.equal(state.settingsPage, 'monthly-budget');
assert.ok(state.ui.monthlyBudgetDraft);
saveAllowed = true;
await savePlan.click();
assert.equal(savedChanges.categories.some(category => category.name === 'Viajes'), true);
assert.equal(state.activeView, 'categories');
assert.equal(state.ui.monthlyBudgetDraft, null);
const baseButton = element();
api.bindPlanningWorkspace(root({ '[data-open-base-budget]': [baseButton] }));
await baseButton.click();
assert.equal(state.ui.monthlyBudgetDraft.mode, 'base');
assert.deepEqual(state.budgets, originalBudgets);
api.bindPlanningWorkspace(root({ '[data-monthly-budget-save]': [savePlan] }));
await savePlan.click();
assert.equal(state.activeView, 'categories');
assert.equal(state.ui.monthlyBudgetDraft, null);

// Tab wraps within the monthly modal and full-screen editor; hidden/disabled nodes are excluded.
const trapStart = main.indexOf("document.addEventListener('keydown', event => {", main.indexOf('let pendingPlanningNavigation'));
const trapEnd = main.indexOf("\nwindow.addEventListener('beforeunload'", trapStart);
assert.ok(trapStart > 0 && trapEnd > trapStart);
let keyboardHandler;
let useModal = true;
const fakeDocument = {
  activeElement: null,
  addEventListener(type, listener) { assert.equal(type, 'keydown'); keyboardHandler = listener; },
  querySelector(selector) {
    if (selector.includes('.monthly-budget-modal')) return useModal ? trapContainer : null;
    if (selector === '[data-monthly-budget-screen]') return trapContainer;
    return null;
  }
};
const first = { getClientRects: () => [1], focus: () => { fakeDocument.activeElement = first; } };
const last = { getClientRects: () => [1], focus: () => { fakeDocument.activeElement = last; } };
const hidden = { getClientRects: () => [], focus: () => assert.fail('hidden node must never receive wrapped focus') };
const trapContainer = {
  querySelectorAll: () => [first, last, hidden],
  contains: target => [first, last, hidden].includes(target)
};
runInNewContext(main.slice(trapStart, trapEnd), { document: fakeDocument, state });
for (const modal of [true, false]) {
  useModal = modal;
  state.ui.activeSheet = modal ? 'monthly-budget-row' : '';
  state.settingsPage = 'monthly-budget';
  let prevented = false;
  fakeDocument.activeElement = last;
  keyboardHandler({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(fakeDocument.activeElement, first);
  fakeDocument.activeElement = first;
  keyboardHandler({ key: 'Tab', shiftKey: true, preventDefault: () => {} });
  assert.equal(fakeDocument.activeElement, last);
  fakeDocument.activeElement = {};
  keyboardHandler({ key: 'Tab', shiftKey: false, preventDefault: () => {} });
  assert.equal(fakeDocument.activeElement, first);
}
assert.ok(renders > 0);
console.log('planning-workspace-interaction.test.mjs passed');

function element(dataset = {}) {
  const listeners = new Map();
  return {
    dataset, disabled: false, textContent: '', hidden: false,
    hasAttribute(name) { return name === 'data-audit-close-date' && Object.hasOwn(dataset, 'auditCloseDate'); },
    addEventListener(type, callback) { listeners.set(type, callback); },
    click() { return listeners.get('click')?.({ target: this, currentTarget: this }); }
  };
}
function root(map) {
  return {
    querySelectorAll(selector) { return map[selector] || []; },
    querySelector(selector) { return (map[selector] || [])[0] || null; }
  };
}
function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, signature + ' must exist');
  const body = source.indexOf('{', source.indexOf(') {', start));
  let depth = 0;
  for (let index = body; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}') depth--;
    if (depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(signature + ' must have a complete body');
}
