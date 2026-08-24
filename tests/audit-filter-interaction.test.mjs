import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { renderAudit } from '../src/screens/audit.js';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

const hostile = 'Viajes "A" <especial> & familia';
const second = 'Viajes "B" <especial> & familia';
const state = {
  accounts: [{ name: hostile }],
  auditClosures: [],
  auditPeriod: { mode: 'all', compare: false },
  budgets: [],
  categories: [{
    name: hostile,
    icon: 'folder',
    color: 'red; background:url(https://attacker.invalid/pixel)',
    subcategories: [{ name: 'Sub <especial> & "A"' }]
  }, { name: 'Comida & hogar', icon: 'folder', color: '#0A8FE8', subcategories: [] }, ...Array.from({ length: 9 }, (_, index) => ({
    name: `Viajes opción ${index + 1}`,
    icon: 'folder',
    color: '#0A8FE8',
    subcategories: []
  }))],
  filters: {
    audit: {
      text: '<especial> & "consulta"',
      accounts: [],
      types: [],
      categories: [hostile],
      subcategories: []
    }
  },
  period: { mode: 'all' },
  provisionEvents: [],
  provisions: [],
  transactions: [{
    id: 'tx-1',
    account: 'Cuenta <especial> & "A"',
    amount: 999999999.99,
    category: hostile,
    date: '2026-08-19',
    description: 'Compra <especial> & "hostil"',
    movement: 'Gasto',
    subcategory: 'Sub <especial> & "A"'
  }],
  ui: {
    auditDropdown: 'category',
    auditDropdownSearch: 'viajes',
    auditDropdownSearchActive: true,
    auditFiltersOpen: true
  }
};

const emptyAuditMarkup = renderAudit({
  ...state,
  filters: { audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] } },
  ui: { ...state.ui, auditDropdown: '', auditDropdownSearch: '', auditDropdownSearchActive: false, auditFiltersOpen: false }
});
const markup = renderAudit(state) + emptyAuditMarkup;
assert.doesNotMatch(markup, /<especial>/, 'hostile persisted text must render literally, never as an element');
assert.doesNotMatch(markup, /attacker\.invalid/, 'unsafe category colors must not reach inline styles');
assert.match(markup, /Compra &lt;especial&gt; &amp; &quot;hostil&quot;/);
assert.match(markup, /Viajes &quot;A&quot; &lt;especial&gt; &amp; familia/);
assert.match(markup, /Cuenta &lt;especial&gt; &amp; &quot;A&quot;/);
assert.match(markup, /value="&lt;especial&gt; &amp; &quot;consulta&quot;"/);
assert.match(markup, /value="viajes"/i, 'dropdown query must survive a render');
assert.match(markup, /data-audit-dropdown-option="Comida &amp; hogar"[^>]*hidden/, 'a persisted query must keep non-matching options available but hidden');
assert.match(markup, /data-audit-search[^>]*aria-label="Buscar movimientos"/);
assert.match(markup, /data-audit-clear-search[^>]*aria-label="Limpiar b.squeda"/i);
assert.match(markup, /data-audit-clear-filters/);
assert.match(emptyAuditMarkup, /data-audit-clear-search[^>]*hidden/, 'the empty Audit search action must remain non-rendered');
assert.match(emptyAuditMarkup, /data-audit-clear-filters[^>]*hidden/, 'the empty Audit filter action must remain non-rendered');
assert.match(markup, /aria-controls="audit-filter-panel"/);
assert.match(markup, /aria-controls="audit-filter-category"/);
assert.match(markup, /data-audit-dropdown-toggle[^>]*aria-pressed="true"/);
assert.match(markup, /\$999,999,999\.99/);

const listeners = new Map();
const optionList = { scrollTop: 143 };
const searchInput = { value: 'viajes', addEventListener() {}, focus() { document.activeElement = this; } };
const auditSearchInput = { value: 'compra', addEventListener() {} };
const clearSearchButton = {
  hidden: false,
  addEventListener(type, listener) { if (type === 'click') listeners.set('clear-search', listener); }
};
const clearFiltersButton = {
  hidden: false,
  addEventListener(type, listener) { if (type === 'click') listeners.set('clear-filters', listener); }
};
const optionButton = value => ({
  dataset: {
    auditDropdownOption: value,
    auditFilterType: 'category'
  },
  attributes: {},
  classList: { toggle() {} },
  addEventListener(type, listener) {
    if (type === 'click') listeners.set(value, listener);
  },
  setAttribute(name, valueToSet) {
    this.attributes[name] = String(valueToSet);
  },
  querySelector() { return null; },
  insertAdjacentHTML() {}
});
const firstButton = optionButton(hostile);
const secondButton = optionButton(second);
const document = {
  activeElement: searchInput,
  addEventListener() {},
  elementFromPoint() { return null; },
  querySelector(selector) {
    return {
      '[data-audit-dropdown-search]': searchInput,
      '[data-audit-search]': auditSearchInput,
      '[data-audit-clear-search]': clearSearchButton,
      '[data-audit-clear-filters]': clearFiltersButton,
      '.audit-dropdown-options': optionList
    }[selector] || null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-audit-dropdown-toggle]') return [firstButton, secondButton];
    return [];
  }
};
const root = {
  ownerDocument: document,
  querySelector: selector => document.querySelector(selector),
  querySelectorAll: selector => document.querySelectorAll(selector)
};
let fullRenders = 0;
let resultRefreshes = 0;
let persistenceRequests = 0;
const interactionState = {
  filters: {
    audit: { text: 'compra', accounts: [], types: [], categories: [], subcategories: [] },
    categories: { text: '', categories: [], view: 'combined', expanded: [] },
    excludedChartCategories: [],
    summary: { excludedCategories: [] }
  },
  ui: {
    auditDropdown: 'category',
    auditDropdownSearch: 'viajes',
    auditDropdownSearchActive: true,
    auditFiltersOpen: true,
    categoryDropdown: false
  }
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
    searchInput.value = '';
    optionList.scrollTop = 0;
  },
  persistFiltersSoon: () => { persistenceRequests++; },
  replaceSearchResults: selector => {
    if (selector === '[data-audit-results]') resultRefreshes++;
  },
  renderAuditResults: () => '<div>results</div>',
  renderCategoriesResults: () => '',
  renderCategoryCards: () => '',
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
listeners.get(hostile)();
listeners.get(second)();

assert.deepEqual(Array.from(interactionState.filters.audit.categories), [hostile, second]);
assert.equal(interactionState.ui.auditDropdownSearch, 'viajes');
assert.equal(searchInput.value, 'viajes', 'selecting multiple options must keep the literal query');
assert.strictEqual(document.activeElement, searchInput, 'dropdown search must keep focus across multi-selection');
assert.equal(optionList.scrollTop, 143, 'dropdown internal scroll must stay unchanged across multi-selection');
assert.equal(fullRenders, 0, 'dropdown multi-selection must not request a full-screen render');
assert.equal(resultRefreshes, 2, 'each selection must update only the Audit results');
assert.equal(persistenceRequests, 2, 'each local selection must still persist the filter preference');

listeners.get('clear-search')({ currentTarget: clearSearchButton });
assert.equal(interactionState.filters.audit.text, '', 'the search X must clear only the search text');
assert.deepEqual(Array.from(interactionState.filters.audit.categories), [hostile, second], 'the search X must preserve active filters');

interactionState.filters.audit.text = 'consulta conservada';
auditSearchInput.value = 'consulta conservada';
listeners.get('clear-filters')();
assert.equal(interactionState.filters.audit.text, 'consulta conservada', 'Limpiar todos must preserve the search query');
assert.deepEqual(Array.from(interactionState.filters.audit.categories), [], 'Limpiar todos must clear active filters');
assert.equal(auditSearchInput.value, 'consulta conservada');
assert.equal(fullRenders, 0, 'both clear actions must remain localized');

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

console.log('audit-filter-interaction.test.mjs passed');
