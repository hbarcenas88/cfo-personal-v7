import assert from 'node:assert/strict';
import { buildAuditComparison, accountBalances } from '../src/services/financeService.js';
import { renderAuditResults } from '../src/screens/audit.js';

const state = {
  accounts: [{ id: 'main', name: 'Cuenta principal', kpi: {} }],
  categories: [{ name: 'Reserva', color: '#C68000', subcategories: [] }],
  transactions: [
    {
      id: 'income',
      date: '2026-08-01',
      account: 'Cuenta principal',
      movement: 'Ingreso',
      amount: 1000,
      affectsBalance: true
    },
    {
      id: 'provision',
      date: '2026-08-02',
      account: 'Cuenta principal',
      movement: 'Provisión',
      amount: 200,
      provisionDelta: 200,
      affectsBalance: false,
      description: 'Reserva vacaciones',
      category: 'Reserva'
    }
  ],
  provisions: [{ id: 'vacaciones', name: 'Vacaciones' }],
  provisionEvents: [{ provisionId: 'vacaciones', kind: 'release', amount: 200, date: '2026-08-03' }],
  auditPeriod: { mode: 'all', compare: false },
  filters: { audit: { text: '', accounts: ['Cuenta principal'], types: [], categories: [], subcategories: [] } }
};

const comparison = buildAuditComparison(state, state.auditPeriod, state.filters.audit);

assert.equal(comparison.currentRows.length, 2, 'la provisión conceptual sigue visible');
assert.equal(comparison.currentTotal, 1000, 'el subtotal conciliable excluye la provisión conceptual');
assert.equal(accountBalances(state, state.auditPeriod)['Cuenta principal'], comparison.currentTotal,
  'Auditoría coincide con el saldo de cuenta para todo el historial');

const rendered = renderAuditResults(state);
assert.match(rendered, /No afecta saldo/, 'la provisión visible explica su carácter conceptual');
assert.match(rendered, /audit-non-balance/, 'la provisión usa presentación neutral');

const allAudit = buildAuditComparison(state, state.auditPeriod, {
  ...state.filters.audit,
  accounts: []
});
assert.equal(allAudit.currentRows.length, 3, 'la liberación conceptual también permanece visible en Auditoría');
assert.equal(allAudit.currentTotal, 1000, 'la liberación conceptual no altera el subtotal conciliable');
assert.equal(allAudit.currentRows.find(row => row.kind === 'provision-release')?.affectsBalance, false,
  'la liberación se identifica como evidencia conceptual');

const allRendered = renderAuditResults({
  ...state,
  filters: { audit: { ...state.filters.audit, accounts: [] } }
});
assert.match(allRendered, /Liberación de provisión/, 'la liberación tiene un rastro entendible en Auditoría');
assert.doesNotMatch(allRendered, /data-tx-menu="provision-release-vacaciones-2026-08-03"/,
  'la liberación conceptual no promete acciones editables que no existen');

console.log('audit-provision-conciliation.test.mjs passed');
