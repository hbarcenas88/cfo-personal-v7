import assert from 'node:assert/strict';
import { getProvisionPlanningStatus, provisionStatus } from '../src/services/planningService.js';
const sample = { period: { mode: 'month', month: '2025-01' }, transactions: [{ date: '2026-01-01', provisionDelta: 150 }, { date: '2027-01-01', provisionDelta: 900 }], provisions: [{ id: 'p', balance: 50, monthlyAmount: 50 }], provisionEvents: [] };
assert.equal(getProvisionPlanningStatus(sample, 'p', '2026-10-03').unassigned, 100);
assert.equal(getProvisionPlanningStatus(sample, 'p', '2026-10-03').canApply, true);
sample.provisionEvents = [{ kind: 'allocation', provisionId: 'p', month: '2026-10' }];
assert.equal(getProvisionPlanningStatus(sample, 'p', '2026-10-03').alreadyApplied, true);
assert.equal(getProvisionPlanningStatus(sample, 'p', '2026-10-03').canApply, false);
assert.equal(getProvisionPlanningStatus(sample, 'p', '2026-11-03').canApply, true);
assert.equal(provisionStatus({ balance: 0, monthlyAmount: 50 }), 'Sin saldo');
assert.equal(provisionStatus({ balance: 0, events: [{ kind: 'release' }] }), 'Liberada');
console.log('provision-planning-service.test.mjs passed');

for (const monthlyAmount of ['0.005', '1oops', '1.999', 'Infinity']) { const invalid = { ...sample, provisionEvents: [], provisions: [{ id: 'p', balance: 50, monthlyAmount }] }; assert.equal(getProvisionPlanningStatus(invalid, 'p', '2026-10-03').canApply, false, monthlyAmount); }

assert.equal(getProvisionPlanningStatus({ ...sample, provisionEvents: [], provisions: [{ id: 'p', balance: 50, monthlyAmount: '0,50' }] }, 'p', '2026-10-03').canApply, true);
assert.equal(getProvisionPlanningStatus({ ...sample, provisionEvents: [], transactions: [{ date: '2026-01-01', provisionDelta: 150.005 }] }, 'p', '2026-10-03').canApply, false);
