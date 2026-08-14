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

const leadingZero = createKeypadController();
['0', '5'].forEach(key => leadingZero.press(key));
assert.equal(leadingZero.value(), '5', 'a digit replaces an initial zero');

const oneDecimal = createKeypadController();
['1', '.', '2', '.'].forEach(key => oneDecimal.press(key));
assert.equal(oneDecimal.value(), '1.2', 'an operand keeps only one decimal separator');

const replacedOperator = createKeypadController();
['1', '+', 'multiply'].forEach(key => replacedOperator.press(key));
assert.equal(replacedOperator.value(), '1×', 'a second operator replaces the pending operator');

assert.equal(evaluateExpression('2+3').value, 5, 'addition uses the plus key');
assert.equal(evaluateExpression('9−4').value, 5, 'subtraction uses the minus key');
assert.equal(evaluateExpression('2×3').value, 6, 'multiplication uses the multiply key');
assert.equal(evaluateExpression('8÷2').value, 4, 'division uses the divide key');
assert.equal(evaluateExpression('2+3×4').value, 14, 'multiplication precedes addition');
assert.equal(evaluateExpression('4÷0').error, 'Cálculo inválido', 'division by zero is invalid');

const negativeChanges = [];
const negative = createKeypadController({ onChange: change => negativeChanges.push(change) });
['1', 'minus', '2'].forEach(key => negative.press(key));
assert.equal(negativeChanges.at(-1).error, 'El monto no puede ser negativo', 'negative results are rejected');

const deletion = createKeypadController();
['5', 'back'].forEach(key => deletion.press(key));
assert.equal(deletion.value(), '', 'backspace clears the final digit');

console.log('keypad.test.mjs passed');
