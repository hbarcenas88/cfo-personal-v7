import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderDrawer } from '../src/components/ui.js';
import {
  renderBudgetSheet,
  renderProvisionSheet,
  renderSettings,
  selectPlanningBudgetPeriod
} from '../src/screens/settings.js';

const state = {
  settingsPage: 'planning',
  period: { mode: 'month', month: '2026-07' },
  budgets: [
    {
      id: 'budget-food',
      month: '2026-07',
      category: 'Comida',
      subcategory: 'Supermercado',
      amount: 300,
      account: 'BAC'
    },
    {
      id: 'budget-rent',
      month: '2026-08',
      category: 'Vivienda',
      subcategory: 'Alquiler',
      amount: 900,
      account: 'BAC'
    }
  ],
  accounts: [],
  categories: [],
  provisions: [{
    id: 'provision-vacation',
    name: 'Vacaciones',
    balance: 120,
    monthlyAmount: 20,
    targetAmount: 600,
    releaseDate: '2026-12-15'
  }],
  recurring: [],
  ui: { activeSheet: '', drawerOpen: false, planningDraft: null, planningBudgetPeriod: '2026-07' }
};

const planning = renderSettings(state);
assert.match(planning, /data-planning-type="budgets"/);
assert.match(planning, /data-planning-type="provisions"/);
assert.match(planning, /data-planning-type="recurring"/);
assert.doesNotMatch(planning, /data-planning-section=/,
  'the Planning hub must not stack any full manager');
assert.doesNotMatch(planning, /data-budget-period=/,
  'the Planning hub must not render a manager filter');
assert.doesNotMatch(planning, /<select/);
assert.match(planning, /class="chip dense planning-back-action" data-settings-back/,
  'the Planning hub Menu action must preserve the same 44px navigation target');

const budgetType = renderSettings({
  ...state,
  ui: { ...state.ui, planningView: 'budgets', planningType: 'budgets' }
});
assert.match(budgetType, /data-planning-manager="budgets"[^>]*>[\s\S]*?Ver lo planeado/);
assert.match(budgetType, /data-tool="planning-budgets"[^>]*>[\s\S]*?Crear nuevo/);
assert.match(budgetType, /data-planning-back="budgets"[^>]*>[\s\S]*?Volver/);
assert.match(budgetType, /class="chip dense planning-back-action"/,
  'nested Planning navigation must use the 44px back target variant');
assert.doesNotMatch(budgetType, /data-settings-back/);
assert.doesNotMatch(budgetType, /data-planning-section=/,
  'a Planning type view must show decisions, not its full manager');

const budgetManager = renderSettings({
  ...state,
  ui: { ...state.ui, planningView: 'manager', planningType: 'budgets' }
});
assert.match(budgetManager, /data-planning-section="budgets"/);
assert.match(budgetManager, /data-planning-back="manager"/);
assert.doesNotMatch(budgetManager, /data-planning-section="provisions"|data-planning-section="recurring"/,
  'the budget manager must not render either sibling manager');
assert.match(budgetManager, /data-tool="planning-budgets"[^>]*>[\s\S]*?Crear/,
  'the manager must keep creation visible');
assert.match(budgetManager, /data-budget-period="2026-07"/);
assert.match(budgetManager, /data-budget-period="2026-08"/);
assert.match(budgetManager, /data-budget-edit="budget-food"/);
assert.doesNotMatch(budgetManager, /data-budget-edit="budget-rent"/,
  'the July budget list must not render August entries');

assert.equal(selectPlanningBudgetPeriod(state, '2026-08'), true);
const augustPlanning = renderSettings({
  ...state,
  ui: { ...state.ui, planningView: 'manager', planningType: 'budgets' }
});
assert.equal(state.ui.planningBudgetPeriod, '2026-08');
assert.match(augustPlanning, /data-budget-edit="budget-rent"/);
assert.doesNotMatch(augustPlanning, /data-budget-edit="budget-food"/,
  'changing the monthly filter must replace the visible budget rows');
assert.equal(selectPlanningBudgetPeriod(state, 'not-a-month'), false);

const provisionState = {
  ...state,
  provisions: [
    state.provisions[0],
    { id: 'released', name: 'Seguro', balance: 0, monthlyAmount: 10, targetAmount: 0, releaseDate: '' }
  ],
  ui: {
    ...state.ui,
    planningView: 'manager',
    planningType: 'provisions',
    planningProvisionFilter: 'active'
  }
};
const activeProvisions = renderSettings(provisionState);
assert.match(activeProvisions, /data-planning-provision-filter="active"[^>]*aria-pressed="true"/);
assert.match(activeProvisions, /data-planning-provision-filter="released"/);
assert.match(activeProvisions, /data-planning-provision-filter="all"/);
assert.match(activeProvisions, /data-tool="planning-provisions"[^>]*>[\s\S]*?Crear/);
assert.match(activeProvisions, /data-provision-edit="provision-vacation"/);
assert.doesNotMatch(activeProvisions, /data-provision-edit="released"/);
assert.match(activeProvisions, /Meta \$600\.00/);
assert.match(activeProvisions, /15 Diciembre 2026/,
  'a saved release date must be rendered for people, not as an ISO storage value');
assert.doesNotMatch(activeProvisions, /2026-12-15/);
assert.doesNotMatch(activeProvisions, /Meta opcional sin definir|Fecha opcional sin definir/);
assert.doesNotMatch(activeProvisions, /data-budget-period=/,
  'provision filtering must not invent a monthly scope');

const releasedProvisions = renderSettings({
  ...provisionState,
  ui: { ...provisionState.ui, planningProvisionFilter: 'released' }
});
assert.match(releasedProvisions, /data-provision-edit="released"/);
assert.doesNotMatch(releasedProvisions, /data-provision-edit="provision-vacation"/);
assert.doesNotMatch(releasedProvisions, /Meta \$|Liberación /,
  'missing goal and release date must not produce placeholder metadata');

const allProvisions = renderSettings({
  ...provisionState,
  ui: { ...provisionState.ui, planningProvisionFilter: 'all' }
});
assert.match(allProvisions, /data-provision-edit="released"/);
assert.match(allProvisions, /data-provision-edit="provision-vacation"/);

const recurringState = {
  ...state,
  recurring: [
    { id: 'rent', name: 'Alquiler', type: 'Pago', day: 1, amount: 900 },
    { id: 'salary', name: 'Salario', type: 'Ingreso', day: 15, amount: 2000 }
  ],
  recurringDone: { '2026-07': { rent: true } },
  ui: {
    ...state.ui,
    planningView: 'manager',
    planningType: 'recurring',
    planningRecurringFilter: 'current'
  }
};
const currentRecurring = renderSettings(recurringState);
assert.match(currentRecurring, /data-tool="recurring"[^>]*>[\s\S]*?Crear/);
assert.match(currentRecurring, /data-planning-recurring-filter="current"[^>]*aria-pressed="true"/);
assert.match(currentRecurring, /data-planning-recurring-filter="completed"/);
assert.match(currentRecurring, /data-recurring-item="salary"/);
assert.doesNotMatch(currentRecurring, /data-recurring-item="rent"/);

const completedRecurring = renderSettings({
  ...recurringState,
  ui: { ...recurringState.ui, planningRecurringFilter: 'completed' }
});
assert.match(completedRecurring, /data-recurring-item="rent"/);
assert.doesNotMatch(completedRecurring, /data-recurring-item="salary"/);
assert.match(completedRecurring, /Completo/);
assert.doesNotMatch(completedRecurring, /<select/);
assert.doesNotMatch(renderDrawer(), /data-settings="provisions-admin"/);
assert.doesNotMatch(renderSettings({ ...state, settingsPage: 'catalogs' }), /provisions-admin/);
assert.doesNotMatch(
  renderSettings({ ...state, settingsPage: 'provisions-admin' }),
  /<h2>Provisiones<\/h2>/,
  'the removed legacy route must not retain its unreachable title'
);

const maliciousPlanning = renderSettings({
  ...state,
  ui: { ...state.ui, planningView: 'manager', planningType: 'provisions' },
  provisions: [{
    ...state.provisions[0],
    releaseDate: '<img src=x onerror=alert(1)>'
  }]
});
assert.doesNotMatch(maliciousPlanning, /<img src=x onerror=alert\(1\)>/,
  'an untrusted release date must never enter rendered markup');
assert.doesNotMatch(maliciousPlanning, /&lt;img src=x onerror=alert\(1\)&gt;/,
  'an invalid release date must be omitted instead of presented as metadata');

const provisionSheet = renderProvisionSheet({
  ...state,
  ui: { ...state.ui, activeSheet: 'confirm-release-provision', planningDraft: { provisionId: 'provision-vacation' } }
});
assert.match(provisionSheet, /No modifica ninguna cuenta/);
assert.match(provisionSheet, /120/);
assert.match(provisionSheet, /saldo resultante.*0/i);
assert.match(provisionSheet, /data-confirm-release-provision/);

const budgetSheet = renderBudgetSheet({
  ...state,
  ui: { ...state.ui, activeSheet: 'confirm-delete-budget', planningDraft: { budgetId: 'budget-rent' } }
});
assert.match(budgetSheet, /Eliminar presupuesto/);
assert.match(budgetSheet, /data-confirm-delete-budget/);

const [balancesSource, mainSource, settingsSource, screenStyles] = await Promise.all([
  readFile(new URL('../src/screens/balances.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/screens/settings.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles/screens.css', import.meta.url), 'utf8')
]);

assert.match(balancesSource, /data-planning-focus="provisions"/,
  'Balances must name Provisions as the contextual Planning destination');
assert.doesNotMatch(budgetManager, /planning-row-actions"><button class="chip dense/,
  'manager row actions must not use compact 32px chips');
assert.match(screenStyles, /\.planning-action\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  'manager actions must preserve a 44px touch target');
assert.doesNotMatch(settingsSource, /renderProvisionsAdmin|new-provision/,
  'the legacy provisions catalog renderer must be removed');
assert.doesNotMatch(mainSource, /new-provision|provisionSheet\(/,
  'the legacy provision sheet route must be removed');

console.log('planning-management.test.mjs passed');
