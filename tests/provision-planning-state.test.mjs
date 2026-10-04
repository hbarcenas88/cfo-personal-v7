import assert from 'node:assert/strict';
import { buildAuditComparison, capacitySummary, provisionReserve } from '../src/services/financeService.js';
import { getProvisionPlanningStatus, managedProvisionReserve } from '../src/services/planningService.js';

class MemoryIndexedDB {
  constructor() {
    this.records = new Map();
    this.created = false;
  }

  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = this.database();
      if (!this.created) {
        this.created = true;
        request.onupgradeneeded?.();
      }
      request.onsuccess?.();
    });
    return request;
  }

  database() {
    return {
      objectStoreNames: { contains: () => this.created },
      createObjectStore: () => {},
      transaction: () => this.transaction()
    };
  }

  transaction() {
    const transaction = {
      objectStore: () => ({
        get: key => {
          const request = {};
          queueMicrotask(() => {
            request.result = structuredClone(this.records.get(key));
            request.onsuccess?.();
          });
          return request;
        },
        put: record => {
          if (this.failWrite) { transaction.error = new Error('quota'); queueMicrotask(() => transaction.onerror?.()); return; }
          this.records.set(record.key, structuredClone(record));
          queueMicrotask(() => transaction.oncomplete?.());
        },
        clear: () => {
          this.records.clear();
          queueMicrotask(() => transaction.oncomplete?.());
        }
      })
    };
    return transaction;
  }
}

const memory = new MemoryIndexedDB();
globalThis.indexedDB = memory;
globalThis.window = {
  clearTimeout: () => {},
  setTimeout: () => 0,
  dispatchEvent: () => {}
};

const stateModule = await import('../src/state.js');


await stateModule.initState();
stateModule.state.period = { mode: 'month', month: '2020-01' };
stateModule.state.transactions = [{ id: 'reserve', date: '2020-01-01', movement: 'Provisi�n', provisionDelta: 150, amount: 150, affectsBalance: false, affectsIncome: false, affectsExpense: false, affectsBudget: false }];
stateModule.state.provisions = [{ id: 'p', name: 'Viaje', balance: 50, monthlyAmount: 50, events: [] }];
const financialBefore = structuredClone({ accounts: stateModule.state.accounts, transactions: stateModule.state.transactions, budgets: stateModule.state.budgets });
assert.deepEqual(await Promise.all([stateModule.applyProvisionPlanning('p'), stateModule.applyProvisionPlanning('p')]), [true, false]);
assert.equal(stateModule.state.provisions[0].balance, 100);
assert.equal(stateModule.state.provisionEvents.length, 1);
assert.equal(provisionReserve(stateModule.state, { mode: 'all' }), 150);
assert.equal(stateModule.state.provisionEvents[0].month, new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
assert.deepEqual({ accounts: stateModule.state.accounts, transactions: stateModule.state.transactions, budgets: stateModule.state.budgets }, financialBefore);
const { backupPayload } = await import('../src/services/backupService.js');
const backup = backupPayload(stateModule.state);
assert.equal(backup.data.provisionEvents[0].kind, 'allocation');
assert.deepEqual(backup.data.capacityRules, stateModule.state.capacityRules);
await stateModule.initState();
assert.equal(await stateModule.applyProvisionPlanning('p'), false);
stateModule.state.provisions[0].monthlyAmount = 20;
assert.equal(await stateModule.applyProvisionPlanning('p'), false);
await stateModule.restoreSnapshot(backup.data);
assert.equal(await stateModule.applyProvisionPlanning('p'), false);
assert.equal(await stateModule.releaseProvision('p', { amount: 20 }), true);
assert.equal(stateModule.state.provisions[0].balance, 80);
assert.equal(provisionReserve(stateModule.state, { mode: 'all' }), 130);
assert.equal(await stateModule.releaseProvision('p', { amount: 10 }), true);
const releases = stateModule.state.provisionEvents.filter(event => event.kind === 'release');
assert.notEqual(releases[0].id, releases[1].id);
assert.equal(releases[0].provisionName, 'Viaje');
const comparison = buildAuditComparison(stateModule.state, { mode: 'all' }, {});
assert.equal(comparison.currentTotal, 0);
assert.equal(comparison.currentRows.filter(row => row.kind === 'provision-release').length, 2);
assert.equal(new Set(comparison.currentRows.filter(row => row.kind === 'provision-release').map(row => row.id)).size, 2);
assert.equal(await stateModule.releaseProvision('p', { amount: 71 }), false);
assert.equal(await stateModule.releaseProvision('p', { amount: 0 }), false);
assert.equal(await stateModule.releaseProvision('p', { amount: 'NaN' }), false);
for (const amount of ['0.005', '1oops', '1.999', '-1', 'Infinity']) assert.equal(await stateModule.releaseProvision('p', { amount }), false, amount);
await stateModule.undo();
assert.equal(stateModule.state.provisions[0].balance, 80);
assert.equal(stateModule.state.provisionEvents.filter(event => event.kind === 'release').length, 1);
const stable = structuredClone(stateModule.state.provisions);
const stableEvents = structuredClone(stateModule.state.provisionEvents);
memory.failWrite = true;
assert.equal(await stateModule.releaseProvision('p', { amount: 1 }), false);
assert.deepEqual(stateModule.state.provisions, stable);
assert.deepEqual(stateModule.state.provisionEvents, stableEvents);
memory.failWrite = false;
stateModule.state.provisions[0].balance = 50;
stateModule.state.provisionEvents = [];
stateModule.state.transactions[0].provisionDelta = 80;
assert.equal(getProvisionPlanningStatus(stateModule.state, 'p').shortfall, 20);
assert.equal(await stateModule.applyProvisionPlanning('p'), false);
stateModule.state.transactions[0].provisionDelta = 150;
memory.failWrite = true;
assert.equal(await stateModule.applyProvisionPlanning('p'), false);
assert.equal(stateModule.state.provisions[0].balance, 50);
assert.equal(stateModule.state.provisionEvents.length, 0);
memory.failWrite = false;
assert.equal(await stateModule.applyProvisionPlanning('p'), true);
await stateModule.undo();
assert.equal(stateModule.state.provisions[0].balance, 50);
assert.equal(stateModule.state.provisionEvents.length, 0);
assert.equal(await stateModule.applyProvisionPlanning('p'), true);
const beforeFailedRestore = structuredClone(stateModule.state.provisions);
const beforeFailedEvents = structuredClone(stateModule.state.provisionEvents);
memory.failWrite = true;
assert.equal(await stateModule.restoreSnapshot({ provisions: [], provisionEvents: [] }), false);
assert.deepEqual(stateModule.state.provisions, beforeFailedRestore);
assert.deepEqual(stateModule.state.provisionEvents, beforeFailedEvents);
assert.equal(await stateModule.undo(), false);
assert.deepEqual(stateModule.state.provisions, beforeFailedRestore);
assert.ok(stateModule.state.ui.undo?.before);
memory.failWrite = false;
assert.equal(await stateModule.undo(), true);
assert.equal(stateModule.state.provisions[0].balance, 50);
const apply = stateModule.applyProvisionPlanning('p');
assert.equal(await stateModule.undo(), false, 'Undo cannot race an application');
assert.equal(await stateModule.restoreSnapshot({ provisions: [] }), false, 'Restore cannot race an application');
assert.equal(await apply, true);
console.log('provision-planning-state.test.mjs passed');
