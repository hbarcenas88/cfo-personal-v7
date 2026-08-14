import assert from 'node:assert/strict';
import * as periodService from '../src/services/periodService.js';
import {
  applyDraftPreset,
  comparisonPeriod,
  createPeriodDraft,
  isComparisonAvailable,
  migrateAuditPeriod,
  periodPresetState,
  shiftPeriod,
  validatePeriodDraft
} from '../src/services/periodService.js';
import { currentMonth } from '../src/utils/format.js';
import { renderPeriodSheet } from '../src/components/periodPicker.js';

const { hasVisibleDraftSelection } = periodService;
assert.equal(typeof hasVisibleDraftSelection, 'function', 'periodService must export hasVisibleDraftSelection');

const may = { mode: 'month', month: '2026-05' };
const draft = createPeriodDraft(may, { scope: 'global', compare: false });
assert.deepEqual(draft, { scope: 'global', mode: 'month', month: '2026-05', year: 2026, from: '', to: '', compare: false, tab: 'range' });
assert.deepEqual(shiftPeriod(may, -1), { mode: 'month', month: '2026-04' });
assert.deepEqual(shiftPeriod({ mode: 'year', year: 2026, month: '2026-01' }, 1), { mode: 'year', year: 2027, month: '2027-01' });
assert.deepEqual(shiftPeriod({ mode: 'range', from: '2026-05-01', to: '2026-05-31', month: '2026-05' }, -1), { mode: 'range', from: '2026-03-31', to: '2026-04-30', month: '2026-03' });
assert.deepEqual(comparisonPeriod({ mode: 'range', from: '2026-05-01', to: '2026-05-31' }), { mode: 'range', from: '2026-03-31', to: '2026-04-30' });
assert.equal(validatePeriodDraft({ mode: 'range', from: '2026-05-31', to: '2026-05-01' }).ok, false);
assert.equal(isComparisonAvailable({ mode: 'all' }), false);
assert.deepEqual(migrateAuditPeriod(), { mode: 'all', compare: false });
assert.deepEqual(
  migrateAuditPeriod({ mode: 'range', month: '2026-02', from: '2026-02-30', to: '2026-03-01' }),
  { mode: 'all', compare: false }
);
assert.deepEqual(
  migrateAuditPeriod({ mode: 'month', month: '2026-99', compare: true }),
  { mode: 'all', compare: false }
);
assert.deepEqual(
  migrateAuditPeriod({ mode: 'year', year: 2201, month: '2201-01', compare: true }),
  { mode: 'all', compare: false }
);
assert.deepEqual(
  migrateAuditPeriod({ mode: 'range', month: '2026-05', from: '2026-06-01', to: '2026-05-31' }),
  { mode: 'all', compare: false }
);
assert.deepEqual(
  migrateAuditPeriod({ mode: 'month', month: '2026-05', compare: true }),
  { mode: 'month', month: '2026-05', year: 2026, from: '', to: '', compare: true }
);
assert.deepEqual(
  migrateAuditPeriod({ mode: 'year', year: 2026, month: '2026-01', compare: true }),
  { mode: 'year', month: '2026-01', year: 2026, from: '', to: '', compare: true }
);
assert.deepEqual(applyDraftPreset(createPeriodDraft({ mode: 'all' }, { scope: 'audit' }), 'dashboard', may).mode, 'month');

const now = currentMonth();
const currentMonthDraft = createPeriodDraft({ mode: 'month', month: now });
assert.deepEqual(periodPresetState(currentMonthDraft, 'thisMonth', may), { selected: true, copied: false });
assert.deepEqual(
  periodPresetState({ ...currentMonthDraft, mode: 'range', from: '2026-05-10', to: '2026-05-20' }, 'custom', may),
  { selected: true, copied: false }
);
assert.deepEqual(
  periodPresetState(createPeriodDraft({ mode: 'all' }, { scope: 'audit' }), 'all', may),
  { selected: true, copied: false }
);

const copiedAuditDraft = createPeriodDraft(
  { mode: 'range', month: '2026-05', from: '2026-05-10', to: '2026-05-20' },
  { scope: 'audit' }
);
const dashboardRange = { mode: 'range', month: '2026-05', from: '2026-05-10', to: '2026-05-20' };
const draftSnapshot = structuredClone(copiedAuditDraft);
const dashboardSnapshot = structuredClone(dashboardRange);
assert.deepEqual(periodPresetState(copiedAuditDraft, 'dashboard', dashboardRange), { selected: false, copied: true });
assert.deepEqual(copiedAuditDraft, draftSnapshot, 'deriving preset state must not mutate the audit draft');
assert.deepEqual(dashboardRange, dashboardSnapshot, 'deriving preset state must not mutate the dashboard period');
assert.deepEqual(
  periodPresetState(copiedAuditDraft, 'dashboard', { ...dashboardRange, to: '2026-05-21' }),
  { selected: false, copied: false },
  'a later dashboard change must not remain linked to the copied audit draft'
);

const globalOptions = { scope: 'global', showComparison: false, previousLabel: '', dashboardPeriod: may, applyEnabled: true };
const monthSheet = renderPeriodSheet(currentMonthDraft, globalOptions);
assertSelectedChoice(monthSheet, 'data-period-preset="thisMonth"');
assertUnselectedChoice(monthSheet, 'data-period-preset="lastMonth"');
assert.doesNotMatch(monthSheet, /data-period-date=/, 'preset months must not expose custom date controls');

const customDraft = {
  scope: 'global', mode: 'range', month: '2026-05', year: 2026,
  from: '2026-05-10', to: '2026-05-20', compare: false, tab: 'range'
};
const customSheet = renderPeriodSheet(customDraft, globalOptions);
assertSelectedChoice(customSheet, 'data-period-preset="custom"');
assert.match(customSheet, /data-period-date="from"/);
assert.match(customSheet, /data-period-date="to"/);

const yearDraft = createPeriodDraft({ mode: 'year', year: 2026, month: '2026-01' });
const yearSheet = renderPeriodSheet(yearDraft, globalOptions);
assertSelectedChoice(yearSheet, 'data-period-year="2026"');
assert.doesNotMatch(yearSheet, /data-period-date=/, 'year mode must not expose custom date controls');

const auditAllSheet = renderPeriodSheet(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  { scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: may, applyEnabled: true }
);
assertSelectedChoice(auditAllSheet, 'data-period-preset="all"');
assert.match(auditAllSheet, />Usar per\u00edodo del dashboard</);
assert.doesNotMatch(auditAllSheet, /data-period-date=/, 'all-history mode must not expose custom date controls');

const auditCopySheet = renderPeriodSheet(
  createPeriodDraft(may, { scope: 'audit' }),
  { scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: may, applyEnabled: true }
);
assertCopyAction(auditCopySheet);
assertNoVisibleDraftSelection(auditCopySheet);

const currentYear = new Date().getFullYear();
const dashboardYear = { mode: 'year', year: currentYear, month: `${currentYear}-01` };
const copiedYearDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardYear
);
assert.equal(copiedYearDraft.tab, 'year', 'copying a dashboard year must preserve its natural tab');
const copiedYearSheet = renderPeriodSheet(copiedYearDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardYear, applyEnabled: true
});
assertSelectedChoice(copiedYearSheet, `data-period-year="${currentYear}"`);
assertCopyAction(copiedYearSheet);
const currentYearRangeTab = renderPeriodSheet({ ...copiedYearDraft, tab: 'range' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardYear, applyEnabled: true
});
assertSelectedChoice(currentYearRangeTab, 'data-period-preset="thisYear"');
assert.equal(hasVisibleDraftSelection({ ...copiedYearDraft, tab: 'range' }, dashboardYear), true);

const dashboardCurrentMonth = { mode: 'month', month: currentMonth() };
const copiedCurrentMonthDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardCurrentMonth
);
const copiedCurrentMonthSheet = renderPeriodSheet(copiedCurrentMonthDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardCurrentMonth, applyEnabled: true
});
assertSelectedChoice(copiedCurrentMonthSheet, 'data-period-preset="thisMonth"');
const currentMonthYearTab = renderPeriodSheet({ ...copiedCurrentMonthDraft, tab: 'year' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardCurrentMonth, applyEnabled: false
});
assertNoVisibleDraftSelection(currentMonthYearTab);
assert.equal(hasVisibleDraftSelection({ ...currentMonthDraft, tab: 'year' }, may), false);

const dashboardArbitraryMonth = { mode: 'month', month: '2024-03' };
const copiedArbitraryMonthDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardArbitraryMonth
);
for (const tab of ['range', 'year']) {
  const sheet = renderPeriodSheet({ ...copiedArbitraryMonthDraft, tab }, {
    scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardArbitraryMonth, applyEnabled: tab === 'range'
  });
  assertNoVisibleDraftSelection(sheet);
}

const copiedRangeDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardRange
);
const copiedRangeSheet = renderPeriodSheet(copiedRangeDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardRange, applyEnabled: true
});
assertSelectedChoice(copiedRangeSheet, 'data-period-preset="custom"');
const copiedRangeYearTab = renderPeriodSheet({ ...copiedRangeDraft, tab: 'year' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardRange, applyEnabled: false
});
assertNoVisibleDraftSelection(copiedRangeYearTab);

const blocked = renderPeriodSheet(
  { ...currentMonthDraft, tab: 'year' },
  { ...globalOptions, applyEnabled: false }
);
assert.match(blocked, /data-period-apply[^>]*disabled[^>]*aria-disabled="true"/);
assert.doesNotMatch(blocked, /Selecci\u00f3n actual/);

function choiceMarkup(markup, attribute) {
  const match = markup.match(new RegExp(`<button[^>]*${attribute}[^>]*>[\\s\\S]*?<\\/button>`));
  assert.ok(match, `${attribute} must identify a rendered period choice`);
  return match[0];
}

function assertSelectedChoice(markup, attribute) {
  const choice = choiceMarkup(markup, attribute);
  assert.match(choice, /class="[^"]*\bselected\b/);
  assert.match(choice, /aria-pressed="true"/);
  assert.match(choice, /data-period-selected-indicator/);
  assert.doesNotMatch(choice, />Seleccionado</);
  assertSelectionRepresentationCount(markup, 1);
  assertNoRedundantSelectionText(markup);
}

function assertUnselectedChoice(markup, attribute) {
  const choice = choiceMarkup(markup, attribute);
  assert.doesNotMatch(choice, /class="[^"]*\bselected\b/);
  assert.match(choice, /aria-pressed="false"/);
  assert.doesNotMatch(choice, /data-period-selected-indicator/);
  assert.doesNotMatch(choice, />Seleccionado</);
  assertNoRedundantSelectionText(markup);
}

function assertCopyAction(markup) {
  const action = choiceMarkup(markup, 'data-period-copy-dashboard');
  assert.doesNotMatch(action, /class="[^"]*\bselected\b/);
  assert.doesNotMatch(action, /aria-pressed=/);
  assert.doesNotMatch(action, /data-period-selected-indicator/);
  assert.doesNotMatch(action, />Seleccionado</);
  assertNoRedundantSelectionText(markup);
}

function assertNoVisibleDraftSelection(markup) {
  assertSelectionRepresentationCount(markup, 0);
  assertNoRedundantSelectionText(markup);
}

function assertSelectionRepresentationCount(markup, expectedCount) {
  const selected = markup.match(/<button[^>]*class="[^"]*\bselected\b[^"]*"[^>]*>/g) || [];
  const pressed = markup.match(/aria-pressed="true"/g) || [];
  const indicators = markup.match(/data-period-selected-indicator/g) || [];
  assert.equal(selected.length, expectedCount, `expected exactly ${expectedCount} .selected period choices`);
  assert.equal(pressed.length, expectedCount, `expected exactly ${expectedCount} pressed period choices`);
  assert.equal(indicators.length, expectedCount, `expected exactly ${expectedCount} period selection indicators`);
  assert.equal(indicators.length, pressed.length, 'each pressed period choice must have exactly one indicator');
}

function assertNoRedundantSelectionText(markup) {
  assert.doesNotMatch(markup, /Selecci\u00f3n actual|data-period-current-summary/);
}
console.log('period-scope.test.mjs passed');
