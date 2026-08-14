import assert from 'node:assert/strict';
import { renderCalendarSheet } from '../src/components/calendar.js';
import { todayISO } from '../src/utils/format.js';

const record = renderCalendarSheet({
  selectedDate: '2026-08-14',
  visibleMonth: '2026-08',
  context: 'record'
});

assert.ok(record.indexOf('calendar-grid') < record.indexOf('data-cal-nav="-1"'));
assert.ok(record.indexOf('data-cal-nav="1"') < record.indexOf('data-cal-quick="today"'));
assert.ok(record.indexOf('data-cal-quick="monthStart"') < record.indexOf('data-cal-confirm'));
assert.doesNotMatch(record, /Fecha seleccionada|data-cal-quick="custom"/);
assert.match(record, /data-cal-date="2026-08-14"[^>]*aria-pressed="true"[^>]*aria-label="14 de agosto de 2026"/);

const period = renderCalendarSheet({
  selectedDate: '2026-08-14',
  visibleMonth: '2026-08',
  context: 'period'
});

assert.ok(period.indexOf('quick-grid') < period.indexOf('calendar-grid'));
assert.match(period, /data-cal-quick="custom"/);

for (const markup of [record, period]) {
  assert.match(navigationButtonFor(markup, '-1'), /aria-label="Mes anterior"/);
  assert.match(navigationButtonFor(markup, '1'), /aria-label="Mes siguiente"/);
}

const selectedDay = dayButtonFor(record, '2026-08-14');
assert.match(selectedDay, /aria-pressed="true"/);
assert.match(selectedDay, /aria-label="14 de agosto de 2026"/);

const unselectedDay = dayButtonFor(record, '2026-08-15');
assert.match(unselectedDay, /aria-pressed="false"/);
assert.match(unselectedDay, /aria-label="15 de agosto de 2026"/);

const renderedToday = dayButtonFor(renderCalendarSheet({
  selectedDate: todayISO(),
  visibleMonth: todayISO().slice(0, 7),
  context: 'record'
}), todayISO());
assert.match(renderedToday, /aria-current="date"/);
assert.doesNotMatch(unselectedDay, /aria-current=/);

console.log('calendar.test.mjs passed');

function dayButtonFor(markup, iso) {
  const match = markup.match(new RegExp(`<button[^>]*data-cal-date="${iso}"[^>]*>`));
  assert.ok(match, `calendar must render ${iso}`);
  return match[0];
}

function navigationButtonFor(markup, delta) {
  const match = markup.match(new RegExp(`<button[^>]*data-cal-nav="${delta}"[^>]*>`));
  assert.ok(match, `calendar must render navigation ${delta}`);
  return match[0];
}
