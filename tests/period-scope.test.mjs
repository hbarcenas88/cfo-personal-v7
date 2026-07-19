import assert from 'node:assert/strict';
import {
  applyDraftPreset,
  comparisonPeriod,
  createPeriodDraft,
  isComparisonAvailable,
  migrateAuditPeriod,
  shiftPeriod,
  validatePeriodDraft
} from '../src/services/periodService.js';

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
console.log('period-scope.test.mjs passed');
