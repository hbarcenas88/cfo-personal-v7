import assert from 'node:assert/strict';
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

const globalOptions = { scope: 'global', showComparison: false, previousLabel: '', dashboardPeriod: may };
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
  { scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: may }
);
assertSelectedChoice(auditAllSheet, 'data-period-preset="all"');
assert.match(auditAllSheet, />Usar per\u00edodo del dashboard</);
assert.doesNotMatch(auditAllSheet, /data-period-date=/, 'all-history mode must not expose custom date controls');

const auditCopySheet = renderPeriodSheet(
  createPeriodDraft(may, { scope: 'audit' }),
  { scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: may }
);
assertCopyAction(auditCopySheet);
assertSingleDraftRepresentation(auditCopySheet, 'data-period-current-summary');

const currentYear = new Date().getFullYear();
const dashboardYear = { mode: 'year', year: currentYear, month: `${currentYear}-01` };
const copiedYearDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardYear
);
assert.equal(copiedYearDraft.tab, 'year', 'copying a dashboard year must preserve its natural tab');
const copiedYearSheet = renderPeriodSheet(copiedYearDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardYear
});
assertSingleDraftRepresentation(copiedYearSheet, `data-period-year="${currentYear}"`);
assertCopyAction(copiedYearSheet);
const currentYearRangeTab = renderPeriodSheet({ ...copiedYearDraft, tab: 'range' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardYear
});
assertSingleDraftRepresentation(currentYearRangeTab, 'data-period-preset="thisYear"');

const dashboardCurrentMonth = { mode: 'month', month: currentMonth() };
const copiedCurrentMonthDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardCurrentMonth
);
const copiedCurrentMonthSheet = renderPeriodSheet(copiedCurrentMonthDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardCurrentMonth
});
assertSingleDraftRepresentation(copiedCurrentMonthSheet, 'data-period-preset="thisMonth"');
const currentMonthYearTab = renderPeriodSheet({ ...copiedCurrentMonthDraft, tab: 'year' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardCurrentMonth
});
assertSingleDraftRepresentation(currentMonthYearTab, 'data-period-current-summary');

const dashboardArbitraryMonth = { mode: 'month', month: '2024-03' };
const copiedArbitraryMonthDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardArbitraryMonth
);
for (const tab of ['range', 'year']) {
  const sheet = renderPeriodSheet({ ...copiedArbitraryMonthDraft, tab }, {
    scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardArbitraryMonth
  });
  assertSingleDraftRepresentation(sheet, 'data-period-current-summary');
  assert.match(sheet, /Selecci\u00f3n actual/);
  assert.match(sheet, /Mar 2024/);
}

const copiedRangeDraft = applyDraftPreset(
  createPeriodDraft({ mode: 'all' }, { scope: 'audit' }),
  'dashboard',
  dashboardRange
);
const copiedRangeSheet = renderPeriodSheet(copiedRangeDraft, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardRange
});
assertSingleDraftRepresentation(copiedRangeSheet, 'data-period-preset="custom"');
const copiedRangeYearTab = renderPeriodSheet({ ...copiedRangeDraft, tab: 'year' }, {
  scope: 'audit', showComparison: true, previousLabel: '', dashboardPeriod: dashboardRange
});
assertSingleDraftRepresentation(copiedRangeYearTab, 'data-period-current-summary');

function choiceMarkup(markup, attribute) {
  const match = markup.match(new RegExp(`<button[^>]*${attribute}[^>]*>[\\s\\S]*?<\\/button>`));
  assert.ok(match, `${attribute} must identify a rendered period choice`);
  return match[0];
}

function assertSelectedChoice(markup, attribute) {
  const choice = choiceMarkup(markup, attribute);
  assert.match(choice, /class="[^"]*\bselected\b/);
  assert.match(choice, /aria-pressed="true"/);
  assert.match(choice, />Seleccionado</);
}

function assertUnselectedChoice(markup, attribute) {
  const choice = choiceMarkup(markup, attribute);
  assert.doesNotMatch(choice, /class="[^"]*\bselected\b/);
  assert.match(choice, /aria-pressed="false"/);
  assert.doesNotMatch(choice, />Seleccionado</);
}

function assertCopyAction(markup) {
  const action = choiceMarkup(markup, 'data-period-copy-dashboard');
  assert.doesNotMatch(action, /class="[^"]*\bselected\b/);
  assert.doesNotMatch(action, /aria-pressed=/);
  assert.doesNotMatch(action, />Seleccionado</);
}

function assertSingleDraftRepresentation(markup, expectedAttribute) {
  const pressed = markup.match(/aria-pressed="true"/g) || [];
  const summaries = markup.match(/data-period-current-summary/g) || [];
  const selectedMarks = markup.match(/>Seleccionado</g) || [];
  assert.equal(pressed.length + summaries.length, 1, 'the draft must have exactly one accessible representation');
  assert.equal(selectedMarks.length, pressed.length, 'only the selected option may show the selected mark');
  if (expectedAttribute === 'data-period-current-summary') {
    assert.equal(pressed.length, 0, 'a fallback summary must replace, not duplicate, a selected option');
    assert.equal(summaries.length, 1);
  } else {
    assertSelectedChoice(markup, expectedAttribute);
    assert.equal(summaries.length, 0, 'a selected option must not be duplicated by a fallback summary');
  }
}
console.log('period-scope.test.mjs passed');
