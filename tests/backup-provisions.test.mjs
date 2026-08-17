import assert from 'node:assert/strict';
import { backupPayload } from '../src/services/backupService.js';

assert.deepEqual(
  backupPayload({
    version: '7.0.0',
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    provisions: [],
    provisionEvents: [{ provisionId: 'viaje', kind: 'release', amount: 50, date: '2026-08-16' }],
    recurring: [],
    recurringDone: {},
    rules: {},
    period: {},
    filters: {},
    healthDismissed: {}
  }).data.provisionEvents,
  [{ provisionId: 'viaje', kind: 'release', amount: 50, date: '2026-08-16' }],
  'JSON backups must preserve conceptual release history independently from the provision catalog'
);

console.log('backup-provisions.test.mjs passed');
