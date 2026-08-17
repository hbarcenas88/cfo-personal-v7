import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { bindShellEvents, ensureShell, updateShellState } from '../src/components/ui.js';
import { renderPeriodSheet } from '../src/components/periodPicker.js';
import { renderAuditCloseEntry, renderAuditCloseSheet } from '../src/screens/auditClose.js';
import { renderTemplateSheet } from '../src/screens/settings.js';
import { state } from '../src/state.js';

const audit = await readFile(new URL('../src/screens/audit.js', import.meta.url), 'utf8');
const auditClose = await readFile(new URL('../src/screens/auditClose.js', import.meta.url), 'utf8');
const categories = await readFile(new URL('../src/screens/categories.js', import.meta.url), 'utf8');
const summary = await readFile(new URL('../src/screens/summary.js', import.meta.url), 'utf8');
const componentStyles = await readFile(new URL('../styles/components.css', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');
const periodPicker = await readFile(new URL('../src/components/periodPicker.js', import.meta.url), 'utf8');
const keypad = await readFile(new URL('../src/components/keypad.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const importExport = await readFile(new URL('../src/services/importExportService.js', import.meta.url), 'utf8');
const xlsxBundle = await readFile(new URL('../assets/vendor/xlsx.full.min.js', import.meta.url), 'utf8');
const progress = await readFile(new URL('../PROGRESS.md', import.meta.url), 'utf8');
const verifier = await readFile(new URL('../VERIFIER.md', import.meta.url), 'utf8');
const backlog = await readFile(new URL('../BACKLOG.md', import.meta.url), 'utf8');
const roadmap = await readFile(new URL('../V7_ROADMAP.md', import.meta.url), 'utf8');
const productSpec = await readFile(new URL('../PRODUCT_SPEC.md', import.meta.url), 'utf8');
const designSystem = await readFile(new URL('../DESIGN_SYSTEM.md', import.meta.url), 'utf8');

{
  const previousDocument = globalThis.document;
  const previousView = state.activeView;
  const previousPeriod = state.period;
  const previousAuditPeriod = state.auditPeriod;
  const previousDrawerOpen = state.ui.drawerOpen;
  let shellWrites = 0;
  const periodLabel = { textContent: '' };
  const periodContext = { textContent: '', hidden: true };
  const periodPill = fakeElement();
  const drawerButton = fakeElement();
  const drawerBackdrop = fakeElement();
  const navButtons = [
    Object.assign(fakeElement(), { dataset: { view: 'balances' } }),
    Object.assign(fakeElement(), { dataset: { view: 'audit' } })
  ];
  const app = {
    dataset: {},
    set innerHTML(value) {
      shellWrites++;
      this.markup = value;
    },
    get innerHTML() {
      return this.markup || '';
    },
    querySelector: selector => ({
      '[data-period-label]': periodLabel,
      '[data-period-context]': periodContext,
      '.period-pill': periodPill,
      '[data-action="drawer"]': drawerButton,
      '.drawer-backdrop': drawerBackdrop
    }[selector] || null),
    querySelectorAll: selector => selector === '[data-view]' ? navButtons : []
  };
  globalThis.document = {
    getElementById: id => id === 'app' ? app : null,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  ensureShell();
  ensureShell();
  assert.equal(shellWrites, 1, 'the application shell must mount once');

  state.activeView = 'audit';
  state.period = { mode: 'month', month: '2026-07' };
  state.auditPeriod = { mode: 'all', compare: false };
  state.ui.drawerOpen = true;
  updateShellState();

  assert.equal(periodLabel.textContent, 'Todo el historial', 'Audit must show its independent period in the mounted shell');
  assert.equal(periodPill.attributes['data-period-scope'], 'audit');
  assert.equal(periodContext.textContent, 'S\u00f3lo afecta Auditor\u00eda');
  assert.equal(periodContext.hidden, false);
  assert.equal(navButtons[0].classList.has('active'), false);
  assert.equal(navButtons[1].classList.has('active'), true);
  assert.equal(drawerBackdrop.classList.has('open'), true);
  assert.equal(drawerButton.attributes['aria-expanded'], 'true');

  state.activeView = 'summary';
  updateShellState();
  assert.equal(periodLabel.textContent, 'Jul 2026', 'dashboard views must return to the confirmed global period');
  assert.equal(periodPill.attributes['data-period-scope'], 'global');
  assert.equal(periodContext.hidden, true);

  state.activeView = previousView;
  state.period = previousPeriod;
  state.auditPeriod = previousAuditPeriod;
  state.ui.drawerOpen = previousDrawerOpen;
  globalThis.document = previousDocument;
}

function fakeElement() {
  const classes = new Set();
  return {
    attributes: {},
    classList: {
      has: name => classes.has(name),
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

{
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousDrawerOpen = state.ui.drawerOpen;
  let openDrawer;
  let renderEvents = 0;
  const drawerButton = Object.assign(fakeElement(), {
    addEventListener: (type, listener) => {
      if (type === 'click') openDrawer = listener;
    }
  });
  const drawerBackdrop = fakeElement();
  const app = {
    dataset: { shellMounted: 'true' },
    querySelector: selector => ({
      '[data-action="drawer"]': drawerButton,
      '.drawer-backdrop': drawerBackdrop
    }[selector] || null),
    querySelectorAll: () => []
  };
  globalThis.document = {
    getElementById: id => id === 'app' ? app : null,
    querySelector: selector => selector === '[data-action="drawer"]' ? drawerButton : null,
    querySelectorAll: () => []
  };
  globalThis.window = {
    dispatchEvent: event => {
      if (event.type === 'cfo:render') renderEvents++;
    }
  };
  state.ui.drawerOpen = false;

  bindShellEvents();
  openDrawer();

  assert.equal(renderEvents, 1, 'opening the drawer must request one coordinated update');
  assert.equal(drawerBackdrop.classList.has('open'), false, 'the drawer handler must not render synchronously before its coordinated update');

  state.ui.drawerOpen = previousDrawerOpen;
  globalThis.document = previousDocument;
  globalThis.window = previousWindow;
}

{
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousView = state.activeView;
  const previousPeriod = state.period;
  const previousAuditPeriod = state.auditPeriod;
  const listeners = {};
  const button = action => ({
    addEventListener: (type, listener) => {
      if (type === 'click') listeners[action] = listener;
    }
  });
  const periodButton = button('period');
  const previousButton = button('previous');
  const nextButton = button('next');
  const events = [];
  globalThis.document = {
    querySelectorAll: () => [],
    querySelector: selector => ({
      '[data-action="period"]': periodButton,
      '[data-action="prev-period"]': previousButton,
      '[data-action="next-period"]': nextButton
    }[selector] || null)
  };
  globalThis.window = { dispatchEvent: event => events.push(event) };
  state.period = { mode: 'month', month: '2026-07' };
  state.auditPeriod = { mode: 'all', compare: false };
  state.activeView = 'audit';

  bindShellEvents();
  listeners.period();
  listeners.previous();
  state.activeView = 'summary';
  listeners.next();

  assert.deepEqual(
    events.map(event => ({ type: event.type, detail: event.detail })),
    [
      { type: 'cfo:period', detail: { scope: 'audit' } },
      { type: 'cfo:period-shift', detail: { scope: 'audit', delta: -1 } },
      { type: 'cfo:period-shift', detail: { scope: 'global', delta: 1 } }
    ]
  );
  assert.deepEqual(state.period, { mode: 'month', month: '2026-07' }, 'shell controls must leave persistence to main');
  assert.deepEqual(state.auditPeriod, { mode: 'all', compare: false }, 'shell controls must not mutate Audit directly');

  state.activeView = previousView;
  state.period = previousPeriod;
  state.auditPeriod = previousAuditPeriod;
  globalThis.document = previousDocument;
  globalThis.window = previousWindow;
}

assert.match(auditClose, /data-open-audit-close/);
assert.match(auditClose, /data-audit-close-file/);
assert.match(auditClose, /data-audit-close-map/);
assert.match(auditClose, /Solo en la app/);
assert.match(auditClose, /Solo en el banco/);
assert.match(auditClose, /Coincidencia exacta/);
assert.match(auditClose, /Advertencia de fecha/);
assert.doesNotMatch(auditClose, /<select\b/i);
assert.match(styles, /\.guided-audit-summary\s*\{[\s\S]*?grid-template-columns/);
assert.match(styles, /\.guided-audit-action\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/);
assertSavedAuditCloseStyles(styles);

const savedAuditStyleMutations = [
  ['row display', '.guided-audit-close-row', 'display: grid;'],
  ['row columns', '.guided-audit-close-row', 'grid-template-columns: minmax(0, 1fr) auto;'],
  ['row target height', '.guided-audit-close-row', 'min-height: var(--control-md);'],
  ['content minimum width', '.guided-audit-close-content', 'min-width: 0;'],
  ['content display', '.guided-audit-close-content', 'display: grid;'],
  ['content columns', '.guided-audit-close-content', 'grid-template-columns: minmax(0, 1fr) auto;'],
  ['long-text wrapping', ['.guided-audit-close-name', '.guided-audit-close-status'], 'overflow-wrap: anywhere;'],
  ['metadata columns', '.guided-audit-close-meta', 'grid-template-columns: minmax(0, 1fr) auto;'],
  ['chevron width', '.guided-audit-close-chevron', 'width: var(--control-md);'],
  ['chevron height', '.guided-audit-close-chevron', 'height: var(--control-md);'],
  ['chevron centering', '.guided-audit-close-chevron', 'place-items: center;'],
  ['SVG width', '.guided-audit-close-chevron svg', 'width: var(--icon-sm);'],
  ['SVG height', '.guided-audit-close-chevron svg', 'height: var(--icon-sm);'],
  ['mobile content columns', '.guided-audit-close-content', 'grid-template-columns: minmax(0, 1fr);', '@media (max-width: 420px)']
];

savedAuditStyleMutations.forEach(([label, selectors, declaration, atRule]) => {
  const mutatedStyles = moveCssDeclarationToDecoy(styles, selectors, declaration, atRule);
  assert.throws(
    () => assertSavedAuditCloseStyles(mutatedStyles),
    { name: 'AssertionError' },
    `saved-audit CSS contract must fail when ${label} moves to another selector`
  );
});

const balancedAuditCloseEntry = renderAuditCloseEntry({
  auditClosures: [{
    id: 'balanced-close',
    accountName: 'BAC',
    cutoffDate: '2026-07-31',
    realBalance: 0,
    range: {},
    statementRows: [],
    decisions: []
  }],
  transactions: []
});
assert.doesNotMatch(balancedAuditCloseEntry, /1 cierres por revisar/);
assert.match(balancedAuditCloseEntry, /Compara una cuenta con su estado de cuenta/);

const reopenedAuditClose = renderAuditCloseSheet({
  ui: { auditCloseId: 'close-canonical', auditCloseDraft: { step: 'result' } },
  auditClosures: [{
    id: 'close-canonical', accountName: 'Cuenta principal', cutoffDate: '2026-07-19', realBalance: 0,
    range: { from: '2026-07-01', to: '2026-07-19' }, statementRows: [], decisions: []
  }],
  transactions: []
});
assert.match(reopenedAuditClose, /data-audit-close-delete="close-canonical"/);

const exactCandidateAuditClose = renderAuditCloseSheet({
  ui: { auditCloseId: 'close-exact', auditCloseDraft: { step: 'review' } },
  auditClosures: [{
    id: 'close-exact', accountName: 'Cuenta sintética', cutoffDate: '2026-07-19', realBalance: -12,
    range: { from: '2026-07-01', to: '2026-07-19' },
    statementRows: [{
      id: 'statement-exact', sourceRow: 2, date: '2026-07-19',
      signedAmount: -12, description: 'Compra sintética'
    }],
    decisions: []
  }],
  transactions: [{
    id: 'transaction-exact', account: 'Cuenta sintética', date: '2026-07-19',
    movement: 'Gasto', amount: 12, description: 'Compra sintética', affectsBalance: true
  }]
});
assert.match(exactCandidateAuditClose, /Coincidencia exacta/);
assert.match(exactCandidateAuditClose, /Cuenta sintética/);
assert.match(exactCandidateAuditClose, /Fecha de corte/);
assert.match(exactCandidateAuditClose, /Confirmar/);
assert.match(exactCandidateAuditClose, /No corresponde/);
assert.match(exactCandidateAuditClose, /Dejar pendiente/);

const xlsxContext = {};
runInNewContext(xlsxBundle, xlsxContext);
assert.equal(xlsxContext.XLSX.version, '0.20.3');
const syntheticWorkbook = xlsxContext.XLSX.utils.book_new();
xlsxContext.XLSX.utils.book_append_sheet(
  syntheticWorkbook,
  xlsxContext.XLSX.utils.aoa_to_sheet([
    ['Fecha', 'Monto', 'Descripción'],
    ['2026-07-19', -12, 'Compra sintética']
  ]),
  'Extracto'
);
const syntheticXlsx = xlsxContext.XLSX.write(syntheticWorkbook, {
  bookType: 'xlsx',
  type: 'array'
});
const parsedSyntheticWorkbook = xlsxContext.XLSX.read(syntheticXlsx, { type: 'array' });
assert.deepEqual(
  Array.from(xlsxContext.XLSX.utils.sheet_to_json(
    parsedSyntheticWorkbook.Sheets.Extracto,
    { header: 1, defval: '' }
  ), row => Array.from(row)),
  [
    ['Fecha', 'Monto', 'Descripción'],
    ['2026-07-19', -12, 'Compra sintética']
  ]
);

assert.match(periodPicker, /data-period-scope/);
assert.match(periodPicker, /data-period-compare/);
assert.match(periodPicker, /data-period-copy-dashboard/);
assert.match(periodPicker, /data-period-selected-indicator/);
assert.match(periodPicker, /aria-hidden="true"/);
assert.doesNotMatch(periodPicker, /Selecci\u00f3n actual|data-period-current-summary|>Seleccionado</);
assert.doesNotMatch(periodPicker, /data-period-tab="compare"/);
const periodTabTargets = componentStyles.match(/\.period-sheet \[data-period-tab\]\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(periodTabTargets, 'period-picker tabs must have their own touch-target rule');
assert.match(periodTabTargets, /min-height:\s*44px/);
const periodTabContainer = componentStyles.match(/\.period-sheet \.segmented\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(periodTabContainer, 'period-picker tabs must reserve their touch-target height');
assert.match(periodTabContainer, /min-height:\s*54px/);
assert.doesNotMatch(audit, /audit-period-seal|data-open-audit-period|audit-period-change/);
assert.match(audit, /buildAuditComparison/);
assert.match(audit, /data-audit-results/);
assert.match(audit, /transactionCard/);
assert.match(audit, /data-toggle-audit-filters/);
const periodSheetRule = extractCssRuleBody(componentStyles, '.period-sheet');
assert.match(periodSheetRule, /height:\s*min\(760px,\s*calc\(100vh - 24px\)\);/);
assert.match(periodSheetRule, /height:\s*min\(760px,\s*calc\(100dvh - 24px\)\);/);
assert.match(periodSheetRule, /overflow:\s*hidden;/);
const globalPeriodSheetRule = extractCssRuleBody(componentStyles, '.period-sheet[data-period-scope="global"]');
assert.match(globalPeriodSheetRule, /height:\s*min\(640px,\s*calc\(100vh - 24px\)\);/);
assert.match(globalPeriodSheetRule, /height:\s*min\(640px,\s*calc\(100dvh - 24px\)\);/);
const periodSheetContent = extractCssRuleBody(componentStyles, '.period-sheet-content');
assert.match(periodSheetContent, /min-height:\s*0/);
assert.match(periodSheetContent, /overflow-y:\s*auto/);
assert.match(periodSheetContent, /overscroll-behavior:\s*contain/);
const periodSheetFooter = extractCssRuleBody(styles, '.period-sheet-footer');
assert.match(periodSheetFooter, /position:\s*static/);
const periodSheetFooterButtons = extractCssRuleBody(styles, '.period-sheet-footer button');
assert.match(periodSheetFooterButtons, /min-height:\s*var\(--control-md\)/);
const selectedPeriodChoice = extractCssRuleBody(styles, '.period-sheet .record-choice.selected');
assert.match(selectedPeriodChoice, /border-color:\s*var\(--blue\)/);
assert.match(selectedPeriodChoice, /background:\s*var\(--blue-soft\)/);
const selectedPeriodIndicator = extractCssRuleBody(styles, '.period-selected-indicator');
assert.match(selectedPeriodIndicator, /color:\s*var\(--blue\)/);
assert.doesNotMatch(styles, /\.period-current-summary/);
const periodModeGrid = extractCssRuleBody(styles, '.period-mode-grid');
assert.match(periodModeGrid, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(periodModeGrid, /grid-template-rows:\s*repeat\(4, minmax\(52px, 1fr\)\)/);
assert.match(styles, /@media\s*\(min-width:\s*641px\)\s*\{[\s\S]*?\.period-mode-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?grid-template-rows:\s*repeat\(2, minmax\(52px, 1fr\)\);[\s\S]*?\}\s*\}/);
const yearPeriodMarkup = renderPeriodSheet({
  tab: 'year',
  mode: 'year',
  year: 2026,
  month: '2026-08',
  from: '',
  to: '',
  compare: false,
  error: ''
}, {
  scope: 'global',
  dashboardPeriod: { mode: 'month', month: '2026-08', year: 2026, from: '', to: '' },
  showComparison: false,
  previousLabel: '',
  applyEnabled: true
});
assert.match(yearPeriodMarkup, /class="period-sheet-content" data-period-mode="year"/);
assert.match(yearPeriodMarkup, /id="period-draft" data-period-draft-region/);
const yearContentLayout = extractCssRuleBody(componentStyles, '.period-sheet-content[data-period-mode="year"]');
assert.match(yearContentLayout, /display:\s*flex/);
assert.match(yearContentLayout, /flex-direction:\s*column/);
const yearDraftRegion = extractCssRuleBody(componentStyles, '.period-sheet-content[data-period-mode="year"] \[data-period-draft-region\]');
assert.match(yearDraftRegion, /flex:\s*1 1 0/);
assert.match(yearDraftRegion, /min-height:\s*0/);
const yearGridLayout = extractCssRuleBody(componentStyles, '.period-sheet-content[data-period-mode="year"] .period-mode-grid');
assert.match(yearGridLayout, /flex:\s*1 1 auto/);
assert.match(yearGridLayout, /min-height:\s*0/);
assert.doesNotMatch(styles, /audit-period-seal|audit-period-change/);
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
assert.match(audit, /audit-filter-toggle/);
assert.match(audit, /audit-filter-control/);
assert.match(audit, /audit-filter-active/);
assert.match(audit, /audit-filter-footer-action/);
assert.match(componentStyles, /\.chip\.dense\s*\{[\s\S]*?min-height:\s*32px/);
[
  /\.metric-top\s+\.category-filter-clear\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.category-filter-controls\s+\.category-filter-trigger\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  /\.category-view-segmented\s*>\s*button\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
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
assert.match(keypad, /CLASSIC_KEYPAD_ROWS/);
assert.doesNotMatch(keypad, /data-key="confirm"/);
assert.match(keypad, /data-key="back"/);
assert.match(main, /data-option-search-open/);
assert.doesNotMatch(audit, /autofocus/);
assert.doesNotMatch(keypad, /key\('calendar'/);
assert.match(styles, /\.operational-chart-row-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);
assert.match(styles, /\.operational-category > span\s*\{[\s\S]*?text-overflow:\s*ellipsis/);

{
  const renderActiveSheetSource = extractFunction(main, 'function renderActiveSheet()');
  const calendarCalls = [];
  const recordCalendarState = {
    ui: { activeSheet: 'calendar', calendarTarget: 'record-date' }
  };
  const renderRecordCalendarSheet = runInNewContext(`${renderActiveSheetSource}\nrenderActiveSheet;`, {
    state: recordCalendarState,
    calendarDraft: { selectedDate: '2026-08-14', visibleMonth: '2026-08' },
    renderCalendarSheet: options => {
      calendarCalls.push(options);
      return options.context;
    }
  });

  assert.equal(renderRecordCalendarSheet(), 'record');
  assert.deepEqual(JSON.parse(JSON.stringify(calendarCalls)), [{ selectedDate: '2026-08-14', visibleMonth: '2026-08', context: 'record' }]);

  recordCalendarState.ui.calendarTarget = 'period:global:from';
  assert.equal(renderRecordCalendarSheet(), 'period');
  assert.deepEqual(JSON.parse(JSON.stringify(calendarCalls[1])), { selectedDate: '2026-08-14', visibleMonth: '2026-08', context: 'period' });
}

const recordCalendarSheetRule = extractCssRuleBody(componentStyles, '.record-calendar-sheet');
assert.match(recordCalendarSheetRule, /display:\s*grid;/);
assert.match(recordCalendarSheetRule, /grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto auto auto;/);
assert.match(recordCalendarSheetRule, /height:\s*min\(720px, calc\(100dvh - 24px\)\);/);
assert.match(recordCalendarSheetRule, /overflow:\s*hidden;/);
const recordCalendarQuickRule = extractCssRuleBody(componentStyles, '.record-calendar-sheet .quick-grid');
assert.match(recordCalendarQuickRule, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/);
const recordCalendarSelectedRule = extractCssRuleBody(componentStyles, '.record-calendar-sheet .calendar-grid .selected');
assert.match(recordCalendarSelectedRule, /border-radius:\s*50%;/);
assert.match(recordCalendarSelectedRule, /box-shadow:\s*0 0 0 2px var\(--surface\), 0 0 0 4px var\(--blue\);/);
const recordCalendarGridRule = extractCssRuleBody(styles, '.record-calendar-sheet .calendar-grid');
assert.match(recordCalendarGridRule, /min-height:\s*0;/);
assert.match(recordCalendarGridRule, /align-content:\s*space-between;/);

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

function assertSavedAuditCloseStyles(source) {
  const rowRule = extractCssRuleBody(source, '.guided-audit-close-row');
  assert.match(rowRule, /(?:^|\s)display:\s*grid;/, 'saved audit rows must use grid');
  assert.match(rowRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/, 'saved audit rows must reserve flexible content and a fixed chevron column');
  assert.match(rowRule, /min-height:\s*var\(--control-md\);/, 'the full saved audit row must retain the 44px control target');

  const contentRule = extractCssRuleBody(source, '.guided-audit-close-content');
  assert.match(contentRule, /min-width:\s*0;/, 'saved audit content must be allowed to shrink');
  assert.match(contentRule, /(?:^|\s)display:\s*grid;/, 'saved audit content must use grid');
  assert.match(contentRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/, 'saved audit content must keep identity flexible and metadata readable');

  const longTextRule = extractCssRuleBody(source, ['.guided-audit-close-name', '.guided-audit-close-status']);
  assert.match(longTextRule, /overflow-wrap:\s*anywhere;/, 'long account names and statuses must wrap in their own rule');

  const metaRule = extractCssRuleBody(source, '.guided-audit-close-meta');
  assert.match(metaRule, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/, 'audit status and amount must have separate readable columns');

  const chevronRule = extractCssRuleBody(source, '.guided-audit-close-chevron');
  assert.match(chevronRule, /width:\s*var\(--control-md\);/, 'the chevron affordance must use the 44px control width');
  assert.match(chevronRule, /height:\s*var\(--control-md\);/, 'the chevron affordance must use the 44px control height');
  assert.match(chevronRule, /place-items:\s*center;/, 'the chevron SVG must stay centered inside its affordance');

  const chevronSvgRule = extractCssRuleBody(source, '.guided-audit-close-chevron svg');
  assert.match(chevronSvgRule, /width:\s*var\(--icon-sm\);/, 'the chevron SVG must not retain intrinsic width');
  assert.match(chevronSvgRule, /height:\s*var\(--icon-sm\);/, 'the chevron SVG must not retain intrinsic height');

  const mobileBlock = extractCssAtRuleBody(source, '@media (max-width: 420px)');
  const mobileContentRule = extractCssRuleBody(mobileBlock, '.guided-audit-close-content');
  assert.match(mobileContentRule, /grid-template-columns:\s*minmax\(0,\s*1fr\);/, 'saved audit metadata must stack into a non-zero-width mobile column');
}

function extractCssRuleBody(source, selectors) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const expectedHeader = normalizeCssHeader(selectorList.join(', '));
  const block = findTopLevelCssBlocks(source).find(candidate => candidate.header === expectedHeader);
  assert.ok(block, `CSS rule ${selectorList.join(', ')} must exist`);
  return block.body;
}

function extractCssAtRuleBody(source, atRule) {
  const expectedHeader = normalizeCssHeader(atRule);
  const block = findTopLevelCssBlocks(source).find(candidate => candidate.header === expectedHeader);
  assert.ok(block, `${atRule} must exist`);
  return block.body;
}

function findTopLevelCssBlocks(source) {
  const blocks = [];
  let cursor = 0;
  while (cursor < source.length) {
    const openBrace = source.indexOf('{', cursor);
    if (openBrace === -1) break;
    let depth = 1;
    let closeBrace = openBrace + 1;
    for (; closeBrace < source.length && depth > 0; closeBrace++) {
      if (source[closeBrace] === '{') depth++;
      if (source[closeBrace] === '}') depth--;
    }
    assert.equal(depth, 0, `CSS block starting at offset ${openBrace} must have a balanced closing brace`);
    const bodyEnd = closeBrace - 1;
    blocks.push({
      header: normalizeCssHeader(source.slice(cursor, openBrace)),
      body: source.slice(openBrace + 1, bodyEnd),
      bodyStart: openBrace + 1,
      bodyEnd
    });
    cursor = closeBrace;
  }
  return blocks;
}

function moveCssDeclarationToDecoy(source, selectors, declaration, atRule = '') {
  const atRuleBlock = atRule
    ? findTopLevelCssBlocks(source).find(candidate => candidate.header === normalizeCssHeader(atRule))
    : null;
  if (atRule) assert.ok(atRuleBlock, `${atRule} must exist before mutation`);
  const scopeBody = atRuleBlock?.body || source;
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  const ruleBlock = findTopLevelCssBlocks(scopeBody)
    .find(candidate => candidate.header === normalizeCssHeader(selectorList.join(', ')));
  assert.ok(ruleBlock, `CSS rule ${selectorList.join(', ')} must exist before mutation`);
  const declarationOffset = ruleBlock.body.indexOf(declaration);
  assert.notEqual(declarationOffset, -1, `${declaration} must exist before mutation`);

  const scopeOffset = atRuleBlock?.bodyStart || 0;
  const absoluteOffset = scopeOffset + ruleBlock.bodyStart + declarationOffset;
  const withoutDeclaration = `${source.slice(0, absoluteOffset)}${source.slice(absoluteOffset + declaration.length)}`;
  return `${withoutDeclaration}\n.guided-audit-contract-decoy { ${declaration} }`;
}

function normalizeCssHeader(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

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

{
  const renderActiveScreenSource = extractFunction(main, 'function renderActiveScreen()');
  const calls = { onboarding: 0, balances: 0, summary: 0, categories: 0, audit: 0, settings: 0 };
  const screens = ['balances', 'summary', 'categories', 'audit', 'settings'].map(view => {
    let markup = 'stale listener host';
    return {
      id: `screen-${view}`,
      get innerHTML() { return markup; },
      set innerHTML(value) { markup = value; },
      replaceChildren() { markup = ''; }
    };
  });
  const renderActiveScreen = runInNewContext(`${renderActiveScreenSource}\nrenderActiveScreen;`, {
    state: { activeView: 'audit', onboarded: true },
    document: { querySelectorAll: () => screens },
    emptyData: () => false,
    injectDebugTool: () => {},
    renderOnboarding: () => { calls.onboarding++; return 'onboarding'; },
    renderBalances: () => { calls.balances++; return 'balances'; },
    renderSummary: () => { calls.summary++; return 'summary'; },
    renderCategories: () => { calls.categories++; return 'categories'; },
    renderAudit: () => { calls.audit++; return 'audit'; },
    renderSettings: () => { calls.settings++; return 'settings'; }
  });

  renderActiveScreen();

  assert.deepEqual(calls, { onboarding: 0, balances: 0, summary: 0, categories: 0, audit: 1, settings: 0 });
  assert.equal(screens.find(screen => screen.id === 'screen-audit').innerHTML, 'audit');
  screens.filter(screen => screen.id !== 'screen-audit').forEach(screen => {
    assert.equal(screen.innerHTML, '', `${screen.id} must be emptied while inactive`);
  });
}

{
  const renderScopesSource = extractFunction(main, 'function renderScopes(scopes)');
  let screenRenders = 0;
  let recordRenders = 0;
  let sheetRenders = 0;
  let recordReplacements = 0;
  let sheetReplacements = 0;
  let toastRenders = 0;
  let shellUpdates = 0;
  const boundRoots = [];
  const iconRoots = [];
  const capturedRoots = [];
  const restoredRoots = [];
  const appRoot = { id: 'app' };
  const recordRoot = {
    id: 'record-root',
    set innerHTML(value) { recordReplacements++; this.markup = value; }
  };
  const sheetRoot = {
    id: 'sheet-root',
    set innerHTML(value) { sheetReplacements++; this.markup = value; }
  };
  const roots = new Map([
    ['app', appRoot],
    ['record-root', recordRoot],
    ['sheet-root', sheetRoot]
  ]);
  const renderScopes = runInNewContext(`${renderScopesSource}\nrenderScopes;`, {
    Set,
    ensureShell: () => {},
    document: { getElementById: id => roots.get(id) || null },
    captureInteractionState: root => { capturedRoots.push(root); return { root }; },
    restoreInteractionState: (snapshot, root) => { restoredRoots.push(root); },
    updateShellState: () => { shellUpdates++; },
    setScreenActive: () => {},
    renderActiveScreen: () => { screenRenders++; },
    injectDebugTool: () => {},
    renderRecordRoot: () => { recordRenders++; return 'record'; },
    renderActiveSheet: () => { sheetRenders++; return 'sheet'; },
    toastRoot: () => { toastRenders++; },
    bindDynamicEvents: root => { boundRoots.push(root); },
    renderIcons: root => { iconRoots.push(root); },
    state: {}
  });

  renderScopes(['sheet']);

  assert.equal(shellUpdates, 0, 'sheet scope must not update shell state');
  assert.equal(screenRenders, 0, 'sheet scope must not invoke the active-screen renderer');
  assert.equal(recordRenders, 0, 'sheet scope must not invoke the record renderer');
  assert.equal(recordReplacements, 0, 'sheet scope must not replace record-root');
  assert.equal(toastRenders, 0, 'sheet scope must not invoke the toast renderer');
  assert.equal(sheetRenders, 1);
  assert.equal(sheetReplacements, 1);
  assert.deepEqual(boundRoots, [sheetRoot], 'sheet bindings must be limited to sheet-root');
  assert.deepEqual(iconRoots, [sheetRoot], 'sheet icons must be limited to sheet-root');
  assert.deepEqual(capturedRoots, [sheetRoot]);
  assert.deepEqual(restoredRoots, [sheetRoot]);
}

{
  const bindDynamicEventsSource = extractFunction(main, 'function bindDynamicEvents');
  let drawerBindings = 0;
  let screenBindings = 0;
  const drawerSetting = { addEventListener: () => { drawerBindings++; }, dataset: { settings: 'tools' } };
  const screenSetting = { addEventListener: () => { screenBindings++; }, dataset: { settings: 'planning' } };
  const screenRoot = {
    querySelector: () => null,
    querySelectorAll: selector => selector === '[data-settings]' ? [screenSetting] : []
  };
  const bindDynamicEvents = runInNewContext(`${bindDynamicEventsSource}\nbindDynamicEvents;`, {
    document: {
      querySelector: () => null,
      querySelectorAll: selector => selector === '[data-settings]' ? [drawerSetting] : []
    },
    bindSheetDragClose: () => {},
    bindRecordEvents: () => {},
    bindPeriodEvents: () => {},
    bindCalendarEvents: () => {},
    bindFilters: () => {},
    bindTools: () => {},
    bindSheetActions: () => {}
  });

  bindDynamicEvents(screenRoot);

  assert.equal(drawerBindings, 0, 'dynamic renders must not rebind listeners on the persistent drawer');
  assert.equal(screenBindings, 1, 'the active rendered region must receive its dynamic settings listener');
}

{
  const bindDynamicEventsSource = extractFunction(main, 'function bindDynamicEvents');
  let screenBindings = 0;
  let sheetBindings = 0;
  const screenSetting = { addEventListener: () => { screenBindings++; }, dataset: { settings: 'planning' } };
  const sheetSetting = { addEventListener: () => { sheetBindings++; }, dataset: { settings: 'accounts' } };
  const emptyQueryRoot = { querySelector: () => null, querySelectorAll: () => [] };
  const sheetRoot = {
    querySelector: () => null,
    querySelectorAll: selector => selector.includes('[data-settings]') ? [sheetSetting] : []
  };
  const bindDynamicEvents = runInNewContext(`${bindDynamicEventsSource}\nbindDynamicEvents;`, {
    document: {
      querySelector: () => null,
      querySelectorAll: selector => selector.includes('[data-settings]') ? [screenSetting] : []
    },
    bindSheetDragClose: root => assert.strictEqual(root, sheetRoot),
    bindRecordEvents: root => assert.strictEqual(root, sheetRoot),
    bindPeriodEvents: root => assert.strictEqual(root, sheetRoot),
    bindCalendarEvents: root => assert.strictEqual(root, sheetRoot),
    bindFilters: root => assert.strictEqual(root, sheetRoot),
    bindTools: root => assert.strictEqual(root, sheetRoot),
    bindSheetActions: root => assert.strictEqual(root, sheetRoot),
    root: emptyQueryRoot
  });

  bindDynamicEvents(sheetRoot);

  assert.equal(screenBindings, 0, 'sheet binding must not touch the unchanged active screen');
  assert.equal(sheetBindings, 1, 'sheet binding must attach listeners inside sheet-root');
}

const applyPeriodDraftSource = extractFunction(main, 'async function applyPeriodDraft()');
const appliedState = {
  activeView: 'categories',
  period: { mode: 'month', month: '2026-05' },
  filters: { categories: { compare: false } },
  ui: {
    periodDraftApplyEnabled: true,
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
assert.match(worker, /cfo-personal-v7-cache-46/, 'Wave 2 final fixes must activate cache-46');
assert.match(worker, /\.\/src\/components\/recordKeypad\.js/, 'Wave 1.1 must precache the record keypad binder');
assert.equal(
  (worker.match(/\.\/src\/components\/recordKeypad\.js/g) || []).length,
  1,
  'the record keypad binder must appear exactly once in the worker shell'
);
assert.equal(
  (worker.match(/\.\/src\/services\/planningService\.js/g) || []).length,
  1,
  'the planning service must appear exactly once in the worker shell'
);
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
const workerContract = runInNewContext(`${worker}\n({ appShell: APP_SHELL, cacheName: CACHE_NAME })`, {
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
const { appShell, cacheName } = workerContract;
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

assert.deepEqual(
  {
    cacheName,
    renderCoordinatorPrecached: appShell.includes('https://app.test/src/utils/renderCoordinator.js'),
    recordKeypadPrecached: appShell.includes('https://app.test/src/components/recordKeypad.js'),
    planningServicePrecached: appShell.includes('https://app.test/src/services/planningService.js')
  },
  {
    cacheName: 'cfo-personal-v7-cache-46',
    renderCoordinatorPrecached: true,
    recordKeypadPrecached: true,
    planningServicePrecached: true
  },
  'Wave 1.1 must bump the worker cache while preserving application-shell precache parity'
);
assert.match(worker, /'\.\/src\/components\/searchableOptions\.js'/);
assert.match(worker, /'\.\/src\/services\/periodService\.js'/);
assert.match(worker, /'\.\/src\/services\/guidedAuditService\.js'/);
assert.match(worker, /'\.\/src\/services\/statementFileService\.js'/);
assert.match(worker, /'\.\/src\/screens\/auditClose\.js'/);
assert.match(worker, /'\.\/assets\/vendor\/xlsx\.full\.min\.js'/);
assert.match(worker, /fetch\(event\.request,\s*\{\s*cache:\s*'no-store'\s*\}\)/);
assert.match(worker, /!response\.ok\s*\|\|\s*response\.status\s*===\s*206/);
assert.match(worker, /await cache\.put\(event\.request, copy\)/);
const settings = renderTemplateSheet({ ui: { templateInfoKind: '' } });
assert.match(settings, /data-template="audit_statement"/);
assert.match(settings, /data-template-info="audit_statement"/);
assert.doesNotMatch(auditClose, /data-template="audit_statement"/);
assert.match(importExport, /\['Fecha', 'Descripción', 'Monto'\]/);

assert.match(progress, /GitHub Pages se publicaron con `cfo-personal-v7-cache-40` el 2026-07-28/);
assert.match(backlog, /plantilla `Auditoría — estado de cuenta` se descarga localmente desde Ajustes y no muta finanzas/);
assert.match(verifier, /Auditoría — estado de cuenta/);
assert.match(productSpec, /`Fecha,Descripción,Monto`/);
assert.match(designSystem, /no anidada en la importación del cierre/);
assert.match(designSystem, /target mínimo de 44 px/);
assert.match(roadmap, /evidencia de dispositivo\/PWA y validación no destructiva con datos reales/);
assert.doesNotMatch(verifier, /- \[x\] Sesi.n (controlada|sint.tica):/);
assert.match(verifier, /- \[ \] Adjuntar captura visual duradera o completar validación móvil del usuario antes de tratar esta revisión como evidencia de entrega\./);

console.log('mobile-ui-contract.test.mjs passed');
