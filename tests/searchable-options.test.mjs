import assert from 'node:assert/strict';
import { filterSearchableOptions, renderSearchActivator, renderSearchableOptionRows } from '../src/components/searchableOptions.js';

const options = [{ value: 'BAC', label: 'Banco BAC' }, { value: 'Caja', label: 'Caja chica' }];
assert.deepEqual(filterSearchableOptions(options, 'caj').map(option => option.value), ['Caja']);
assert.match(renderSearchActivator(false), /data-option-search-open/);
assert.doesNotMatch(renderSearchActivator(false), /autofocus/);
assert.match(renderSearchActivator(true), /data-option-search/);
assert.doesNotMatch(renderSearchActivator(true), /autofocus/);
assert.match(renderSearchableOptionRows(options, ['BAC']), /data-option-value="BAC"/);
assert.match(renderSearchableOptionRows(options, ['BAC']), /option-row selected/);
