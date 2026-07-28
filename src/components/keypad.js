import { icon } from '../icons.js';

export const CLASSIC_KEYPAD_ROWS = [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'minus'],
  ['group', '0', 'decimal', 'plus']
];

const keySymbols = {
  divide: '÷',
  multiply: '×',
  minus: '−',
  group: ',',
  decimal: '.',
  plus: '+'
};

export function renderKeypad({ variant = 'expense' } = {}) {
  const cls = variant === 'income' ? 'income' : '';
  return `
    <div class="keypad-control ${cls}">
      <button type="button" class="keypad-back" data-key="back" aria-label="Borrar último dígito">${icon('backspace')}</button>
      <div class="keypad" data-keypad>
        ${CLASSIC_KEYPAD_ROWS.flat().map(keyName => {
          const value = keySymbols[keyName] || keyName;
          return key(value, keySymbols[keyName] ? 'op' : '');
        }).join('')}
      </div>
    </div>
  `;
}

function key(value, cls = '', label = value) {
  return `<button type="button" class="${cls}" data-key="${value}">${label}</button>`;
}

export function createKeypadController({ initial = '', onChange, allowOperations = true, preventNegative = true } = {}) {
  let expression = String(initial || '');

  const emit = () => {
    const result = evaluateExpression(expression);
    const error = result.error || (preventNegative && result.value < 0 ? 'El monto no puede ser negativo' : '');
    onChange?.({
      expression,
      display: formatKeypadDisplay(expression),
      value: error ? null : result.value,
      error
    });
  };

  return {
    value: () => expression,
    set: value => {
      expression = String(value || '');
      emit();
    },
    press: keyName => {
      const value = keySymbols[keyName] || keyName;
      if (/^\d$/.test(value)) expression = appendDigit(expression, value);
      else if (value === '.') expression = appendDecimal(expression);
      else if (value === ',') expression = appendGroup(expression);
      else if (value === 'back') expression = expression.slice(0, -1);
      else if (allowOperations && ['+', '−', '×', '÷'].includes(value)) {
        if (expression && !/[+\-−×÷]$/.test(expression)) expression += value;
        else if (expression) expression = expression.slice(0, -1) + value;
      }
      emit();
    }
  };
}

function appendDigit(expression, digit) {
  const current = currentOperand(expression);
  if (current === '0') return expression.slice(0, -1) + digit;
  return expression + digit;
}

function appendDecimal(expression) {
  const current = currentOperand(expression);
  if (current.includes('.')) return expression;
  return expression + (current ? '.' : '0.');
}

function appendGroup(expression) {
  const current = currentOperand(expression);
  if (!current || current.includes('.') || current.endsWith(',')) return expression;
  return expression + ',';
}

function currentOperand(expression) {
  return expression.split(/[+\-−×÷]/).at(-1) || '';
}

export function evaluateExpression(expression) {
  const raw = String(expression || '');
  if (!raw || /[+\-−×÷,.]$/.test(raw)) return { error: 'Cálculo incompleto' };
  const text = raw
    .replaceAll(',', '')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-');
  if (/[^0-9+\-*/.() ]/.test(text)) return { error: 'Cálculo incompleto' };
  try {
    const tokens = tokenize(text);
    const rpn = toRPN(tokens);
    const value = evalRPN(rpn);
    if (!Number.isFinite(value)) return { error: 'Cálculo inválido' };
    return { value: Math.round(value * 100) / 100 };
  } catch {
    return { error: 'Cálculo inválido' };
  }
}

export function formatKeypadDisplay(expression) {
  return String(expression || '0').replace(/\d[\d,]*(?:\.\d*)?/g, formatOperand);
}

function formatOperand(operand) {
  const [integer, decimal] = operand.split('.');
  const trailingGroup = integer.endsWith(',');
  const digits = integer.replaceAll(',', '');
  const grouped = Number(digits || '0').toLocaleString('en-US');
  return `${grouped}${trailingGroup ? ',' : ''}${decimal === undefined ? '' : `.${decimal}`}`;
}

function tokenize(text) {
  const tokens = [];
  let number = '';
  for (const char of text.replace(/\s+/g, '')) {
    if (/[0-9.]/.test(char)) number += char;
    else if ('+-*/()'.includes(char)) {
      if (number) tokens.push(Number(number));
      number = '';
      tokens.push(char);
    } else throw new Error('bad token');
  }
  if (number) tokens.push(Number(number));
  if (tokens.some(token => typeof token === 'number' && Number.isNaN(token))) throw new Error('bad number');
  return tokens;
}

function toRPN(tokens) {
  const output = [];
  const ops = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
  tokens.forEach(token => {
    if (typeof token === 'number') output.push(token);
    else if (token in precedence) {
      while (ops.length && precedence[ops[ops.length - 1]] >= precedence[token]) output.push(ops.pop());
      ops.push(token);
    } else if (token === '(') ops.push(token);
    else if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
      ops.pop();
    }
  });
  while (ops.length) output.push(ops.pop());
  return output;
}

function evalRPN(tokens) {
  const stack = [];
  tokens.forEach(token => {
    if (typeof token === 'number') stack.push(token);
    else {
      const b = stack.pop();
      const a = stack.pop();
      if (token === '+') stack.push(a + b);
      if (token === '-') stack.push(a - b);
      if (token === '*') stack.push(a * b);
      if (token === '/') stack.push(a / b);
    }
  });
  return stack[0];
}
