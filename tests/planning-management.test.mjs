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
assert.match(planning, /data-planning-section="budgets"/);
assert.match(planning, /data-planning-section="provisions"/);
assert.match(planning, /data-tool="planning-budgets"/);
assert.match(planning, /data-tool="planning-provisions"/);
assert.match(planning, /data-budget-period="2026-07"/);
assert.match(planning, /data-budget-period="2026-08"/);
assert.doesNotMatch(planning, /<select/);
assert.match(planning, /data-budget-edit="budget-food"/);
assert.match(planning, /data-budget-delete="budget-food"/);
assert.doesNotMatch(planning, /data-budget-edit="budget-rent"/,
  'the July budget list must not render August entries');
assert.match(planning, /Comida/);

assert.equal(selectPlanningBudgetPeriod(state, '2026-08'), true);
const augustPlanning = renderSettings(state);
assert.equal(state.ui.planningBudgetPeriod, '2026-08');
assert.match(augustPlanning, /data-budget-edit="budget-rent"/);
assert.doesNotMatch(augustPlanning, /data-budget-edit="budget-food"/,
  'changing the custom period filter must replace the visible budget rows');
assert.equal(selectPlanningBudgetPeriod(state, 'not-a-month'), false);
assert.equal(state.ui.planningBudgetPeriod, '2026-08');
assert.match(planning, /data-provision-edit="provision-vacation"/);
assert.match(planning, /data-provision-release="provision-vacation"/);
assert.doesNotMatch(renderDrawer(), /data-settings="provisions-admin"/);
assert.doesNotMatch(renderSettings({ ...state, settingsPage: 'catalogs' }), /provisions-admin/);
assert.doesNotMatch(
  renderSettings({ ...state, settingsPage: 'provisions-admin' }),
  /<h2>Provisiones<\/h2>/,
  'the removed legacy route must not retain its unreachable title'
);

const maliciousPlanning = renderSettings({
  ...state,
  provisions: [{
    ...state.provisions[0],
    releaseDate: '<img src=x onerror=alert(1)>'
  }]
});
assert.doesNotMatch(maliciousPlanning, /<img src=x onerror=alert\(1\)>/,
  'an untrusted release date must never enter rendered markup');
assert.match(maliciousPlanning, /&lt;img src=x onerror=alert\(1\)&gt;/,
  'untrusted display text must be HTML escaped at the render boundary');

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
assert.match(planning, /data-planning-section="provisions"[^>]*data-planning-focus="provisions"/,
  'the destination section must be identifiable for focus after routing');
assert.doesNotMatch(planning, /planning-row-actions"><button class="chip dense/,
  'manager row actions must not use compact 32px chips');
assert.match(screenStyles, /\.planning-action\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/,
  'manager actions must preserve a 44px touch target');
assert.doesNotMatch(settingsSource, /renderProvisionsAdmin|new-provision/,
  'the legacy provisions catalog renderer must be removed');
assert.doesNotMatch(mainSource, /new-provision|provisionSheet\(/,
  'the legacy provision sheet route must be removed');

console.log('planning-management.test.mjs passed');
