import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const audit = await readFile(new URL('../src/screens/audit.js', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/screens/categories.js', import.meta.url), 'utf8');
const summary = await readFile(new URL('../src/screens/summary.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');

assert.match(audit, /class="search-panel audit-search-panel"/);
assert.match(styles, /\.audit-filter-selectors\s*\{\s*position:\s*relative;/);
assert.match(styles, /\.audit-selector\s*\{\s*position:\s*static;/);
assert.doesNotMatch(styles, /\.audit-selector:nth-child/);
assert.match(styles, /\.audit-search-panel\s*\.audit-clear-button\s*\{[\s\S]*?width:\s*var\(--control-md\)/);
assert.match(categories, /class="category-filter-controls"/);
assert.match(categories, /data-open-category-filter/);
assert.match(styles, /\.category-filter-controls\s*\{\s*position:\s*relative;/);
assert.match(styles, /\.category-selector\s*\{\s*position:\s*static;/);
assert.match(summary, /operationalCategoryDistribution/);
assert.match(summary, /class="operational-chart-total"/);
assert.match(summary, /class="operational-chart-row"/);
assert.match(summary, /class="operational-chart-share"/);
assert.match(summary, /role="progressbar"/);
assert.doesNotMatch(summary, /bar-fill[^]*?<span>\$\{formatMoney\(row\.spent\)\}/);
assert.match(styles, /\.operational-chart-track\s*\{[\s\S]*?height:\s*8px/);
assert.match(styles, /\.operational-chart-row-head\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);

console.log('mobile-ui-contract.test.mjs passed');
