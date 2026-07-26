import assert from 'node:assert/strict';

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
      objectStoreNames: {
        contains: () => this.created
      },
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
stateModule.state.accounts = [{ id: 'account-1', name: 'Cuenta sintética' }];
stateModule.state.transactions = [{
  id: 'transaction-1',
  account: 'Cuenta sintética',
  date: '2026-07-19',
  movement: 'Gasto',
  amount: 18,
  description: 'Compra sintética',
  affectsBalance: true
}];
stateModule.state.budgets = [{ id: 'budget-1', month: '2026-07', amount: 100 }];
stateModule.state.provisions = [{ id: 'provision-1', name: 'Reserva sintética', balance: 25 }];
const financialBefore = financialSnapshot(stateModule.state);
const statementRows = [{
  id: 'statement-2',
  sourceRow: 2,
  date: '2026-07-19',
  signedAmount: -18,
  description: 'Compra sintética'
}];
const close = {
  id: 'close-state-1',
  accountName: 'Cuenta sintética',
  cutoffDate: '2026-07-19',
  realBalance: -18,
  range: { from: '2026-07-01', to: '2026-07-19' },
  statementRows,
  decisions: [],
  createdAt: '2026-07-19T12:00:00.000Z',
  updatedAt: '2026-07-19T12:00:00.000Z'
};

assert.equal(await stateModule.createAuditClose(close), true);
assert.equal(stateModule.state.auditClosures.length, 1);
assert.deepEqual(financialSnapshot(stateModule.state), financialBefore);

assert.equal(await stateModule.createAuditClose({
  ...close,
  id: 'close-state-duplicate',
  statementRows: [...statementRows].reverse()
}), false);
assert.equal(stateModule.state.auditClosures.length, 1);
assert.match(stateModule.state.ui.toast.message, /ya está asociado/);
assert.deepEqual(financialSnapshot(stateModule.state), financialBefore);

stateModule.state.auditClosures = [];
await stateModule.initState();
assert.equal(stateModule.state.auditClosures.length, 1);
assert.equal(stateModule.state.auditClosures[0].id, close.id);
const persistedFinancial = financialSnapshot(stateModule.state);
assert.equal(persistedFinancial.transactions[0].id, financialBefore.transactions[0].id);
assert.equal(persistedFinancial.transactions[0].amount, financialBefore.transactions[0].amount);
assert.equal(persistedFinancial.budgets[0].amount, financialBefore.budgets[0].amount);
assert.equal(persistedFinancial.provisions[0].balance, financialBefore.provisions[0].balance);

await stateModule.saveAuditCloseDecision(close.id, {
  id: 'decision-state-1',
  statementRowId: 'statement-2',
  transactionId: 'transaction-1',
  status: 'confirmed',
  createdAt: '2026-07-19T12:05:00.000Z'
});
assert.equal(stateModule.state.auditClosures[0].decisions.length, 1);
assert.deepEqual(financialSnapshot(stateModule.state), persistedFinancial);

stateModule.state.auditClosures[0].decisions = [];
await stateModule.initState();
assert.equal(stateModule.state.auditClosures[0].decisions.length, 1);
assert.equal(stateModule.state.auditClosures[0].decisions[0].status, 'confirmed');
assert.deepEqual(financialSnapshot(stateModule.state), persistedFinancial);

await stateModule.deleteAuditClose(close.id);
assert.equal(stateModule.state.auditClosures.length, 0);
assert.deepEqual(financialSnapshot(stateModule.state), persistedFinancial);

stateModule.state.auditClosures.push(close);
await stateModule.initState();
assert.equal(stateModule.state.auditClosures.length, 0);
assert.deepEqual(financialSnapshot(stateModule.state), persistedFinancial);

console.log('guided-audit-state.test.mjs passed');

function financialSnapshot(currentState) {
  return structuredClone({
    accounts: currentState.accounts,
    transactions: currentState.transactions.map(({ updatedAt, ...transaction }) => transaction),
    budgets: currentState.budgets,
    provisions: currentState.provisions,
    rules: currentState.rules
  });
}
