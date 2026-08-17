import assert from 'node:assert/strict';
import { capacitySummary, provisionReserve } from '../src/services/financeService.js';
import { managedProvisionReserve } from '../src/services/planningService.js';

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

globalThis.indexedDB = new MemoryIndexedDB();
globalThis.window = {
  clearTimeout: () => {},
  setTimeout: () => 0,
  dispatchEvent: () => {}
};

const stateModule = await import('../src/state.js');

await stateModule.initState();
stateModule.state.period = { mode: 'month', month: '2026-08' };
stateModule.state.accounts = [{ id: 'bac', name: 'BAC', kpi: { available: true } }];
stateModule.state.transactions = [
  {
    id: 'income',
    account: 'BAC',
    date: '2026-08-01',
    movement: 'Ingreso',
    amount: 1000,
    affectsBalance: true,
    affectsIncome: true,
    affectsExpense: false,
    affectsBudget: false
  },
  {
    id: 'historical-provision-movement',
    account: 'BAC',
    date: '2026-08-02',
    movement: 'Provisión',
    amount: 200,
    provisionDelta: 200,
    affectsBalance: false,
    affectsIncome: false,
    affectsExpense: false,
    affectsBudget: false
  }
];
stateModule.state.budgets = [];
stateModule.state.provisions = [
  { id: 'vacaciones', name: 'Vacaciones', balance: 120, monthlyAmount: 20, events: [] },
  { id: 'seguro', name: 'Seguro', balance: 80, monthlyAmount: 10, events: [] }
];
stateModule.state.capacityRules = {
  accountRoles: { bac: 'liquidity' },
  provisionIds: ['vacaciones', 'seguro']
};

const financialBeforeRelease = immutableFinancialSnapshot(stateModule.state);
const capacityBeforeRelease = capacitySummary(stateModule.state);
assert.equal(capacityBeforeRelease.selectedProvisions, 200);
assert.equal(capacityBeforeRelease.liquidityUsable, 800);
assert.equal(provisionReserve(stateModule.state), 200);

assert.equal(await stateModule.releaseProvision('vacaciones', { date: '2026-08-16' }), true);
assert.equal(stateModule.state.provisions[0].balance, 0, 'release must leave the provision balance at zero');
assert.deepEqual(
  stateModule.state.provisionEvents,
  [{ provisionId: 'vacaciones', kind: 'release', amount: 120, date: '2026-08-16' }],
  'release must append a traceable conceptual event outside the catalog'
);
assert.deepEqual(stateModule.state.provisions[0].events, [], 'new releases must not be stored inside deletable catalog rows');
assert.deepEqual(
  immutableFinancialSnapshot(stateModule.state),
  financialBeforeRelease,
  'release must not mutate accounts, transactions, budgets or financial rules'
);
assert.equal(managedProvisionReserve(stateModule.state), 80);
assert.equal(provisionReserve(stateModule.state), 80, 'conceptual release must reduce the accumulated provision reserve');
assert.equal(capacitySummary(stateModule.state).selectedProvisions, 80);
assert.equal(capacitySummary(stateModule.state).liquidityUsable, 920);
assert.equal(stateModule.state.accounts[0].name, 'BAC');
assert.equal(stateModule.state.transactions.length, 2);
assert.equal(stateModule.state.transactions[1].provisionId || '', '', 'historical provision movements must remain unlinked');

await stateModule.undo();
assert.equal(stateModule.state.provisions[0].balance, 120, 'undo must restore the released conceptual balance');
assert.deepEqual(stateModule.state.provisionEvents, [], 'undo must remove the conceptual release event');
assert.equal(provisionReserve(stateModule.state), 200);
assert.equal(capacitySummary(stateModule.state).selectedProvisions, 200);
assert.equal(await stateModule.releaseProvision('vacaciones', { date: '2026-08-16' }), true);

const eventsAfterRelease = structuredClone(stateModule.state.provisionEvents);
assert.equal(await stateModule.releaseProvision('vacaciones', { date: '2026-08-17' }), false);
assert.deepEqual(stateModule.state.provisionEvents, eventsAfterRelease, 'zero-balance releases must not add events');
assert.match(stateModule.state.ui.toast.message, /saldo/i);

assert.equal(await stateModule.releaseProvision('missing', { date: '2026-08-17' }), false);
assert.match(stateModule.state.ui.toast.message, /no existe/i);

assert.equal(await stateModule.deleteProvision('seguro'), false);
assert.equal(stateModule.state.provisions.some(provision => provision.id === 'seguro'), true);
assert.match(stateModule.state.ui.toast.message, /liberar|saldo/i);

const immutableBeforeUpdate = immutableFinancialSnapshot(stateModule.state);
assert.equal(await stateModule.updateProvision('seguro', {
  name: 'Seguro anual',
  balance: 0,
  monthlyAmount: 15,
  targetAmount: 180,
  releaseDate: '2026-12-01'
}), true);
assert.deepEqual(
  {
    name: stateModule.state.provisions[1].name,
    balance: stateModule.state.provisions[1].balance,
    monthlyAmount: stateModule.state.provisions[1].monthlyAmount,
    targetAmount: stateModule.state.provisions[1].targetAmount,
    releaseDate: stateModule.state.provisions[1].releaseDate,
    events: stateModule.state.provisions[1].events
  },
  {
    name: 'Seguro anual',
    balance: 0,
    monthlyAmount: 15,
    targetAmount: 180,
    releaseDate: '2026-12-01',
    events: []
  },
  'editing must preserve conceptual history while updating planning fields'
);
assert.deepEqual(immutableFinancialSnapshot(stateModule.state), immutableBeforeUpdate);

await stateModule.undo();
assert.equal(stateModule.state.provisions.find(provision => provision.id === 'vacaciones').balance, 0, 'undoing an edit must not undo an earlier release');
assert.deepEqual(
  {
    name: stateModule.state.provisions.find(provision => provision.id === 'seguro').name,
    balance: stateModule.state.provisions.find(provision => provision.id === 'seguro').balance,
    monthlyAmount: stateModule.state.provisions.find(provision => provision.id === 'seguro').monthlyAmount,
    targetAmount: stateModule.state.provisions.find(provision => provision.id === 'seguro').targetAmount,
    releaseDate: stateModule.state.provisions.find(provision => provision.id === 'seguro').releaseDate
  },
  { name: 'Seguro', balance: 80, monthlyAmount: 10, targetAmount: 0, releaseDate: '' },
  'undo must restore the provision values from before an edit'
);
assert.equal(await stateModule.updateProvision('seguro', {
  name: 'Seguro anual',
  balance: 0,
  monthlyAmount: 15,
  targetAmount: 180,
  releaseDate: '2026-12-01'
}), true);

assert.equal(await stateModule.deleteProvision('seguro'), true);
assert.equal(stateModule.state.provisions.some(provision => provision.id === 'seguro'), false);
assert.deepEqual(stateModule.state.capacityRules.provisionIds, ['vacaciones']);
assert.deepEqual(immutableFinancialSnapshot(stateModule.state), immutableBeforeUpdate);

await stateModule.undo();
assert.equal(stateModule.state.provisions.find(provision => provision.id === 'seguro').balance, 0, 'undo must restore the deleted zero-balance provision');
assert.deepEqual(stateModule.state.capacityRules.provisionIds, ['vacaciones', 'seguro']);

assert.equal(await stateModule.updateProvision('missing', { name: 'Nada' }), false);
assert.match(stateModule.state.ui.toast.message, /no existe/i);
assert.equal(await stateModule.deleteProvision('missing'), false);
assert.match(stateModule.state.ui.toast.message, /no existe/i);

assert.equal(await stateModule.deleteProvision('vacaciones'), true);
assert.equal(stateModule.state.provisions.some(provision => provision.id === 'vacaciones'), false);
assert.deepEqual(
  stateModule.state.provisionEvents,
  [{ provisionId: 'vacaciones', kind: 'release', amount: 120, date: '2026-08-16' }],
  'deleting a released provision must preserve its conceptual release history'
);
assert.equal(provisionReserve(stateModule.state), 80, 'deleting a released provision must not reactivate its reserve');
assert.equal(stateModule.state.transactions.length, 2);

stateModule.state.provisions = [{
  id: 'legacy',
  name: 'Provisión histórica',
  balance: 0,
  events: [{ kind: 'release', amount: 50, date: '2026-08-10' }]
}];
stateModule.state.provisionEvents = [
  { provisionId: 'archived', kind: 'release', amount: 25, date: '2026-08-09' }
];
await stateModule.mutate(() => {});
stateModule.state.provisions = [];
await stateModule.initState();
assert.deepEqual(
  stateModule.state.provisionEvents,
  [
    { provisionId: 'archived', kind: 'release', amount: 25, date: '2026-08-09' },
    { provisionId: 'legacy', kind: 'release', amount: 50, date: '2026-08-10' }
  ],
  'loading legacy nested release events must migrate them to persistent history'
);
assert.deepEqual(stateModule.state.provisions[0].events, [], 'migrated releases must leave the catalog row');
assert.equal(provisionReserve(stateModule.state), 125);

console.log('planning-state.test.mjs passed');

function immutableFinancialSnapshot(currentState) {
  return structuredClone({
    accounts: currentState.accounts,
    transactions: currentState.transactions.map(({ updatedAt, ...transaction }) => transaction),
    budgets: currentState.budgets,
    rules: currentState.rules
  });
}
