import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const audit = await readFile(new URL('../src/screens/audit.js', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/screens/categories.js', import.meta.url), 'utf8');
const summary = await readFile(new URL('../src/screens/summary.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');
const periodPicker = await readFile(new URL('../src/components/periodPicker.js', import.meta.url), 'utf8');
const keypad = await readFile(new URL('../src/components/keypad.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

assert.match(periodPicker, /data-period-scope/);
assert.match(periodPicker, /data-period-compare/);
assert.match(periodPicker, /data-period-copy-dashboard/);
assert.doesNotMatch(periodPicker, /data-period-tab="compare"/);
assert.match(audit, /data-open-audit-period/);
assert.match(audit, /data-toggle-audit-filters/);
assert.match(styles, /\.period-sheet-footer\s*\{[\s\S]*?position:\s*sticky/);
assert.match(styles, /\.audit-filter-panel\s*\{[\s\S]*?position:\s*relative/);

assert.match(audit, /class="search-panel audit-search-panel"/);
assert.match(styles, /\.audit-filter-selectors\s*\{\s*position:\s*relative;/);
assert.match(styles, /\.audit-filter-selectors\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(styles, /\.audit-selector\s*\{\s*position:\s*relative;/);
assert.match(audit, /audit-selector-align-right/);
assert.match(styles, /\.audit-selector\.audit-selector-align-right\s+\.audit-dropdown\s*\{[\s\S]*?right:\s*0;[\s\S]*?left:\s*auto;/);
assert.doesNotMatch(styles, /\.audit-selector:nth-child/);
assert.match(styles, /\.audit-search-panel\s*\.audit-clear-button\s*\{[\s\S]*?width:\s*var\(--control-md\)/);
assert.match(categories, /class="category-filter-controls"/);
assert.match(categories, /data-open-category-filter/);
assert.match(categories, /class="category-comparison-summary"/);
assert.match(categories, /class="category-comparison-note"/);
assert.match(styles, /\.category-filter-controls\s*\{\s*position:\s*relative;/);
assert.match(styles, /\.category-selector\s*\{\s*position:\s*static;/);
assert.match(summary, /operationalCategoryDistribution/);
assert.match(summary, /class="operational-chart-total"/);
assert.match(summary, /class="operational-chart-row"/);
assert.match(summary, /class="operational-chart-share"/);
assert.match(summary, /role="progressbar"/);
assert.match(summary, /const topRows = rows\.slice\(0, 5\);/);
assert.match(summary, /const total = rows\.reduce\(\(sum, row\) => sum \+ row\.spent, 0\);/);
assert.doesNotMatch(summary, /const total = topRows\.reduce/);
assert.match(summary, /const percent = row\.share \* 100;/);
assert.match(summary, /style="width:\$\{percent\.toFixed\(1\)\}%;background:\$\{color\}"/);
assert.match(summary, /class="operational-chart-track"[^>]*>\s*<span[^>]*><\/span>\s*<\/div>/);
assert.doesNotMatch(summary, /operational-chart-track[^]*?<span>[^<]+<\/span>/);
assert.match(summary, /function operationalChartColor\(color\)/);
assert.match(summary, /const normalized = typeof color === 'string' \? color\.trim\(\) : '';/);
const operationalChartColor = summary.match(/function operationalChartColor\(color\) \{[\s\S]*?\n\}/)[0];
assert.match(operationalChartColor, /return hexColor\.test\(normalized\) \? normalized : '#0A8FE8';/);
assert.match(summary, /const color = operationalChartColor\(row\.color\);/);
const operationalBarRow = summary.match(/function operationalBarRow\(row\) \{[\s\S]*?\n\}\r?\n\r?\nexport function renderSummaryAnalysisSheet/)[0];
assert.match(operationalBarRow, /role="progressbar"[^>]*aria-valuenow="\$\{percent\.toFixed\(1\)\}"/);
assert.match(operationalBarRow, /class="operational-chart-share">\$\{percent\.toFixed\(0\)\}%<\/span>/);
assert.doesNotMatch(operationalBarRow, /\$\{row\.color\}/);
assert.match(styles, /\.operational-chart-track\s*\{[\s\S]*?height:\s*8px/);
const operationalChartFill = styles.match(/\.operational-chart-track > span\s*\{[\s\S]*?\n\}/)[0];
assert.doesNotMatch(operationalChartFill, /min-width\s*:/);
assert.match(styles, /\.keypad\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, 1fr\)/);
assert.doesNotMatch(keypad, /key\('calendar'/);
assert.match(styles, /\.operational-chart-row-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);
assert.match(styles, /\.operational-category > span\s*\{[\s\S]*?text-overflow:\s*ellipsis/);

const filterPersistenceSource = main.match(/function renderAndPersistFilters\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(filterPersistenceSource, 'renderAndPersistFilters must remain available for preference updates');
const pendingTimers = new Map();
let nextTimerId = 0;
let renderCalls = 0;
let persistCalls = 0;
let mutationCalls = 0;
const renderAndPersistFilters = runInNewContext(`
  let filterPersistTimer = 0;
  ${filterPersistenceSource}
  renderAndPersistFilters;
`, {
  window: {
    clearTimeout: id => pendingTimers.delete(id),
    setTimeout: (callback, delay) => {
      const id = ++nextTimerId;
      pendingTimers.set(id, { callback, delay });
      return id;
    }
  },
  render: () => { renderCalls++; },
  persist: async () => { persistCalls++; },
  mutate: () => { mutationCalls++; },
  captureError: error => { throw error; }
});
renderAndPersistFilters();
renderAndPersistFilters();
assert.equal(renderCalls, 2);
assert.equal(pendingTimers.size, 1);
const [{ callback: persistPreferences, delay }] = pendingTimers.values();
assert.equal(delay, 250);
await persistPreferences();
assert.equal(persistCalls, 1);
assert.equal(mutationCalls, 0);

const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.match(worker, /cfo-personal-v7-cache-30/);
assert.match(worker, /'\.\/src\/services\/periodService\.js'/);

console.log('mobile-ui-contract.test.mjs passed');
