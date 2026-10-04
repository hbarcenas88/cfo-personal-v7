import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { renderAudit } from '../src/screens/audit.js';
import { backupPayload } from '../src/services/backupService.js';

const legacyClosures = [{ id: 'historic-close', accountName: 'Cuenta', cutoffDate: '2026-09-30', realBalance: 100, statementRows: [], decisions: [] }];
const state = {
  auditPeriod: { mode: 'all' }, period: { mode: 'month', month: '2026-10' },
  accounts: [{ id: 'bank', name: 'Cuenta' }], categories: [],
  transactions: [{ id: 'tx1', account: 'Cuenta', date: '2026-10-04', movement: 'Gasto', amount: 12, description: 'Compra normal', affectsBalance: true }],
  budgets: [], provisions: [], provisionEvents: [],
  filters: { audit: { accounts: [], types: [], categories: [], subcategories: [], text: '' } },
  auditClosures: legacyClosures, ui: {}
};
const before = structuredClone(state);
const markup = renderAudit(state);
assert.doesNotMatch(markup, /Auditoría guiada|Nuevo cierre|Cierres guardados|data-open-audit-close|guided-audit/);
assert.match(markup, /data-audit-results/);
assert.match(markup, /data-audit-search/);
assert.match(markup, /Movimientos/);
assert.match(markup, /Compra normal/);
assert.match(markup, /04\/10\/2026/);
assert.match(markup, /data-tx-menu="tx1"/);
assert.deepEqual(state, before, 'retirement must not mutate legacy data');
const auditSource = await readFile(new URL('../src/screens/audit.js', import.meta.url), 'utf8');
assert.doesNotMatch(auditSource, /auditClose\.js|renderAuditClose/);
const payload = backupPayload(state);
assert.deepEqual(payload.data.auditClosures, legacyClosures, 'historical closures remain compatible with backups');
assert.notEqual(payload.data.auditClosures, legacyClosures);
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');
assert.doesNotMatch(styles, /guided-audit/);
const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const stateSource = await readFile(new URL('../src/state.js', import.meta.url), 'utf8');
const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.doesNotMatch(mainSource, /guidedAuditService|statementFileService|auditClose\.js|guided-audit-close|data-open-audit-close|ensureAuditCloseDraft/);
assert.doesNotMatch(stateSource, /guidedAuditService|export async function (createAuditClose|saveAuditCloseDecision|deleteAuditClose)\(/);
assert.doesNotMatch(worker, /guidedAuditService|statementFileService|auditClose\.js/);
for (const path of ['src/screens/auditClose.js', 'src/services/guidedAuditService.js', 'src/services/statementFileService.js']) {
  await assert.rejects(access(new URL('../' + path, import.meta.url)), { code: 'ENOENT' });
}
console.log('guided-audit-retirement.test.mjs passed');
