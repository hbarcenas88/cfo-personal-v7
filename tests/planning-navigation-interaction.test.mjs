import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const bindDynamicEventsSource = extractFunction(mainSource, 'function bindDynamicEvents');

const typeButton = fakeButton({ planningType: 'provisions' });
const managerButton = fakeButton({ planningManager: 'provisions' });
const backButton = fakeButton({ planningBack: 'manager' });
const provisionFilter = fakeButton({ planningProvisionFilter: 'released' });
const recurringFilter = fakeButton({ planningRecurringFilter: 'completed' });
const balanceShortcut = fakeButton({ planningFocus: 'provisions' });
const state = {
  activeView: 'settings',
  settingsPage: 'planning',
  ui: {
    planningView: 'hub',
    planningType: '',
    planningProvisionFilter: 'active',
    planningRecurringFilter: 'current'
  }
};
let renderCalls = 0;
let settingsCalls = 0;
const focusRequests = [];

const root = {
  querySelectorAll: selector => ({
    '[data-planning-type]': [typeButton],
    '[data-planning-manager]': [managerButton],
    '[data-planning-back]': [backButton],
    '[data-planning-provision-filter]': [provisionFilter],
    '[data-planning-recurring-filter]': [recurringFilter],
    '[data-planning-focus]': [balanceShortcut]
  })[selector] || []
};

const bindDynamicEvents = runInNewContext(`${bindDynamicEventsSource}\nbindDynamicEvents;`, {
  state,
  render: () => { renderCalls++; },
  setSettingsPage: page => {
    settingsCalls++;
    state.activeView = 'settings';
    state.settingsPage = page;
  },
  renderAndFocus: selector => {
    renderCalls++;
    focusRequests.push(selector);
  },
  focusAfterNextRender: selector => focusRequests.push(selector),
  bindSheetDragClose: () => {},
  bindRecordEvents: () => {},
  bindPeriodEvents: () => {},
  bindCalendarEvents: () => {},
  bindFilters: () => {},
  bindTools: () => {},
  bindSheetActions: () => {}
});

bindDynamicEvents(root);
typeButton.click();
assert.deepEqual(
  { view: state.ui.planningView, type: state.ui.planningType },
  { view: 'provisions', type: 'provisions' },
  'choosing a hub type must open only its decision view'
);

managerButton.click();
assert.deepEqual(
  { view: state.ui.planningView, type: state.ui.planningType },
  { view: 'manager', type: 'provisions' },
  'Ver lo planeado must open the manager for the selected type'
);

backButton.click();
assert.equal(state.ui.planningView, 'provisions', 'back from a manager must return exactly one level');
backButton.click();
assert.equal(state.ui.planningView, 'hub', 'back from a type view must return exactly one level');
assert.equal(state.ui.planningType, 'provisions', 'returning to the hub must preserve the session selection');

provisionFilter.click();
recurringFilter.click();
assert.equal(state.ui.planningProvisionFilter, 'released');
assert.equal(state.ui.planningRecurringFilter, 'completed');
assert.equal(renderCalls, 6, 'each in-screen Planning decision must request one render');

state.ui.planningView = 'hub';
state.ui.planningType = '';
balanceShortcut.click();
assert.deepEqual(
  {
    page: state.settingsPage,
    view: state.ui.planningView,
    type: state.ui.planningType,
    legacyFocus: state.ui.planningFocus
  },
  { page: 'planning', view: 'manager', type: 'provisions', legacyFocus: undefined },
  'Balances must enter the Provisions manager directly without a scroll target'
);
assert.equal(settingsCalls, 1);
assert.deepEqual(focusRequests, [
  '[data-planning-manager="provisions"]',
  '[data-planning-back="manager"]',
  '[data-planning-manager="provisions"]',
  '[data-planning-type="provisions"]',
  '[data-planning-back="manager"]'
], 'Planning transitions must focus the intended destination or exact opener after each render');

console.log('planning-navigation-interaction.test.mjs passed');

function fakeButton(dataset) {
  let clickHandler = null;
  return {
    dataset,
    addEventListener: (type, handler) => {
      if (type === 'click') clickHandler = handler;
    },
    click: () => clickHandler?.({ preventDefault: () => {} })
  };
}

function extractFunction(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${marker}`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = braceStart; index < source.length; index++) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed ${marker}`);
}
