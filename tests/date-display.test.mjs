import assert from 'node:assert/strict';
import { formatDate, monthLabel, periodLabel, parseDate, todayISO, monthEnd, previousEquivalentPeriod } from '../src/utils/format.js';
import { renderCalendarSheet } from '../src/components/calendar.js';
import { renderRecordRoot } from '../src/screens/recordFlow.js';

assert.equal(formatDate('2026-10-03'), '03/10/2026');
assert.equal(formatDate('2026-10-03', true), '03/10/2026');
assert.equal(formatDate('invalid'), 'Sin fecha');
assert.equal(monthLabel('2026-10'), 'Octubre 2026');
assert.equal(periodLabel({ mode: 'range', from: '2026-10-01', to: '2026-10-03' }), '01/10/2026 - 03/10/2026');
assert.equal(parseDate('03/10/2026'), '2026-10-03');

const record = renderRecordRoot({
  ui: { recordFlow: { step: 'form', type: 'expense', date: '2026-10-03', amount: 0 } },
  accounts: [], categories: [], provisions: []
});
assert.match(record, /<small>Fecha<\/small><strong>03\/10\/2026<\/strong>/);
assert.doesNotMatch(record, /<strong>2026-10-03<\/strong>/);

// Simulate the app's wall clock near midnight; UTC would choose the following day in Panama.
const NativeDate = Date;
const originalZone = process.env.TZ;
try {
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-04T02:00:00Z'])); }
  };
  for (const [zone, expectedDay] of [['America/Panama', '2026-10-03'], ['Pacific/Kiritimati', '2026-10-04']]) {
    process.env.TZ = zone;
    assert.equal(todayISO(), expectedDay, zone);
    assert.equal(monthEnd('2026-10'), '2026-10-31', zone);
    assert.equal(parseDate('2026-10-03'), '2026-10-03', zone);
    assert.deepEqual(previousEquivalentPeriod({ mode: 'range', from: '2026-10-01', to: '2026-10-03' }),
      { from: '2026-09-28', to: '2026-09-30' }, zone);
    const calendar = renderCalendarSheet({ selectedDate: '2026-10-03', visibleMonth: '2026-10' });
    assert.match(calendar, /data-cal-date="2026-10-03"[^>]*aria-pressed="true"[^>]*>3<\/button>/);
    assert.match(calendar, /03\/10\/2026/);
  }
} finally {
  globalThis.Date = NativeDate;
  if (originalZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalZone;
}
console.log('date-display.test.mjs passed');
