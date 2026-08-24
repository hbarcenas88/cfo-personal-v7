import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { renderCategories } from '../src/screens/categories.js';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const hostile = 'Hogar "A" <especial> & familia';
const baseState = {
  accounts: [],
  budgets: [{ id: 'budget-1', month: '2026-08', category: hostile, subcategory: 'Sub <especial> & "A"', amount: 999999999.99 }],
  categories: [{ name: hostile, icon: 'folder', color: 'red; background:url(https://attacker.invalid/pixel)', subcategories: [{ name: 'Sub <especial> & "A"' }] }],
  filters: { categories: { text: '<especial> & "consulta"', categories: [hostile], view: 'combined', expanded: [hostile], compare: false } },
  period: { mode: 'month', month: '2026-08' },
  provisionEvents: [],
  provisions: [],
  transactions: [{ id: 'tx-1', account: 'Cuenta', amount: 999999999.99, category: hostile, date: '2026-08-19', description: 'Compra', movement: 'Gasto', subcategory: 'Sub <especial> & "A"' }],
  ui: { categoryDropdown: true }
};
const markup = renderCategories(baseState) + renderCategories({
  ...baseState,
  filters: { categories: { ...baseState.filters.categories, text: '' } }
});
assert.doesNotMatch(markup, /<especial>/, 'category names and subcategories must render literally');
assert.doesNotMatch(markup, /attacker\.invalid/, 'unsafe category colors must not reach inline styles');
assert.match(markup, /Hogar &quot;A&quot; &lt;especial&gt; &amp; familia/);
assert.match(markup, /Sub &lt;especial&gt; &amp; &quot;A&quot;/);
assert.match(markup, /value="&lt;especial&gt; &amp; &quot;consulta&quot;"/);
assert.match(markup, /data-clear-cat-filters/);
assert.match(markup, /aria-controls="category-filter-options"/);
assert.match(markup, /data-category-filter-toggle[^>]*aria-pressed="true"/);
assert.match(markup, /data-cat-view="combined"[^>]*aria-pressed="true"/);
assert.match(markup, />Combinado<\/button>/);
assert.match(markup, />Presupuesto<\/button>/);
assert.match(markup, />Gasto<\/button>/);
assert.match(markup, /data-cat-expand="Hogar &quot;A&quot; &lt;especial&gt; &amp; familia"[^>]*aria-expanded="true"[^>]*aria-controls="category-detail-0"/);
assert.match(markup, /id="category-detail-0"/);
assert.match(markup, /\$999,999,999\.99/);

const emptyNoData = renderCategories({
  ...baseState,
  budgets: [],
  categories: [],
  transactions: [],
  filters: { categories: { text: '', categories: [], view: 'combined', expanded: [], compare: false } },
  ui: { categoryDropdown: false }
});
assert.match(emptyNoData, /Sin datos en este per.odo/i);
assert.doesNotMatch(emptyNoData, /Sin coincidencias/i);
assert.match(emptyNoData, /data-clear-cat-filters[^>]*hidden/, 'the category clear action must remain non-rendered without search or selection');

const emptyFiltered = renderCategories({
  ...baseState,
  filters: { categories: { text: 'no existe', categories: [], view: 'combined', expanded: [], compare: false } },
  ui: { categoryDropdown: false }
});
assert.match(emptyFiltered, /Sin coincidencias/i);
assert.match(emptyFiltered, /data-clear-cat-filters/);

const listeners = new Map();
const optionsHost = { scrollTop: 166 };
const trigger = { focus() { document.activeElement = this; } };
const categoryButton = {
  dataset: { categoryFilterToggle: hostile },
  classList: { toggle() {} },
  attributes: {},
  addEventListener(type, listener) { if (type === 'click') listeners.set('select', listener); },
  setAttribute(name, value) { this.attributes[name] = String(value); },
  querySelector() { return null; },
  insertAdjacentHTML() {}
};
const expandButton = {
  dataset: { catExpand: hostile },
  attributes: { 'aria-expanded': 'false' },
  addEventListener(type, listener) { if (type === 'click') listeners.set('expand', listener); },
  setAttribute(name, value) { this.attributes[name] = String(value); },
  getAttribute(name) { return this.attributes[name]; }
};
const detail = { hidden: true };
const document = {
  activeElement: trigger,
  addEventListener() {},
  elementFromPoint() { return null; },
  querySelector(selector) {
    return {
      '.category-filter-options': optionsHost,
      '#category-detail-0': detail
    }[selector] || null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-category-filter-toggle]') return [categoryButton];
    if (selector === '[data-cat-expand]') return [expandButton];
    return [];
  }
};
const root = {
  ownerDocument: document,
  querySelector: selector => document.querySelector(selector),
  querySelectorAll: selector => document.querySelectorAll(selector)
};
let fullRenders = 0;
let categoryRefreshes = 0;
let persistenceRequests = 0;
const interactionState = {
  filters: {
    audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] },
    categories: { text: 'hogar', categories: [], view: 'combined', expanded: [] },
    excludedChartCategories: [],
    summary: { excludedCategories: [] }
  },
  ui: { auditDropdown: '', auditFiltersOpen: false, categoryDropdown: true }
};
const bindFiltersSource = extractFunction(main, 'function bindFilters(root)');
const bindingContextSource = extractFunction(main, 'function bindingContext(root)');
const auditFilterKeySource = extractFunction(main, 'function auditFilterKey(type)');
const splitPairSource = extractFunction(main, 'function splitPair(value = \'\')');
const bindFilters = runInNewContext(`
  let auditDropdownDismissBound = true;
  ${bindingContextSource}
  ${auditFilterKeySource}
  ${splitPairSource}
  ${bindFiltersSource}
  bindFilters;
`, {
  state: interactionState,
  window: { requestAnimationFrame: callback => callback() },
  globalThis: { document },
  render: () => {},
  renderAndPersistFilters: () => {
    fullRenders++;
    document.activeElement = null;
    optionsHost.scrollTop = 0;
  },
  persistFiltersSoon: () => { persistenceRequests++; },
  replaceSearchResults: selector => {
    if (selector === '[data-category-card-results]' || selector === '[data-categories-results]') categoryRefreshes++;
  },
  renderAuditResults: () => '',
  renderCategoriesResults: () => '<div>results</div>',
  renderCategoryCards: () => '<div>cards</div>',
  bindAuditFilterRemovals: () => {},
  updateAuditFilterChrome: () => {},
  updateCategoryFilterChrome: () => {},
  setSearchableOptionSelected: () => {},
  filterSearchableOptions: options => options,
  auditDropdownOptionObjects: () => [],
  setView: () => {},
  showToast: () => {},
  openSheet: () => {},
  mutate: async () => {},
  safeColor: value => value,
  icon: () => ''
});

bindFilters(root);
listeners.get('select')();
listeners.get('expand')();

assert.deepEqual(Array.from(interactionState.filters.categories.categories), [hostile]);
assert.deepEqual(Array.from(interactionState.filters.categories.expanded), [hostile]);
assert.strictEqual(document.activeElement, trigger, 'category filtering and expansion must preserve focus');
assert.equal(optionsHost.scrollTop, 166, 'category dropdown scroll must survive selection');
assert.equal(fullRenders, 0, 'category selection and expansion must avoid a full-screen render');
assert.ok(categoryRefreshes >= 1, 'category selection must refresh only the category cards');
assert.ok(persistenceRequests >= 2, 'localized category changes must still persist');

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

console.log('categories-filter-interaction.test.mjs passed');
