import { icon } from '../icons.js';

export function renderKeypad({ value = '', variant = 'expense', currency = 'USD' } = {}) {
  const cls = variant === 'income' ? 'income' : '';
  return `
    <div class="keypad ${cls}" data-keypad>
      ${key('÷', 'op')}
      ${key('7')}
      ${key('8')}
      ${key('9')}
      ${key('back', 'op', icon('chevronLeft'))}
      ${key('×', 'op')}
      ${key('4')}
      ${key('5')}
      ${key('6')}
      ${key('calendar', 'op', icon('calendar'))}
      ${key('−', 'op')}
      ${key('1')}
      ${key('2')}
      ${key('3')}
      ${key('confirm', 'confirm', icon('check'))}
      ${key('+', 'op')}
      ${key('currency', 'op', currency)}
      ${key('0')}
      ${key('.')}
    </div>
  `;
}

function key(value, cls = '', label = value) {
  return `<button type="button" class="${cls}" data-key="${value}">${label}</button>`;
}

export function createKeypadController({ initial = '', onChange, onConfirm, onCalendarOpen, allowOperations = true, preventNegative = true }) {
  let expression = String(initial || '');
  const operators = ['+', '−', '×', '÷'];
  const api = {
    value: () => expression,
    set: value => {
      expression = String(value || '');
      onChange?.(formatDisplay(expression), expression);
    },
    press: key => {
      if (/^\d$/.test(key)) expression = appendDigit(expression, key);
      else if (key === '.') expression = appendDecimal(expression);
      else if (key === 'back') expression = expression.slice(0, -1);
      else if (key === 'calendar') onCalendarOpen?.();
      else if (key === 'currency') return;
      else if (key === 'confirm') {
        const result = evaluateExpression(expression);
        if (result.error) {
          onChange?.(formatDisplay(expression), expression, result.error);
          return;
        }
        if (preventNegative && result.value < 0) {
          onChange?.(formatDisplay(expression), expression, 'El monto no puede ser negativo');
          return;
        }
        expression = trimNumber(result.value);
        onChange?.(formatDisplay(expression), expression);
        onConfirm?.(result.value);
        return;
      } else if (allowOperations && operators.includes(key)) {
        if (!expression) return;
        if (/[+\-−×÷]$/.test(expression)) expression = expression.slice(0, -1) + key;
        else expression += key;
      }
      onChange?.(formatDisplay(expression), expression);
    }
  };
  return api;
}

function appendDigit(expression, digit) {
  const parts = expression.split(/[+−×÷]/);
  const current = parts[parts.length - 1] || '';
  if (current === '0') return expression.slice(0, -1) + digit;
  return expression + digit;
}

function appendDecimal(expression) {
  const parts = expression.split(/[+−×÷]/);
  const current = parts[parts.length - 1] || '';
  if (current.includes('.')) return expression;
  return expression + (current ? '.' : '0.');
}

export function evaluateExpression(expression) {
  const text = String(expression || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!text || /[^0-9+\-*/.() ]/.test(text) || /[+\-*/.]$/.test(text)) return { error: 'Cálculo incompleto' };
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

function trimNumber(value) {
  return String(Math.round(Number(value) * 100) / 100);
}

function formatDisplay(expression) {
  return String(expression || '0');
}
