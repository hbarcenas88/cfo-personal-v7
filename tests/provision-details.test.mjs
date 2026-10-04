import assert from 'node:assert/strict';
import { renderProvisionDetails, renderProvisionAmountSheet } from '../src/screens/provisionDetails.js';

const state = {
  provisions: [{ id: 'p', name: 'Seguro <A>', balance: 100, monthlyAmount: 50, targetAmount: 200 }],
  provisionEvents: [{ id: 'e', provisionId: 'p', kind: 'allocation', date: '2026-10-03', amount: 50, month: '2026-10' }],
  transactions: [{ date: '2026-10-01', provisionDelta: 150 }],
  ui: { provisionDetailsId: 'p', planningDraft: { provisionId: 'p', releaseAmount: 20 } }
};
const details = renderProvisionDetails(state);
assert.match(details, /Saldo vigente/);
assert.match(details, /Seguro &lt;A&gt;/);
assert.match(details, /data-provision-release="p"/);
assert.match(details, /data-provision-details-back/);
assert.match(details, /03\/10\/2026/);
const release = renderProvisionAmountSheet(state);
assert.match(release, /Liberar todo/);
assert.match(release, /data-planning-amount/);
assert.match(release, /Saldo resultante/);
assert.doesNotMatch(release, /<select|type="date"/);
console.log('provision-details.test.mjs passed');
