import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderBalances } from '../src/screens/balances.js';
import { renderSummary } from '../src/screens/summary.js';
import { renderSettings } from '../src/screens/settings.js';

const screenStyles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');

const baseState = {
  period: { mode: 'month', month: '2026-08' },
  auditPeriod: { mode: 'month', month: '2026-08' },
  filters: {
    summary: { excludedCategories: [], includeExtraordinary: false },
    audit: { accounts: [], types: [], categories: [], subcategories: [], text: '' }
  },
  accounts: [{ id: 'cash', name: 'Cuenta principal', type: 'Ahorros', order: 0, kpi: { visible: true, balance: true, available: true } }],
  categories: [{ id: 'food', name: 'Comida', color: '#0A8FE8', subcategories: [{ name: 'Mercado' }] }],
  transactions: [
    { id: 'income', date: '2026-08-01', account: 'Cuenta principal', movement: 'Ingreso', amount: 1000000000 },
    { id: 'expense', date: '2026-08-02', account: 'Cuenta principal', movement: 'Gasto', category: 'Comida', subcategory: 'Mercado', amount: 1 }
  ],
  budgets: [{ id: 'food-budget', month: '2026-08', category: 'Comida', amount: 1 }],
  provisions: [],
  provisionEvents: [],
  recurring: [{ id: 'rent', name: 'Alquiler', type: 'Pago', account: 'Cuenta principal', day: 5, amount: 900 }],
  recurringDone: { '2026-08': { rent: true } },
  auditClosures: [],
  capacityRules: { accountRoles: { cash: 'liquidity' }, provisionIds: [] },
  ui: { planningView: 'hub', planningType: '', categoryDropdown: false },
  settingsPage: 'tools'
};

const balances = renderBalances(baseState);
const summary = renderSummary(baseState);
const tools = renderSettings(baseState);
const preferences = renderSettings({ ...baseState, settingsPage: 'settings' });
const catalogs = renderSettings({ ...baseState, settingsPage: 'categories-admin' });

test('V3-03 recurrent complete communicates selected state on both surfaces', () => {
  assert.match(balances, /class="check-pill selected"[^>]*data-recurring-done="rent"[^>]*aria-pressed="true"[^>]*>[\s\S]*?Completo/,
    'a completed recurring item in Balances must expose pressed semantics and a non-color selected signal');
  const completedPlanning = renderSettings({
    ...baseState,
    settingsPage: 'planning',
    ui: { ...baseState.ui, planningView: 'manager', planningType: 'recurring', planningRecurringFilter: 'completed' }
  });
  assert.match(completedPlanning, /class="check-pill selected"[^>]*data-recurring-done="rent"[^>]*aria-pressed="true"/);
  assert.match(cssRule(screenStyles, '.check-pill.selected'), /font-weight|box-shadow/,
    'completed recurrent controls need a selected signal that is not color alone');
});

test('V3-04 provisions use a clear numerical summary', () => {
  assert.doesNotMatch(balances, /class="donut|conic-gradient|provision-progress/);
  assert.match(balances, /data-provision-summary="reserve"/);
  assert.match(balances, /data-provision-summary="assigned"/);
  assert.match(balances, /data-provision-summary="unassigned"/);
});

test('V3-05 Summary has readable long amounts and one Analysis entry', () => {
  assert.equal((summary.match(/data-open-summary-analysis/g) || []).length, 1,
    'Summary must expose exactly one visible Analysis entry');
  assert.match(summary, /data-open-summary-analysis[^>]*data-interaction-key="summary-analysis"/,
    'the remaining Analysis action must preserve one stable focus identity');
  assert.match(cssRule(screenStyles, '.summary-stat strong'), /white-space:\s*normal;/,
    'Summary stat amounts must wrap instead of using destructive ellipsis');
  assert.match(cssRule(screenStyles, '.operational-chart-total .money'), /overflow-wrap:\s*anywhere;/,
    'the operational total must stay readable for long amounts');
});

test('V3-06 Balances exposes one explicit account audit action', () => {
  assert.match(balances, /data-audit-account="Cuenta principal"[^>]*>[\s\S]*?Auditar saldo/,
    'each account must expose a visible Auditar saldo action');
  assert.doesNotMatch(balances, /doble toque audita/,
    'account audit discovery must not depend on a hidden double-tap instruction');
});

test('V3-07 Settings separates normal advanced future and danger actions', () => {
  for (const group of ['normal', 'advanced', 'danger']) {
    assert.match(tools, new RegExp(`data-settings-group="${group}"`),
      `Settings must expose the ${group} group`);
  }
  assert.match(tools, /class="settings-row danger-action-row"[^>]*data-tool="reset-data"/,
    'reset must have an unmistakable danger treatment while retaining its confirmation action');
  for (const action of ['appearance', 'security', 'cloud']) {
    const futureRow = preferences.match(new RegExp(`<button[^>]*data-tool="${action}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0] || '';
    assert.match(futureRow, /disabled/);
    assert.match(futureRow, /aria-disabled="true"/);
    assert.doesNotMatch(futureRow, /chevronRight|trailing-icon/,
      `future action ${action} must not present an active navigation affordance`);
  }
});

test('V3-08 touched surfaces use the approved Spanish copy', () => {
  assert.match(tools, /CSV con vista previa y validación/);
  assert.match(tools, /Exportar varios CSV/);
  assert.match(tools, /Descargar plantillas/);
  assert.match(tools, /Depuración \/ inspector de almacenamiento/);
  assert.match(tools, /Borrar todos los datos/);
  assert.match(catalogs, /subcategorías/);
  assert.match(catalogs, /aria-label="Editar categoría"/);
});

test('V3-02 only confirmed contextual controls reach 44px', () => {
  for (const selector of [
    '.record-chip-row .chip',
    '.account-order-row .chip',
    '.summary-card-actions .text-button',
    '.role-segmented button'
  ]) {
    assert.match(cssRule(screenStyles, selector), /min-height:\s*var\(--control-md\);/,
      `${selector} must preserve a 44px contextual touch target`);
  }
});

test('T4-R1 Balances contains extreme financial amounts inside mobile metric columns', () => {
  assert.match(cssRule(screenStyles, '.balances-metrics .balance-combo-item'), /min-width:\s*0;/,
    'each Balance total/Disponible grid child must be allowed to contract inside its 177px column');
  for (const selector of [
    '.balances-metrics .balance-combo-item .metric-value',
    '.balances-metrics .metric-card.compact .metric-value'
  ]) {
    const rule = cssRule(screenStyles, selector);
    assert.match(rule, /max-width:\s*100%;/,
      `${selector} must remain contained by its own card`);
    assert.match(rule, /overflow-wrap:\s*anywhere;/,
      `${selector} must wrap an unbroken extreme money value instead of overlapping or clipping`);
    assert.match(rule, /font-size:\s*clamp\(/,
      `${selector} needs controlled mobile typography rather than the global 26px minimum`);
  }
});

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] || '';
}
