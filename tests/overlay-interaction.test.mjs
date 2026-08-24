import assert from 'node:assert/strict';
import * as coordinator from '../src/utils/renderCoordinator.js';

const {
  bindOverlayDismissal,
  captureFocusReference,
  focusInitialOverlay,
  restoreFocus,
  restoreFocusReference
} = coordinator;

assert.equal(typeof bindOverlayDismissal, 'function',
  'overlays need one shared Escape, outside-click, and visible-control lifecycle');
assert.equal(typeof focusInitialOverlay, 'function',
  'opening an overlay needs a shared initial-focus behavior');
assert.equal(typeof restoreFocus, 'function',
  'closing an overlay needs a shared trigger-return behavior');
assert.equal(typeof captureFocusReference, 'function',
  'overlay transitions need a semantic trigger descriptor before DOM replacement');
assert.equal(typeof restoreFocusReference, 'function',
  'overlay transitions need to resolve the connected replacement of a semantic trigger');

{
  const original = fakeFocusableElement({
    attributes: { 'data-tool': 'new-account' },
    localName: 'button'
  });
  const oldRoot = fakeSemanticRoot('screen-settings', [original]);
  const reference = captureFocusReference(original, [oldRoot]);

  assert.deepEqual(reference, {
    rootId: 'screen-settings',
    focus: { selector: '[data-tool="new-account"]', selection: null }
  }, 'the trigger descriptor must use a unique semantic attribute, not a structural position');

  const replacement = fakeFocusableElement({
    attributes: { 'data-tool': 'new-account' },
    localName: 'button'
  });
  const replacementRoot = fakeSemanticRoot('screen-settings', [replacement]);
  assert.equal(restoreFocusReference(reference, {
    getElementById: id => id === 'screen-settings' ? replacementRoot : null
  }), true);
  assert.deepEqual(replacement.focusCalls, [{ preventScroll: true }]);

  const duplicateRoot = fakeSemanticRoot('screen-settings', [
    fakeFocusableElement({ attributes: { 'data-tool': 'new-account' }, localName: 'button' }),
    fakeFocusableElement({ attributes: { 'data-tool': 'new-account' }, localName: 'button' })
  ]);
  assert.equal(captureFocusReference(duplicateRoot.elements[0], [duplicateRoot]), null,
    'a non-unique semantic attribute must never become a focus-return descriptor');
}

{
  const genericTrigger = fakeFocusableElement({
    attributes: { 'data-tx-menu': 'tx-"42\\west' },
    localName: 'button'
  });
  const genericRoot = fakeSemanticRoot('screen-audit', [genericTrigger]);
  assert.deepEqual(captureFocusReference(genericTrigger, [genericRoot]), {
    rootId: 'screen-audit',
    focus: { selector: 'button[data-tx-menu="tx-\\"42\\\\west"]', selection: null }
  }, 'a non-empty unique data attribute on an interactive control must be escaped and usable');

  const summaryTrigger = fakeFocusableElement({
    attributes: { 'data-open-summary-analysis': '', 'aria-label': 'Ajustar análisis' },
    localName: 'button'
  });
  const summarySibling = fakeFocusableElement({
    attributes: { 'data-open-summary-analysis': '' },
    localName: 'button'
  });
  const summaryRoot = fakeSemanticRoot('screen-summary', [summaryTrigger, summarySibling]);
  assert.deepEqual(captureFocusReference(summaryTrigger, [summaryRoot]), {
    rootId: 'screen-summary',
    focus: { selector: 'button[aria-label="Ajustar análisis"]', selection: null }
  }, 'an empty marker must be ignored while a unique accessible control identity remains eligible');
  assert.equal(captureFocusReference(summarySibling, [summaryRoot]), null,
    'an interactive control with only an empty marker must fail closed');
}

{
  const ownerDocument = fakeEventTarget();
  const backdrop = fakeEventTarget({ tagName: 'DIV' });
  const closeButton = fakeEventTarget({ tagName: 'BUTTON' });
  const root = {
    ownerDocument,
    querySelectorAll: selector => selector === '[data-sheet-close]' ? [backdrop, closeButton] : []
  };
  const dismissals = [];
  const unbind = bindOverlayDismissal(root, {
    onDismiss: reason => dismissals.push(reason)
  });

  ownerDocument.dispatch('keydown', { key: 'Enter' });
  assert.deepEqual(dismissals, [], 'non-Escape keys must leave the overlay open');

  ownerDocument.dispatch('keydown', { key: 'Escape', defaultPrevented: true });
  assert.deepEqual(dismissals, [],
    'an Escape already consumed by a specialized overlay must not dismiss the sheet twice');

  let escapePrevented = false;
  ownerDocument.dispatch('keydown', {
    key: 'Escape',
    preventDefault: () => { escapePrevented = true; }
  });
  assert.deepEqual(dismissals, ['escape'],
    'removing Escape dismissal must break the shared overlay lifecycle');
  assert.equal(escapePrevented, true, 'handled Escape must prevent competing browser behavior');

  backdrop.dispatch('click', { target: { tagName: 'SECTION' } });
  assert.deepEqual(dismissals, ['escape'], 'a click bubbling from inside the sheet must not dismiss it');

  backdrop.dispatch('click', { target: backdrop });
  closeButton.dispatch('click', { target: { tagName: 'SPAN' } });
  assert.deepEqual(dismissals, ['escape', 'outside', 'control'],
    'outside click and the visible close control must share the dismissal lifecycle');

  unbind();
  ownerDocument.dispatch('keydown', { key: 'Escape' });
  assert.deepEqual(dismissals, ['escape', 'outside', 'control'],
    'rebinding a rerendered overlay must be able to remove the previous document listener');
}

{
  const title = fakeFocusableElement({ className: 'sheet-title' });
  const root = {
    querySelector: selector => selector.includes('.sheet-title') ? title : null
  };

  assert.strictEqual(focusInitialOverlay(root), title,
    'opening an overlay must choose its title or designated initial control');
  assert.equal(title.attributes.tabindex, '-1', 'a non-native title must become programmatically focusable');
  assert.deepEqual(title.focusCalls, [{ preventScroll: true }], 'initial focus must not move the overlay scroll');
}

{
  const title = fakeFocusableElement({ className: 'sheet-title' });
  const designatedControl = fakeFocusableElement();
  const root = {
    querySelector: selector => {
      if (selector === '[data-overlay-initial-focus]') return designatedControl;
      if (selector.includes('.sheet-title')) return title;
      return null;
    }
  };

  assert.strictEqual(focusInitialOverlay(root), designatedControl,
    'a designated initial control must take precedence over an earlier generic title');
  assert.deepEqual(designatedControl.focusCalls, [{ preventScroll: true }]);
  assert.deepEqual(title.focusCalls, []);
}

{
  const trigger = fakeFocusableElement();
  assert.equal(restoreFocus(trigger), true, 'closing an overlay must restore its exact connected trigger');
  assert.deepEqual(trigger.focusCalls, [{ preventScroll: true }]);

  const removedTrigger = fakeFocusableElement({ isConnected: false });
  assert.equal(restoreFocus(removedTrigger), false, 'a removed trigger must be ignored safely');
  assert.deepEqual(removedTrigger.focusCalls, []);
}

function fakeEventTarget(properties = {}) {
  const listeners = new Map();
  return {
    ...properties,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) || []) {
        listener({ currentTarget: this, ...event });
      }
    }
  };
}

function fakeFocusableElement({
  attributes = {},
  className = '',
  isConnected = true,
  localName = 'div'
} = {}) {
  const focusCalls = [];
  return {
    attributes,
    classList: { contains: value => value === className },
    focusCalls,
    isConnected,
    localName,
    getAttribute: name => attributes[name] ?? null,
    hasAttribute: name => Object.hasOwn(attributes, name),
    setAttribute: (name, value) => { attributes[name] = value; },
    focus: options => { focusCalls.push(options); }
  };
}

function fakeSemanticRoot(id, elements) {
  const root = {
    id,
    elements,
    contains: element => elements.includes(element),
    querySelector: selector => elements.find(element => matchesSemanticSelector(element, selector)) || null,
    querySelectorAll: selector => elements.filter(element => matchesSemanticSelector(element, selector))
  };
  return root;
}

function matchesSemanticSelector(element, selector) {
  const match = selector.match(/^(?:([a-z*]+))?\[([^=]+)="((?:\\.|[^"])*)"\]$/);
  if (!match) return false;
  const [, localName, attribute, escapedValue] = match;
  const value = escapedValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return (!localName || localName === '*' || element.localName === localName)
    && element.getAttribute(attribute) === value;
}

console.log('overlay-interaction.test.mjs passed');
