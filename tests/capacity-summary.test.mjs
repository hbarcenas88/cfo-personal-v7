import assert from 'node:assert/strict';
import {
  budgetSummary,
  capacitySummary,
  dailyBudgetPace,
  operationalBudgetTotal,
  operationalCategoryRows,
  operationalCategoryDistribution
} from '../src/services/financeService.js';
import { migrateCapacityRules } from '../src/state.js';

const state = {
  period: { mode: 'month', month: '2026-07' },
  accounts: [
    { id: 'cash', name: 'Caja', kpi: { available: true } },
    { id: 'credit', name: 'Tarjeta', kpi: { available: false } },
    { id: 'excluded', name: 'Inversión', kpi: { available: true } }
  ],
  categories: [
    { name: 'Comida', icon: 'utensils', color: '#0A8FE8', subcategories: [] },
    { name: 'Hogar', icon: 'house', color: '#07966F', subcategories: [] }
  ],
  provisions: [
    { id: 'reserve-1', name: 'Seguro', balance: 400 },
    { id: 'reserve-2', name: 'Viaje', balance: 250 }
  ],
  capacityRules: {
    accountRoles: { cash: 'liquidity', credit: 'debt', excluded: 'exclude' },
    provisionIds: ['reserve-1']
  },
  budgets: [
    { id: 'food-budget', month: '2026-07', category: 'Comida', amount: 1000 },
    { id: 'home-budget', month: '2026-07', category: 'Hogar', amount: 500 }
  ],
  transactions: [
    { id: 'income', date: '2026-07-01', account: 'Caja', movement: 'Ingreso', amount: 5000 },
    { id: 'food', date: '2026-07-02', account: 'Caja', movement: 'Gasto', category: 'Comida', amount: 200 },
    { id: 'extraordinary', date: '2026-07-03', account: 'Caja', movement: 'Gasto', category: 'Comida', amount: 100, isExtraordinary: true },
    { id: 'credit-debt', date: '2026-07-04', account: 'Tarjeta', movement: 'Gasto', category: 'Hogar', amount: 300, affectsBudget: false, affectsExpense: false },
    { id: 'investment-income', date: '2026-07-05', account: 'Inversión', movement: 'Ingreso', amount: 900 }
  ]
};

const capacity = capacitySummary(state);
assert.equal(capacity.liquidity, 4700);
assert.equal(capacity.selectedProvisions, 400);
assert.equal(capacity.liquidityUsable, 4300);
assert.equal(capacity.planRemaining, 1200);
assert.equal(capacity.debt, 300);
assert.equal(capacity.projectedBalance, 2800);

const budget = budgetSummary(state);
assert.equal(budget.spent, 300);
assert.equal(budget.pending, 1200);

const operationalRows = operationalCategoryRows(state);
assert.deepEqual(operationalRows.map(row => [row.name, row.spent]), [['Comida', 200]]);

const pace = dailyBudgetPace(state);
assert.equal(pace[1].actual, 200);
assert.equal(pace[2].actual, 200);
assert.ok(Math.abs(pace[2].expected - (1500 / 31 * 3)) < 0.000001);

const paceWithoutFood = dailyBudgetPace(state, state.period, { excludedCategories: ['Comida'] });
assert.equal(paceWithoutFood.at(-1).actual, 0);
assert.equal(operationalBudgetTotal(state, state.period, { excludedCategories: ['Comida'] }), 500);
assert.ok(Math.abs(paceWithoutFood[2].expected - (500 / 31 * 3)) < 0.000001);

const distributionState = {
  ...state,
  transactions: [
    ...state.transactions,
    { id: 'grocery', date: '2026-07-06', account: 'Caja', movement: 'Gasto', category: 'Hogar', amount: 50 }
  ]
};
const distribution = operationalCategoryDistribution(distributionState, state.period, {
  excludedCategories: []
});
assert.deepEqual(distribution.map(row => [row.name, row.spent, row.share]), [
  ['Comida', 200, 0.8],
  ['Hogar', 50, 0.2]
]);
assert.deepEqual(
  operationalCategoryDistribution(distributionState, state.period, {
    excludedCategories: ['Comida']
  }).map(row => [row.name, row.share]),
  [['Hogar', 1]]
);

const migratedRules = migrateCapacityRules(null, state.accounts, state.provisions);
assert.deepEqual(migratedRules.accountRoles, { cash: 'liquidity', credit: 'exclude', excluded: 'liquidity' });
assert.deepEqual(migratedRules.provisionIds, ['reserve-1', 'reserve-2']);
assert.deepEqual(
  migrateCapacityRules({ provisionIds: ['reserve-1', 'removed'] }, state.accounts, state.provisions).provisionIds,
  ['reserve-1']
);

console.log('capacity-summary.test.mjs passed');
