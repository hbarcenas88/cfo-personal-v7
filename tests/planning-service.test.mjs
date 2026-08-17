import assert from 'node:assert/strict';
import {
  managedProvisionReserve,
  normalizeProvision,
  normalizeReleaseDate,
  provisionStatus,
  releasedProvisionAmount
} from '../src/services/planningService.js';

assert.deepEqual(
  normalizeProvision({ name: 'Viaje', balance: 50 }),
  {
    name: 'Viaje',
    balance: 50,
    monthlyAmount: 0,
    targetAmount: 0,
    releaseDate: '',
    events: []
  },
  'historical provisions must receive non-destructive planning defaults'
);

assert.equal(normalizeReleaseDate('2026-08-16'), '2026-08-16');
assert.equal(normalizeReleaseDate('2026-02-29'), '', 'impossible calendar dates must be rejected');
assert.equal(normalizeReleaseDate('2026-08-16T12:00:00'), '', 'release dates must use exact YYYY-MM-DD format');
assert.equal(normalizeReleaseDate('<img src=x onerror=alert(1)>'), '', 'markup is not a valid release date');
assert.equal(
  normalizeProvision({ name: 'Ataque', releaseDate: '<img src=x onerror=alert(1)>' }).releaseDate,
  '',
  'provision normalization must discard an invalid imported release date'
);

assert.deepEqual(
  normalizeProvision({
    id: 'viaje',
    name: 'Viaje',
    balance: '-20',
    monthlyAmount: '15',
    targetAmount: '100',
    releaseDate: '2026-12-15',
    events: [{ kind: 'release', amount: 10, date: '2026-08-01' }]
  }),
  {
    id: 'viaje',
    name: 'Viaje',
    balance: 0,
    monthlyAmount: 15,
    targetAmount: 100,
    releaseDate: '2026-12-15',
    events: [{ kind: 'release', amount: 10, date: '2026-08-01' }]
  },
  'normalization must clamp planning amounts without discarding identity or events'
);

assert.equal(provisionStatus({ balance: 20 }, '2026-08-16'), 'Sin meta');
assert.equal(provisionStatus({ balance: 20, targetAmount: 100 }, '2026-08-16'), 'En planeación');
assert.equal(provisionStatus({ balance: 100, targetAmount: 100 }, '2026-08-16'), 'Lista para liberar');
assert.equal(provisionStatus({ balance: 20, releaseDate: '2026-08-16' }, '2026-08-16'), 'Lista para liberar');
assert.equal(provisionStatus({ balance: 20, releaseDate: '2026-08-15' }, '2026-08-16'), 'Vencida');
assert.equal(provisionStatus({ balance: 0, targetAmount: 100, releaseDate: '2026-08-15' }, '2026-08-16'), 'Liberada');

assert.equal(
  managedProvisionReserve({ provisions: [{ balance: 120 }, { balance: 80 }, { balance: -40 }, { balance: 'bad' }] }),
  200,
  'managed reserve must sum only non-negative current catalog balances'
);

assert.equal(
  releasedProvisionAmount({
    provisions: [
      { events: [{ kind: 'release', amount: 120 }, { kind: 'adjustment', amount: 40 }] },
      { events: [{ kind: 'release', amount: '30' }, { kind: 'release', amount: -10 }] }
    ]
  }),
  150,
  'released amount must sum only non-negative conceptual release events'
);

assert.equal(
  releasedProvisionAmount({
    provisionEvents: [
      { provisionId: 'viaje', kind: 'release', amount: 120, date: '2026-08-16' },
      { provisionId: 'viaje', kind: 'adjustment', amount: 20, date: '2026-08-15' },
      { provisionId: 'seguro', kind: 'release', amount: 80, date: '2026-08-16' }
    ],
    provisions: []
  }),
  200,
  'canonical release events must live independently from the provision catalog'
);

assert.equal(
  releasedProvisionAmount({
    provisionEvents: [{ provisionId: 'viaje', kind: 'release', amount: 120, date: '2026-08-16' }],
    provisions: [{ id: 'legacy', events: [{ kind: 'release', amount: 50, date: '2026-08-10' }] }]
  }),
  170,
  'canonical history must also recognize unmigrated nested legacy releases'
);

const temporalReleases = {
  provisionEvents: [
    { provisionId: 'legacy', kind: 'release', amount: 25 },
    { provisionId: 'viaje', kind: 'release', amount: 120, date: '2026-08-16' }
  ],
  provisions: [{ id: 'nested', events: [{ kind: 'release', amount: 50, date: '2026-07-20' }] }]
};
assert.equal(
  releasedProvisionAmount(temporalReleases, { mode: 'month', month: '2026-07' }),
  75,
  'July must include legacy undated events and dated releases through the July cutoff only'
);
assert.equal(
  releasedProvisionAmount(temporalReleases, { mode: 'month', month: '2026-08' }),
  195,
  'August must include the release that occurred in August'
);

console.log('planning-service.test.mjs passed');
