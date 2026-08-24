import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import {
  bindOverlayDismissal,
  captureFocusReference,
  captureInteractionState,
  focusInitialOverlay,
  restoreFocus,
  restoreFocusReference,
  restoreInteractionState
} from '../src/utils/renderCoordinator.js';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const renderScopesSource = extractFunction(main, 'function renderScopes(scopes)');
const focusResults = {};
const realTriggerResults = {};

for (const scenario of [
  {
    name: 'summary analysis',
    triggers: [{ 'data-open-summary-analysis': '', 'data-interaction-key': 'summary-analysis' }],
    sheet: 'summary-analysis'
  },
  {
    name: 'guided audit close',
    triggers: [{ 'data-open-audit-close': '', 'data-interaction-key': 'guided-audit-new-close' }],
    sheet: 'guided-audit-close'
  },
  {
    name: 'transaction menu',
    triggers: [{ 'data-tx-menu': 'tx-42', 'aria-label': 'Abrir acciones' }],
    sheet: 'transaction-menu'
  },
  {
    name: 'budget edit',
    triggers: [{ 'data-budget-edit': 'budget-food' }],
    sheet: 'planning-budget'
  }
]) {
  const harness = createRenderHarness();
  const [originalTrigger] = harness.mountScreenTriggers(scenario.triggers);
  originalTrigger.focus();

  harness.state.ui.activeSheet = scenario.sheet;
  harness.renderScopes(['all']);
  assert.equal(originalTrigger.isConnected, false,
    `${scenario.name} must reproduce replacement of its real screen trigger during render all`);

  harness.state.ui.activeSheet = '';
  harness.renderScopes(['all']);

  const replacement = harness.screenRoot.elements[0];
  realTriggerResults[scenario.name] = {
    replacementCalls: replacement.focusCalls.length,
    replacementActive: harness.document.activeElement === replacement
  };
}

assert.deepEqual(realTriggerResults, {
  'summary analysis': { replacementCalls: 1, replacementActive: true },
  'guided audit close': { replacementCalls: 1, replacementActive: true },
  'transaction menu': { replacementCalls: 1, replacementActive: true },
  'budget edit': { replacementCalls: 1, replacementActive: true }
}, 'each real screen trigger must restore its exact connected replacement after render all');

{
  const harness = createRenderHarness();
  const [originalTrigger] = harness.mountScreenTriggers([
    { 'data-tx-menu': 'tx-duplicate', 'aria-label': 'Abrir acciones' },
    { 'data-tx-menu': 'tx-duplicate', 'aria-label': 'Abrir acciones' }
  ]);
  originalTrigger.focus();

  harness.state.ui.activeSheet = 'transaction-menu';
  harness.renderScopes(['all']);
  harness.state.ui.activeSheet = '';
  harness.renderScopes(['all']);

  assert.equal(harness.screenRoot.elements.length, 2,
    'the integration setup must retain both ambiguous replacement controls');
  assert.equal(harness.screenRoot.elements.some(element => element.focusCalls.length), false,
    'an ambiguous data attribute and accessible name must fail closed instead of guessing a trigger');
}

{
  const harness = createRenderHarness();
  const originalTrigger = harness.mountScreenTrigger({ 'data-tool': 'new-account' });
  originalTrigger.focus();

  harness.state.ui.activeSheet = 'new-account';
  harness.renderScopes(['all']);
  assert.equal(originalTrigger.isConnected, false,
    'the integration setup must reproduce the active-screen replacement that happens during render all');

  harness.state.ui.activeSheet = '';
  harness.renderScopes(['all']);

  const replacement = harness.screenRoot.querySelector('[data-tool="new-account"]');
  assert.ok(replacement?.isConnected, 'the rerendered screen must contain the semantic replacement trigger');
  focusResults.screenReplacementCalls = replacement.focusCalls.length;
  focusResults.screenReplacementActive = harness.document.activeElement === replacement;
}

{
  const harness = createRenderHarness();
  harness.mountScreenTrigger({ 'data-action': 'period' }).focus();

  harness.state.ui.activeSheet = 'period';
  harness.renderScopes(['all']);

  const fromTrigger = harness.sheetRoot.querySelector('[data-period-date="from"]');
  assert.ok(fromTrigger?.isConnected, 'the period sheet must expose the real Desde trigger');
  fromTrigger.focus();

  harness.state.ui.activeSheet = 'calendar';
  harness.renderScopes(['all']);
  assert.equal(fromTrigger.isConnected, false, 'opening the calendar must replace the parent sheet DOM');

  harness.state.ui.activeSheet = 'period';
  harness.renderScopes(['all']);

  const replacementFrom = harness.sheetRoot.querySelector('[data-period-date="from"]');
  assert.ok(replacementFrom?.isConnected, 'returning must rerender the parent sheet trigger');
  focusResults.nestedReplacementCalls = replacementFrom.focusCalls.length;
  focusResults.nestedReplacementActive = harness.document.activeElement === replacementFrom;
}

assert.deepEqual(focusResults, {
  screenReplacementCalls: 1,
  screenReplacementActive: true,
  nestedReplacementCalls: 1,
  nestedReplacementActive: true
}, 'render all and nested overlays must restore the connected semantic replacement of each exact trigger');

function createRenderHarness() {
  const state = { activeView: 'settings', ui: { activeSheet: '' } };
  const body = fakeElement({ localName: 'body' });
  const document = {
    activeElement: body,
    getElementById: id => roots.get(id) || null
  };
  body.ownerDocument = document;
  const appRoot = fakeRoot('app', document);
  const screenRoot = fakeRoot('screen-settings', document);
  const recordRoot = fakeRoot('record-root', document);
  const sheetRoot = fakeRoot('sheet-root', document);
  sheetRoot.dataset = { overlayId: '' };
  const roots = new Map([
    ['app', appRoot],
    ['screen-settings', screenRoot],
    ['record-root', recordRoot],
    ['sheet-root', sheetRoot]
  ]);
  let screenTriggerAttributes = [];

  const mountScreenTrigger = attributes => {
    return mountScreenTriggers([attributes])[0];
  };

  const mountScreenTriggers = attributeSets => {
    screenTriggerAttributes = attributeSets.map(attributes => ({ ...attributes }));
    const triggers = screenTriggerAttributes.map(attributes => fakeElement({
      localName: 'button',
      attributes,
      ownerDocument: document
    }));
    screenRoot.replaceElements(triggers);
    return triggers;
  };

  const renderActiveScreen = () => {
    const replacements = screenTriggerAttributes.map(attributes => fakeElement({
      localName: 'button',
      attributes,
      ownerDocument: document
    }));
    screenRoot.replaceElements(replacements);
  };

  Object.defineProperty(recordRoot, 'innerHTML', {
    set() { recordRoot.replaceElements([]); }
  });
  Object.defineProperty(sheetRoot, 'innerHTML', {
    set() {
      const title = state.ui.activeSheet
        ? fakeElement({ localName: 'h2', classes: ['sheet-title'], ownerDocument: document })
        : null;
      const elements = title ? [title] : [];
      if (state.ui.activeSheet === 'period') {
        elements.push(fakeElement({
          localName: 'button',
          attributes: { 'data-period-date': 'from' },
          ownerDocument: document
        }));
      }
      sheetRoot.replaceElements(elements);
    }
  });

  const renderScopes = runInNewContext(`${renderScopesSource}\nrenderScopes;`, {
    Set,
    bindDynamicEvents: () => {},
    bindOverlayDismissal,
    captureFocusReference,
    captureInteractionState,
    dismissActiveSheet: () => {},
    document,
    ensureShell: () => {},
    focusInitialOverlay,
    focusPlanningSection: () => {},
    injectDebugTool: () => {},
    renderActiveScreen,
    renderActiveSheet: () => state.ui.activeSheet,
    renderIcons: () => {},
    renderRecordRoot: () => '',
    restoreFocus,
    restoreFocusReference,
    restoreInteractionState,
    setScreenActive: () => {},
    state,
    toastRoot: () => {},
    updateShellState: () => {}
  });

  return {
    body,
    document,
    mountScreenTrigger,
    mountScreenTriggers,
    renderScopes,
    screenRoot,
    sheetRoot,
    state
  };
}

function fakeRoot(id, ownerDocument) {
  let elements = [];
  return {
    id,
    ownerDocument,
    get elements() { return [...elements]; },
    contains: element => elements.includes(element),
    querySelector: selector => elements.find(element => matchesSelector(element, selector)) || null,
    querySelectorAll: selector => selector === '*'
      ? [...elements]
      : elements.filter(element => matchesSelector(element, selector)),
    replaceElements(nextElements) {
      for (const element of elements) {
        element.isConnected = false;
        if (ownerDocument.activeElement === element) ownerDocument.activeElement = ownerDocument.getElementById('app')?.ownerDocument?.body || null;
      }
      elements = nextElements;
      elements.forEach(element => { element.isConnected = true; });
      if (!ownerDocument.activeElement?.isConnected) ownerDocument.activeElement = null;
    }
  };
}

function fakeElement({
  localName = 'div',
  attributes = {},
  classes = [],
  ownerDocument = null
} = {}) {
  const focusCalls = [];
  return {
    id: attributes.id || '',
    localName,
    ownerDocument,
    attributes,
    classList: { contains: className => classes.includes(className) },
    focusCalls,
    isConnected: true,
    getAttribute: name => attributes[name] ?? null,
    hasAttribute: name => Object.hasOwn(attributes, name),
    setAttribute: (name, value) => { attributes[name] = value; },
    focus(options) {
      focusCalls.push(options);
      if (ownerDocument) ownerDocument.activeElement = this;
    }
  };
}

function matchesSelector(element, selector) {
  if (selector === '.sheet-title') return element.classList.contains('sheet-title');
  if (selector === 'button:not([disabled])') return element.localName === 'button';
  if (selector === 'input:not([type="hidden"]):not([disabled])') return element.localName === 'input';
  const match = selector.match(/^(?:([a-z]+))?\[([^=]+)="((?:\\.|[^"])*)"\]$/);
  if (!match || (match[1] && element.localName !== match[1])) return false;
  const expected = match[3].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return element.getAttribute(match[2]) === expected;
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

console.log('overlay-render-integration.test.mjs passed');
