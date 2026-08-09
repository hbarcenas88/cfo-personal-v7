import assert from 'node:assert/strict';
import {
  captureInteractionState,
  createRenderCoordinator,
  restoreInteractionState
} from '../src/utils/renderCoordinator.js';

{
  const scheduled = [];
  const renders = [];
  const requestRender = createRenderCoordinator({
    schedule: callback => scheduled.push(callback),
    render: scopes => renders.push(scopes)
  });

  requestRender('screen');
  requestRender('screen');
  requestRender(['sheet', 'toast']);

  assert.equal(scheduled.length, 1, 'synchronous requests must share one scheduled update');
  assert.equal(renders.length, 0, 'render must wait for the scheduler');

  scheduled.shift()();

  assert.deepEqual(renders, [['screen', 'sheet', 'toast']], 'one update must receive every unique requested scope');
}

{
  const scheduled = [];
  const renders = [];
  const requestRender = createRenderCoordinator({
    schedule: callback => scheduled.push(callback),
    render: scopes => renders.push(scopes)
  });

  requestRender('screen');
  scheduled.shift()();
  requestRender('record');

  assert.equal(scheduled.length, 1, 'a request after a completed update must schedule the next update');
  scheduled.shift()();
  assert.deepEqual(renders, [['screen'], ['record']]);
}

{
  const scheduled = [];
  const renders = [];
  let requestRender;
  requestRender = createRenderCoordinator({
    schedule: callback => scheduled.push(callback),
    render: scopes => {
      renders.push(scopes);
      if (scopes.includes('screen')) requestRender('record');
    }
  });

  requestRender('screen');
  scheduled.shift()();

  assert.deepEqual(renders, [['screen']], 'a request born during render must not join the active cycle');
  assert.equal(scheduled.length, 1, 'a request born during render must schedule a second cycle');

  scheduled.shift()();
  assert.deepEqual(renders, [['screen'], ['record']], 'the second cycle must retain the scope requested during render');
}

{
  const oldInput = fakeElement({
    localName: 'input',
    attributes: { 'data-record-field': 'description' },
    selectionStart: 2,
    selectionEnd: 5,
    selectionDirection: 'backward',
    scrollTop: 0,
    scrollLeft: 0
  });
  const oldRoot = fakeRoot([oldInput], oldInput);

  const snapshot = captureInteractionState(oldRoot);

  let focused = false;
  let restoredSelection = null;
  const newInput = fakeElement({
    localName: 'input',
    attributes: { 'data-record-field': 'description' },
    selectionStart: 0,
    selectionEnd: 0,
    scrollTop: 0,
    scrollLeft: 0,
    focus: () => { focused = true; },
    setSelectionRange: (...selection) => { restoredSelection = selection; }
  });
  const newRoot = fakeRoot([newInput], null);

  restoreInteractionState(snapshot, newRoot);

  assert.equal(focused, true, 'a real record field without an id must regain focus');
  assert.deepEqual(restoredSelection, [2, 5, 'backward'], 'a real record field must retain its text selection');
}

for (const [attribute, value] of [
  ['data-audit-close-field', 'realBalance'],
  ['data-category-draft-field', 'name'],
  ['data-account-draft-field', 'customType']
]) {
  const oldInput = fakeElement({ localName: 'input', attributes: { [attribute]: value } });
  const snapshot = captureInteractionState(fakeRoot([oldInput], oldInput));
  let focused = false;
  const newInput = fakeElement({
    localName: 'input',
    attributes: { [attribute]: value },
    focus: () => { focused = true; }
  });

  restoreInteractionState(snapshot, fakeRoot([newInput], null));

  assert.equal(focused, true, `${attribute} must identify its replacement without an id`);
}

{
  const oldSheet = fakeElement({ classes: ['sheet'], scrollTop: 146, scrollLeft: 7 });
  const oldPeriodContent = fakeElement({ classes: ['period-sheet-content'], scrollTop: 82 });
  const snapshot = captureInteractionState(fakeRoot([oldSheet, oldPeriodContent], null));

  const newSheet = fakeElement({ classes: ['sheet'] });
  const newPeriodContent = fakeElement({ classes: ['period-sheet-content'] });
  const newRoot = fakeRoot([newSheet, newPeriodContent], null);

  restoreInteractionState(snapshot, newRoot);

  assert.equal(newSheet.scrollTop, 146, 'the active sheet must retain vertical scroll');
  assert.equal(newSheet.scrollLeft, 7, 'the active sheet must retain horizontal scroll');
  assert.equal(newPeriodContent.scrollTop, 82, 'period sheet content must retain its own scroll');

  assert.doesNotThrow(() => restoreInteractionState(snapshot, fakeRoot([], null)), 'removed elements must be ignored safely');
}

{
  const first = fakeElement({ localName: 'input', attributes: { 'data-record-field': 'description' } });
  const duplicate = fakeElement({ localName: 'input', attributes: { 'data-record-field': 'description' } });
  const snapshot = captureInteractionState(fakeRoot([first, duplicate], first));

  assert.equal(snapshot.focus, null, 'a duplicated semantic field identifier must not be captured');
}

{
  const anonymousInput = {
    id: '',
    localName: 'input',
    getAttribute: () => null,
    selectionStart: 1,
    selectionEnd: 3,
    selectionDirection: 'forward',
    scrollTop: 24,
    scrollLeft: 0
  };
  const root = fakeRoot([anonymousInput], anonymousInput);
  root.children = [anonymousInput];
  anonymousInput.parentElement = root;

  const snapshot = captureInteractionState(root);

  assert.equal(snapshot.focus, null, 'focus without a stable identifier must be omitted');
  assert.deepEqual(snapshot.scroll, [], 'scroll without a stable identifier must be omitted');
  assert.doesNotThrow(() => restoreInteractionState(snapshot, fakeRoot([], null)));
}

function fakeRoot(elements, activeElement) {
  return {
    ownerDocument: { activeElement },
    contains: element => elements.includes(element),
    querySelector: selector => elements.find(element => matchesSelector(element, selector)) || null,
    querySelectorAll: selector => selector === '*'
      ? elements
      : elements.filter(element => matchesSelector(element, selector))
  };
}

function fakeElement({
  id = '',
  localName = 'div',
  attributes = {},
  classes = [],
  selectionStart,
  selectionEnd,
  selectionDirection,
  scrollTop = 0,
  scrollLeft = 0,
  focus,
  setSelectionRange
} = {}) {
  return {
    id,
    localName,
    selectionStart,
    selectionEnd,
    selectionDirection,
    scrollTop,
    scrollLeft,
    focus,
    setSelectionRange,
    classList: { contains: className => classes.includes(className) },
    getAttribute: name => attributes[name] ?? null
  };
}

function matchesSelector(element, selector) {
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  if (selector.startsWith('.')) return element.classList?.contains(selector.slice(1));
  const attributeMatch = selector.match(/^(?:([a-z*]+))?\[([^=]+)="([^"]*)"\]$/);
  if (!attributeMatch) return false;
  const [, localName, attribute, value] = attributeMatch;
  return (!localName || localName === '*' || element.localName === localName)
    && element.getAttribute?.(attribute) === value;
}

console.log('render-coordinator.test.mjs passed');
