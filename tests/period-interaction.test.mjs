import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import * as periodService from '../src/services/periodService.js';
import { applyDraftPreset, createPeriodDraft, isComparisonAvailable, shiftPeriod, validatePeriodDraft } from '../src/services/periodService.js';

const { hasVisibleDraftSelection } = periodService;
assert.equal(typeof hasVisibleDraftSelection, 'function', 'periodService must export hasVisibleDraftSelection');

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const openPeriodSheetSource = extractFunction(main, 'function openPeriodSheet(scope)');
const cancelPeriodDraftSource = extractFunction(main, 'function cancelPeriodDraft()');
const applyPeriodDraftSource = extractFunction(main, 'async function applyPeriodDraft()');
const shiftConfirmedPeriodSource = extractFunction(main, 'async function shiftConfirmedPeriod(scope, delta)');
const bindPeriodEventsSource = extractFunction(main, 'function bindPeriodEvents(root)');
const handleGlobalEscapeSource = extractFunction(main, 'function handleGlobalEscape(event)');

const state = {
  activeView: 'audit',
  period: { mode: 'month', month: '2026-07' },
  auditPeriod: { mode: 'all', compare: false },
  filters: { categories: { compare: false } },
  transactions: [{ id: 'transaction-1', amount: 42 }],
  budgets: [{ id: 'budget-1', amount: 100 }],
  provisions: [{ id: 'provision-1', amount: 25 }],
  ui: { periodDraft: null, periodDraftApplyEnabled: false }
};
const financialSnapshot = structuredClone({
  transactions: state.transactions,
  budgets: state.budgets,
  provisions: state.provisions
});
let openCalls = 0;
let closeCalls = 0;
let persistCalls = 0;
let renderCalls = 0;
const context = {
  state,
  createPeriodDraft,
  hasVisibleDraftSelection,
  isComparisonAvailable,
  shiftPeriod,
  validatePeriodDraft,
  openSheet: sheet => {
    assert.equal(sheet, 'period');
    state.ui.activeSheet = sheet;
    openCalls++;
  },
  closeSheet: () => {
    state.ui.activeSheet = '';
    closeCalls++;
  },
  persist: async () => { persistCalls++; },
  render: () => { renderCalls++; }
};
const openPeriodSheet = runInNewContext(`${openPeriodSheetSource}\nopenPeriodSheet;`, context);
const cancelPeriodDraft = runInNewContext(`${cancelPeriodDraftSource}\ncancelPeriodDraft;`, context);
const applyPeriodDraft = runInNewContext(`${applyPeriodDraftSource}\napplyPeriodDraft;`, context);
const shiftConfirmedPeriod = runInNewContext(`${shiftConfirmedPeriodSource}\nshiftConfirmedPeriod;`, context);
const handleGlobalEscape = runInNewContext(`${handleGlobalEscapeSource}\nhandleGlobalEscape;`, {
  ...context,
  cancelPeriodDraft
});

openPeriodSheet('audit');
assert.equal(openCalls, 1);
assert.equal(state.ui.periodDraft.scope, 'audit');
assert.equal(state.ui.periodDraftApplyEnabled, true, 'a visible all-history choice must enable Apply on open');
state.ui.periodDraft = applyDraftPreset(state.ui.periodDraft, 'dashboard', state.period);
assert.deepEqual(state.period, { mode: 'month', month: '2026-07' });
assert.deepEqual(state.auditPeriod, { mode: 'all', compare: false });

cancelPeriodDraft();
assert.equal(closeCalls, 1);
assert.equal(state.ui.periodDraft, null);
assert.equal(state.ui.periodDraftApplyEnabled, false);
assert.deepEqual(state.period, { mode: 'month', month: '2026-07' });
assert.deepEqual(state.auditPeriod, { mode: 'all', compare: false });

openPeriodSheet('audit');
state.ui.periodDraft = applyDraftPreset(state.ui.periodDraft, 'dashboard', state.period);
handleGlobalEscape({ key: 'Escape' });
assert.equal(closeCalls, 2);
assert.equal(state.ui.periodDraft, null, 'Escape must discard the period draft');
assert.equal(state.ui.periodDraftApplyEnabled, false);
assert.deepEqual(state.period, { mode: 'month', month: '2026-07' });
assert.deepEqual(state.auditPeriod, { mode: 'all', compare: false });

openPeriodSheet('audit');
state.ui.periodDraft = applyDraftPreset(state.ui.periodDraft, 'dashboard', state.period);
await applyPeriodDraft();
assert.equal(state.ui.periodDraftApplyEnabled, false);
assert.deepEqual(plain(state.auditPeriod), {
  mode: 'month', month: '2026-07', year: 2026, from: '', to: '', compare: false
});

await shiftConfirmedPeriod('global', 1);
assert.deepEqual(plain(state.period), { mode: 'month', month: '2026-08' });
assert.deepEqual(plain(state.auditPeriod), {
  mode: 'month', month: '2026-07', year: 2026, from: '', to: '', compare: false
}, 'a later dashboard shift must not update the Audit copy');

await shiftConfirmedPeriod('audit', -1);
assert.equal(state.auditPeriod.month, '2026-06');
assert.equal(state.period.month, '2026-08', 'Audit arrows must not change the global period');
assert.deepEqual(
  { transactions: state.transactions, budgets: state.budgets, provisions: state.provisions },
  financialSnapshot,
  'period interactions must not mutate financial data'
);
assert.equal(persistCalls, 3, 'apply and each confirmed arrow shift must persist');
assert.equal(renderCalls, 3, 'apply and each confirmed arrow shift must render');

const blockedDraft = createPeriodDraft({ mode: 'month', month: '2024-03' }, { scope: 'global' });
state.ui.periodDraft = { ...blockedDraft, tab: 'year' };
state.ui.periodDraftApplyEnabled = false;
const blockedSnapshot = structuredClone({
  period: state.period,
  auditPeriod: state.auditPeriod,
  periodDraft: state.ui.periodDraft
});
await applyPeriodDraft();
assert.deepEqual(plain({
  period: state.period,
  auditPeriod: state.auditPeriod,
  periodDraft: state.ui.periodDraft
}), blockedSnapshot, 'a blocked Apply must not mutate confirmed periods or the draft');
assert.equal(persistCalls, 3);
assert.equal(renderCalls, 3);

const tabButton = fakeButton({ periodTab: 'year' });
const presetButton = fakeButton({ periodPreset: 'thisMonth' });
const copyButton = fakeButton();
const yearButton = fakeButton({ periodYear: '2028' });
const eventRoot = {
  querySelectorAll(selector) {
    return {
      '[data-period-close]': [],
      '[data-period-tab]': [tabButton],
      '[data-period-preset]': [presetButton],
      '[data-period-copy-dashboard]': [copyButton],
      '[data-period-year]': [yearButton],
      '[data-period-date]': []
    }[selector] || [];
  },
  querySelector: () => null
};
const bindPeriodEvents = runInNewContext(`${bindPeriodEventsSource}\nbindPeriodEvents;`, {
  state,
  bindingContext: root => root,
  applyDraftPreset,
  hasVisibleDraftSelection,
  render: () => {},
  applyPeriodDraft: async () => {}
});

state.period = { mode: 'month', month: '2024-03' };
state.ui.periodDraft = createPeriodDraft({ mode: 'all' }, { scope: 'audit' });
state.ui.periodDraftApplyEnabled = false;
bindPeriodEvents(eventRoot);
copyButton.click();
assert.equal(state.ui.periodDraft.month, '2024-03');
assert.equal(state.ui.periodDraftApplyEnabled, true, 'copying an arbitrary dashboard month must enable Apply');
tabButton.click();
assert.equal(state.ui.periodDraftApplyEnabled, false, 'changing tabs after a copy must re-evaluate visibility');
presetButton.click();
assert.equal(state.ui.periodDraftApplyEnabled, true, 'choosing a preset must enable Apply');
yearButton.click();
assert.equal(state.ui.periodDraftApplyEnabled, true, 'choosing a year must enable Apply');

console.log('period-interaction.test.mjs passed');

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function fakeButton(dataset = {}) {
  const listeners = new Map();
  return {
    dataset,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get('click')?.({ currentTarget: this, target: this });
    }
  };
}

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must remain available`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}') depth--;
    if (depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${signature} must have a complete body`);
}
