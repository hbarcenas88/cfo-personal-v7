import { createKeypadController } from './keypad.js';

export function bindRecordKeypad(root, flow, { clearValidation = () => {} } = {}) {
  const buttons = [...(root?.querySelectorAll?.('[data-key]') || [])];
  const amount = root?.querySelector?.('[data-record-amount]');
  if (!flow || !amount || !buttons.length) return null;

  const error = root.querySelector('[data-record-amount-error]');
  const backspace = root.querySelector('[data-record-backspace]');
  const controller = createKeypadController({
    initial: flow.amountExpression || '',
    onChange: keypadState => {
      flow.amountExpression = keypadState.expression;
      flow.displayAmount = keypadState.display;
      flow.keypadError = keypadState.error || '';
      flow.keypadState = keypadState;
      clearValidation(flow, 'amount');
      if (Number.isFinite(keypadState.value)) flow.amount = keypadState.value;
      amount.textContent = `USD ${keypadState.display}`;
      if (error) {
        error.textContent = keypadState.error || '';
        error.hidden = !keypadState.error;
      }
      if (backspace) backspace.disabled = !keypadState.expression;
    }
  });
  buttons.forEach(button => button.addEventListener('click', () => controller.press(button.dataset.key)));
  return controller;
}
