import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const closeCategoryDropdownSource = extractFunction(main, 'function closeCategoryDropdown');

const focusCalls = [];
const trigger = {
  setAttribute: (name, value) => { trigger[name] = value; },
  focus: options => focusCalls.push(options)
};
let dropdownRemoved = 0;
const context = {
  querySelector: selector => ({
    '[data-open-category-filter]': trigger,
    '.category-filter-dropdown': { remove: () => { dropdownRemoved++; } }
  })[selector] || null
};
const state = { ui: { categoryDropdown: true } };
const closeCategoryDropdown = runInNewContext(`${closeCategoryDropdownSource}\ncloseCategoryDropdown;`, {
  document: context,
  restoreFocus: target => {
    target.focus({ preventScroll: true });
    return true;
  },
  state
});

assert.equal(closeCategoryDropdown(context), true);
assert.equal(state.ui.categoryDropdown, false);
assert.equal(dropdownRemoved, 1, 'closing the Categories dropdown must remove only that localized surface');
assert.equal(trigger['aria-expanded'], 'false');
assert.deepEqual(focusCalls, [{ preventScroll: true }],
  'closing Categories must return focus to its exact trigger without a scroll jump');

console.log('task4-focus-interaction.test.mjs passed');

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must remain available`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index++) {
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
  assert.fail(`${signature} must have a complete body`);
}
