import assert from 'node:assert/strict';
import { bindRecordKeypad } from '../src/components/recordKeypad.js';

const screenRoot = fakeRoot();
const record = recordFixture();
const sheetRoot = fakeRoot();
const flow = {
  amount: 0,
  amountExpression: '',
  displayAmount: '0',
  keypadError: '',
  keypadState: null
};
const cleared = [];
const clearValidation = (currentFlow, field) => cleared.push([currentFlow, field]);

assert.equal(bindRecordKeypad(screenRoot, flow, { clearValidation }), null);
const controller = bindRecordKeypad(record.root, flow, { clearValidation });
assert.ok(controller);
assert.equal(bindRecordKeypad(sheetRoot, flow, { clearValidation }), null);

record.keys.get('1').click();
assert.equal(flow.amountExpression, '1');
assert.equal(record.amount.textContent, 'USD 1');
assert.equal(record.backspace.disabled, false);
assert.equal(cleared.length, 1);
assert.deepEqual(cleared[0], [flow, 'amount']);

record.keys.get('back').click();
assert.equal(flow.amountExpression, '');
assert.equal(record.amount.textContent, 'USD 0');
assert.equal(record.backspace.disabled, true);

console.log('record-keypad-integration.test.mjs passed');

function recordFixture() {
  const amount = fakeElement({ attributes: { 'data-record-amount': '' }, textContent: 'USD 0' });
  const backspace = fakeButton('back', { 'data-record-backspace': '' });
  const one = fakeButton('1');
  const elements = [amount, backspace, one];
  return {
    amount,
    backspace,
    keys: new Map([['1', one], ['back', backspace]]),
    root: fakeRoot(elements)
  };
}

function fakeRoot(elements = []) {
  return {
    querySelector: selector => elements.find(element => matchesSelector(element, selector)) || null,
    querySelectorAll: selector => elements.filter(element => matchesSelector(element, selector))
  };
}

function fakeButton(key, attributes = {}) {
  return fakeElement({ attributes: { ...attributes, 'data-key': key } });
}

function fakeElement({ attributes = {}, textContent = '' } = {}) {
  const listeners = new Map();
  return {
    dataset: Object.fromEntries(Object.entries(attributes)
      .filter(([name]) => name.startsWith('data-'))
      .map(([name, value]) => [name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value])),
    disabled: false,
    textContent,
    addEventListener: (type, listener) => listeners.set(type, listener),
    click: () => listeners.get('click')?.()
  };
}

function matchesSelector(element, selector) {
  if (selector === '[data-key]') return Object.hasOwn(element.dataset, 'key');
  const match = selector.match(/^\[data-([a-z-]+)\]$/);
  if (!match) return false;
  const key = match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return Object.hasOwn(element.dataset, key);
}
