import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const audit = await readFile(new URL('../src/screens/audit.js', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/screens/categories.js', import.meta.url), 'utf8');
const summary = await readFile(new URL('../src/screens/summary.js', import.meta.url), 'utf8');
const componentStyles = await readFile(new URL('../styles/components.css', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');
const periodPicker = await readFile(new URL('../src/components/periodPicker.js', import.meta.url), 'utf8');
const keypad = await readFile(new URL('../src/components/keypad.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const progress = await readFile(new URL('../PROGRESS.md', import.meta.url), 'utf8');
const verifier = await readFile(new URL('../VERIFIER.md', import.meta.url), 'utf8');
const backlog = await readFile(new URL('../BACKLOG.md', import.meta.url), 'utf8');
const roadmap = await readFile(new URL('../V7_ROADMAP.md', import.meta.url), 'utf8');

assert.match(periodPicker, /data-period-scope/);
assert.match(periodPicker, /data-period-compare/);
assert.match(periodPicker, /data-period-copy-dashboard/);
assert.doesNotMatch(periodPicker, /data-period-tab="compare"/);
const periodTabTargets = componentStyles.match(/\.period-sheet \[data-period-tab\]\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(periodTabTargets, 'period-picker tabs must have their own touch-target rule');
assert.match(periodTabTargets, /min-height:\s*44px/);
const periodTabContainer = componentStyles.match(/\.period-sheet \.segmented\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(periodTabContainer, 'period-picker tabs must reserve their touch-target height');
assert.match(periodTabContainer, /min-height:\s*54px/);
assert.match(audit, /data-open-audit-period/);
assert.match(audit, /data-toggle-audit-filters/);
assert.match(styles, /\.period-sheet-footer\s*\{[\s\S]*?position:\s*sticky/);
const periodSheetContent = componentStyles.match(/\.period-sheet-content\s*\{[\s\S]*?\n\}/)[0];
assert.match(periodSheetContent, /min-height:\s*0/);
assert.match(periodSheetContent, /overflow-y:\s*auto/);
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
assert.match(categories, /class="chip dense category-filter-clear"/);
assert.match(categories, /class="segmented category-view-segmented"/);
assert.match(categories, /class="category-comparison-summary"/);
assert.match(categories, /class="category-comparison-note"/);
assert.match(styles, /\.category-filter-controls\s*\{\s*position:\s*relative;/);
assert.match(styles, /\.category-selector\s*\{\s*position:\s*static;/);
assert.match(styles, /\.category-view-segmented\s*\{[\s\S]*?min-height:\s*calc\(var\(--control-md\) \+ 8px\)/);
assert.match(styles, /\.category-view-segmented > button\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/);
assert.match(audit, /audit-period-change/);
assert.match(audit, /audit-filter-toggle/);
assert.match(audit, /audit-filter-control/);
assert.match(audit, /audit-filter-active/);
assert.match(audit, /audit-filter-footer-action/);
assert.match(componentStyles, /\.chip\.dense\s*\{[\s\S]*?min-height:\s*32px/);
[
  /\.metric-top\s+\.category-filter-clear\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.category-filter-controls\s+\.category-filter-trigger\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.category-view-segmented\s*>\s*button\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-period-seal\s+\.audit-period-change\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-filter-head\s+\.audit-filter-toggle\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-filter-selectors\s+\.audit-filter-control\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-active-filters\s+\.audit-filter-active\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-dropdown-footer\s+\.audit-filter-footer-action\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/
].forEach(targetRule => assert.match(styles, targetRule));
assert.match(audit, /class="icon-button compact" data-audit-dropdown-close/);
assert.match(audit, /class="audit-dropdown-option/);
assert.match(audit, /class="audit-dropdown-clear audit-filter-footer-action"/);
assert.match(audit, /class="secondary-button compact audit-filter-footer-action"/);
assert.match(categories, /class="icon-button compact" data-category-filter-close/);
assert.match(categories, /class="category-filter-option/);
assert.match(categories, /class="audit-dropdown-clear" data-category-filter-clear/);
assert.match(categories, /class="secondary-button compact" data-category-filter-close/);
[
  /\.audit-dropdown-head\s+\.icon-button\.compact\s*\{[\s\S]*?min-width:\s*var\(--control-md\)[\s\S]*?min-height:\s*var\(--control-md\)[\s\S]*?height:\s*var\(--control-md\)/,
  /\.audit-dropdown-option\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.category-filter-option\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-dropdown-clear\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.audit-dropdown-footer\s+\.secondary-button\.compact\s*\{[\s\S]*?min-height:\s*var\(--control-md\)[\s\S]*?height:\s*var\(--control-md\)/
].forEach(dropdownTargetRule => assert.match(styles, dropdownTargetRule));
assert.match(styles, /\.audit-dropdown\s*\{[\s\S]*?max-width:\s*calc\(100vw - 48px\)/);
assert.match(styles, /\.category-filter-dropdown\s*\{[\s\S]*?max-width:\s*calc\(100vw - 48px\)/);
assert.match(styles, /\.audit-dropdown-options\s*\{[\s\S]*?overflow:\s*auto/);
assert.match(styles, /\.category-filter-options\s*\{[\s\S]*?overflow:\s*auto/);
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

const applyPeriodDraftSource = extractFunction(main, 'async function applyPeriodDraft()');
const appliedState = {
  activeView: 'categories',
  period: { mode: 'month', month: '2026-05' },
  filters: { categories: { compare: false } },
  ui: {
    periodDraft: {
      scope: 'global',
      mode: 'month',
      month: '2026-06',
      year: 2026,
      from: '',
      to: '',
      compare: true,
      tab: 'range'
    }
  }
};
let appliedPersistCalls = 0;
let appliedPreferenceDebounceCalls = 0;
let appliedRenderCalls = 0;
const applyPeriodDraft = runInNewContext(`${applyPeriodDraftSource}\napplyPeriodDraft;`, {
  state: appliedState,
  validatePeriodDraft: () => ({ ok: true }),
  isComparisonAvailable: period => period.mode !== 'all',
  closeSheet: () => {},
  persist: async () => { appliedPersistCalls++; },
  renderAndPersistFilters: () => { appliedPreferenceDebounceCalls++; },
  render: () => { appliedRenderCalls++; }
});
await applyPeriodDraft();
assert.equal(appliedPersistCalls, 1, 'applying a global period from Categorías must persist immediately');
assert.equal(appliedPreferenceDebounceCalls, 0, 'applying a period must not use the preference debounce');
assert.equal(appliedRenderCalls, 1);
assert.deepEqual(JSON.parse(JSON.stringify(appliedState.period)), { mode: 'month', month: '2026-06', year: 2026, from: '', to: '' });
assert.equal(appliedState.filters.categories.compare, true);

const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const lifecycleHandlers = new Map();
const lifecycleFetches = [];
const cachePuts = [];
const addAllCalls = [];
const lifecycleCache = {
  addAll: async assets => { addAllCalls.push(assets); },
  put: async (request, response) => { cachePuts.push({ request, response }); }
};
let skipWaitingCalls = 0;
let failedAsset;
let runtimeCache;
let runtimeNetwork;
let runtimeMatch;
const appShell = runInNewContext(`${worker}\nAPP_SHELL`, {
  URL,
  Promise,
  self: {
    location: { href: 'https://app.test/' },
    addEventListener: (type, handler) => lifecycleHandlers.set(type, handler),
    skipWaiting: () => { skipWaitingCalls++; },
    clients: { claim: () => {} }
  },
  caches: {
    open: async () => runtimeCache || lifecycleCache,
    keys: async () => [],
    delete: async () => true,
    match: async request => runtimeMatch ? runtimeMatch(request) : undefined
  },
  fetch: async (request, options) => {
    if (runtimeNetwork) return runtimeNetwork(request, options);
    const failed = request === failedAsset;
    const response = { request, options, ok: !failed, status: failed ? 404 : 200 };
    lifecycleFetches.push({ request, options, response });
    return response;
  }
});
const installWaits = [];
lifecycleHandlers.get('install')({ waitUntil: promise => installWaits.push(promise) });
assert.equal(skipWaitingCalls, 1);
assert.equal(installWaits.length, 1);
await installWaits[0];
assert.equal(addAllCalls.length, 0, 'install must precache assets through fetch and cache.put');
assert.equal(lifecycleFetches.length, appShell.length);
assert.equal(cachePuts.length, appShell.length);
for (const asset of appShell) {
  const fetchCall = lifecycleFetches.find(call => call.request === asset);
  assert.ok(fetchCall, `install must fetch ${asset}`);
  assert.equal(fetchCall.options.cache, 'no-store');
  assert.ok(cachePuts.some(call => call.request === asset && call.response === fetchCall.response), `install must cache ${asset}`);
}

const failedInstallWaits = [];
const failedPutsStart = cachePuts.length;
failedAsset = appShell[0];
lifecycleHandlers.get('install')({ waitUntil: promise => failedInstallWaits.push(promise) });
assert.equal(failedInstallWaits.length, 1);
await assert.rejects(failedInstallWaits[0], /404/);
assert.ok(!cachePuts.slice(failedPutsStart).some(call => call.request === failedAsset), 'install must not cache a failed response');

function runtimeResponseFor(request) {
  const responses = [];
  lifecycleHandlers.get('fetch')({ request, respondWith: promise => responses.push(promise) });
  assert.equal(responses.length, 1, 'same-origin GET requests must receive a response promise');
  return responses[0];
}

const runtimeRequest = { method: 'GET', mode: 'cors', url: 'https://app.test/src/main.js' };
const successfulRuntimeResponse = { ok: true, status: 200, clone: () => ({ cached: 'success' }) };
const runtimePuts = [];
let releaseRuntimeCacheWrite;
const runtimeCacheWrite = new Promise(resolve => { releaseRuntimeCacheWrite = resolve; });
runtimeNetwork = async () => successfulRuntimeResponse;
runtimeCache = {
  put: async (request, response) => {
    runtimePuts.push({ request, response });
    await runtimeCacheWrite;
  }
};
const successfulRuntimePromise = runtimeResponseFor(runtimeRequest);
let successfulRuntimeDelivered = false;
successfulRuntimePromise.then(() => { successfulRuntimeDelivered = true; });
await new Promise(resolve => setImmediate(resolve));
assert.equal(successfulRuntimeDelivered, false, 'runtime response must await its cache write');
assert.equal(runtimePuts.length, 1);
releaseRuntimeCacheWrite();
assert.strictEqual(await successfulRuntimePromise, successfulRuntimeResponse);
assert.deepEqual(runtimePuts, [{ request: runtimeRequest, response: { cached: 'success' } }]);

for (const status of [404, 206]) {
  let invalidRuntimePuts = 0;
  const invalidResponse = { ok: status !== 404, status, clone: () => ({ cached: status }) };
  runtimeNetwork = async () => invalidResponse;
  runtimeCache = { put: async () => { invalidRuntimePuts++; } };
  assert.strictEqual(await runtimeResponseFor(runtimeRequest), invalidResponse);
  assert.equal(invalidRuntimePuts, 0, `runtime ${status} responses must not enter Cache Storage`);
}

const cacheWriteFailureResponse = { ok: true, status: 200, clone: () => ({ cached: 'failed-write' }) };
runtimeNetwork = async () => cacheWriteFailureResponse;
runtimeCache = { put: async () => { throw new Error('cache write failed'); } };
runtimeMatch = async () => ({ offline: true });
assert.strictEqual(await runtimeResponseFor(runtimeRequest), cacheWriteFailureResponse, 'a cache-write failure must not replace a usable network response');

const offlineResponse = { offline: true };
const matchedRequests = [];
runtimeNetwork = async () => { throw new Error('offline'); };
runtimeMatch = async request => {
  matchedRequests.push(request);
  return offlineResponse;
};
assert.strictEqual(
  await runtimeResponseFor({ method: 'GET', mode: 'navigate', url: 'https://app.test/audit' }),
  offlineResponse
);
assert.deepEqual(matchedRequests, ['https://app.test/index.html']);

assert.match(worker, /cfo-personal-v7-cache-37/);
assert.match(worker, /'\.\/src\/services\/periodService\.js'/);
assert.match(worker, /fetch\(event\.request,\s*\{\s*cache:\s*'no-store'\s*\}\)/);
assert.match(worker, /!response\.ok\s*\|\|\s*response\.status\s*===\s*206/);
assert.match(worker, /await cache\.put\(event\.request, copy\)/);

for (const document of [progress, verifier, backlog, roadmap]) {
  assert.match(document, /Observación sintética no adjunta \(narrativa, no evidencia de entrega\)/);
  assert.match(document, /captura duradera o validación móvil del usuario/);
  assert.match(document, /no autoriza publicación ni merge/);
}
assert.doesNotMatch(verifier, /- \[x\] Sesi.n (controlada|sint.tica):/);
assert.match(verifier, /- \[ \] Adjuntar captura visual duradera o completar validación móvil del usuario antes de tratar esta revisión como evidencia de entrega\./);

console.log('mobile-ui-contract.test.mjs passed');
