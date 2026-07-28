import assert from 'node:assert/strict';
import {
  CLASSIC_KEYPAD_ROWS,
  createKeypadController,
  evaluateExpression,
  formatKeypadDisplay,
  renderKeypad
} from '../src/components/keypad.js';

assert.deepEqual(CLASSIC_KEYPAD_ROWS, [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'minus'],
  ['group', '0', 'decimal', 'plus']
]);
assert.equal(evaluateExpression('1,200.50+4.50').value, 1205);
assert.equal(formatKeypadDisplay('1200.5'), '1,200.5');
assert.match(renderKeypad(), /data-key="back"/);
assert.doesNotMatch(renderKeypad(), /data-key="confirm"/);

const changes = [];
const keypad = createKeypadController({ onChange: change => changes.push(change) });
['1', '2', '0', '0', '.', '5', '+', '4', '.', '5'].forEach(key => keypad.press(key));
assert.equal(changes.at(-1).value, 1205);
assert.equal(evaluateExpression('1,').error, 'Cálculo incompleto');

console.log('keypad.test.mjs passed');
