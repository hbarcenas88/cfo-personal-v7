import assert from 'node:assert/strict';
import { filterSearchableOptions, renderSearchActivator, renderSearchableOptionRows } from '../src/components/searchableOptions.js';
import { icon } from '../src/icons.js';
import { renderAudit } from '../src/screens/audit.js';

const options = [{ value: 'BAC', label: 'Banco BAC' }, { value: 'Caja', label: 'Caja chica' }];
assert.deepEqual(filterSearchableOptions(options, 'caj').map(option => option.value), ['Caja']);
assert.match(renderSearchActivator(false), /data-option-search-open/);
assert.doesNotMatch(renderSearchActivator(false), /autofocus/);
assert.match(renderSearchActivator(true), /data-option-search/);
assert.doesNotMatch(renderSearchActivator(true), /autofocus/);
assert.match(renderSearchableOptionRows(options, ['BAC']), /data-option-value="BAC"/);
assert.match(renderSearchableOptionRows(options, ['BAC']), /option-row selected/);
assert.ok(renderSearchableOptionRows(options, ['BAC']).includes(icon('check')));

const auditCategories = Array.from({ length: 81 }, (_, index) => ({ name: `Categoría ${index + 1}`, subcategories: [] }));
const auditMarkup = renderAudit({
  accounts: [],
  auditClosures: [],
  auditPeriod: { mode: 'all', compare: false },
  categories: auditCategories,
  filters: { audit: { text: '', accounts: [], types: [], categories: [], subcategories: [] } },
  period: { mode: 'all' },
  transactions: [],
  ui: { auditDropdown: 'category', auditDropdownSearchActive: false, auditFiltersOpen: true }
});
assert.match(auditMarkup, /Categoría 81/);
