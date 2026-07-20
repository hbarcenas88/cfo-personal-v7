# Auditoría guiada por cuenta y fecha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a Auditoría cierres flexibles por cuenta y fecha que comparen movimientos de V7 con un CSV/XLSX local, expliquen el delta y persistan decisiones de revisión sin mutar datos financieros.

**Architecture:** El dominio de conciliación vive en un servicio puro que normaliza filas, calcula saldo al corte y propone relaciones; no conoce DOM ni IndexedDB. El estado persiste cierres y relaciones por separado de las transacciones. Una pantalla y sheets propios de Auditoría presentan el recorrido; `main.js` solo coordina eventos, borradores y persistencia.

**Tech Stack:** HTML/CSS/ES modules nativos, IndexedDB por medio de `src/services/storageService.js`, tests Node `node:assert/strict`, SheetJS 0.18.5 vendorizado localmente para `.xlsx` y APIs `File`/`TextDecoder` del navegador.

## Global Constraints

- V7 permanece como única línea operativa; no recuperar ni usar worktrees históricos.
- Toda comparación es analítica: nunca modificar movimientos, saldos, presupuesto, transferencias ni su trazabilidad.
- Transferencias vinculadas siguen siendo pares; no se editan ni se reconcilian como ajustes.
- La app persiste filas normalizadas, no el archivo fuente ni su nombre; no versionar estados bancarios, CSV, XLSX, capturas o datos personales.
- La auditoría se limita a una cuenta y a un rango declarado; `Delta detectado: revisar` es válido.
- Coincidencias requieren el mismo importe con signo; fecha igual es sugerencia, ±2 días advertencia y más de ±2 días candidato lejano. Nunca confirmar una coincidencia automáticamente.
- Usar controles propios y sheets; no introducir `<select>` nativos. Todos los objetivos táctiles primarios miden al menos 44 px y la revisión objetivo es 390 × 844.
- Si cambian activos precacheados, incrementar `CACHE_NAME` de `cfo-personal-v7-cache-37` a `cfo-personal-v7-cache-38` y enumerar cada activo nuevo en `APP_SHELL`.
- Mantener `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md` y `V7_ROADMAP.md` alineados con el estado real.

---

## File Structure

| Archivo | Responsabilidad |
| --- | --- |
| `assets/vendor/xlsx.full.min.js` | Distribución local y sin red de SheetJS 0.18.5; debe incluir su licencia junto al asset. |
| `src/services/statementFileService.js` | Lee CSV/XLSX desde `File` y devuelve encabezados y objetos sin persistir el archivo. |
| `src/services/guidedAuditService.js` | Normaliza filas, calcula huellas, saldo al corte, candidatos y resumen del cierre. |
| `src/state.js` | Migra/persiste `auditClosures` y expone mutaciones limitadas a evidencia y decisiones del cierre. |
| `src/screens/auditClose.js` | Renderiza el recorrido y los sheets de Auditoría guiada usando `data-*` explícitos. |
| `src/screens/audit.js` | Añade el punto de entrada de Auditoría guiada sin degradar filtros, período ni comparación existentes. |
| `src/main.js` | Abre el flujo, lee archivos, asigna columnas, confirma cierres y enlaza/desenlaza revisiones. |
| `styles/screens.css` | Define layout móvil del cierre, cabecera de delta, bandejas de diferencias y sheets. |
| `service-worker.js` | Precachea módulos y el parser local, con cache-38. |
| `tests/guided-audit.test.mjs` | Pruebas puras de normalización, matching, deltas, duplicados y no mutación. |
| `tests/mobile-ui-contract.test.mjs` | Extiende el contrato para los nuevos controles, asset precacheado y cache-38. |

### Task 1: Contrato puro de filas y coincidencias

**Files:**
- Create: `src/services/guidedAuditService.js`
- Create: `tests/guided-audit.test.mjs`
- Modify: `src/services/financeService.js`

**Interfaces:**
- Consumes: `canon`, `parseAmount`, `parseDate` de `src/utils/format.js`; `state.transactions` normalizadas.
- Produces: `normalizeStatementRows(objects, mapping)`, `statementFingerprint(rows)`, `accountBalanceAtCutoff(state, accountName, cutoffDate)`, `buildGuidedAuditReview(close, state)` y `matchStatementToTransactions(statementRows, transactions)`.
- `NormalizedStatementRow` tiene `{ id, sourceRow, date, signedAmount, description }`.
- `GuidedAuditReview` tiene `{ recordedBalance, realBalance, delta, exact, dateWarnings, distantCandidates, onlyInApp, onlyInBank, ambiguous, confirmed, status }`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import {
  buildGuidedAuditReview,
  normalizeStatementRows,
  statementFingerprint
} from '../src/services/guidedAuditService.js';

const statementRows = normalizeStatementRows([
  { fecha: '2026-07-19', monto: '-43.20', detalle: 'NETFLIX.COM' },
  { fecha: '2026-07-17', monto: '100.00', detalle: 'TRANSFERENCIA RECIBIDA' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });

assert.deepEqual(statementRows[0], {
  id: 'statement-2', sourceRow: 2, date: '2026-07-19', signedAmount: -43.2, description: 'NETFLIX.COM'
});
assert.equal(statementFingerprint(statementRows), statementFingerprint([...statementRows].reverse()));

const state = {
  accounts: [{ name: 'BAC Débito' }],
  transactions: [
    { id: 'app-netflix', account: 'BAC Débito', date: '2026-07-18', movement: 'Gasto', amount: 43.2, description: 'Netflix', affectsBalance: true },
    { id: 'app-transfer', account: 'BAC Débito', date: '2026-07-17', movement: 'Ingreso', amount: 100, description: 'Transferencia recibida', affectsBalance: true },
    { id: 'reserve', account: 'BAC Débito', date: '2026-07-18', movement: 'Provisión', amount: 20, description: 'Reserva', affectsBalance: false }
  ]
};
const before = structuredClone(state);
const review = buildGuidedAuditReview({
  id: 'close-1', accountName: 'BAC Débito', cutoffDate: '2026-07-19', realBalance: 56.8,
  range: { from: '2026-07-01', to: '2026-07-19' }, statementRows, decisions: []
}, state);

assert.equal(review.dateWarnings.length, 1);
assert.equal(review.onlyInApp.length, 0);
assert.equal(review.onlyInBank.length, 0);
assert.equal(review.delta, 0);
assert.deepEqual(state, before);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/guided-audit.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `guidedAuditService.js`.

- [ ] **Step 3: Write the minimal implementation**

```js
// src/services/guidedAuditService.js
import { canon, parseAmount, parseDate } from '../utils/format.js';

export const DATE_WARNING_DAYS = 2;
export const AMOUNT_EPSILON = 0.005;

export function normalizeStatementRows(objects = [], mapping = {}) {
  return objects.map((row, index) => ({
    id: `statement-${row.__row || index + 2}`,
    sourceRow: row.__row || index + 2,
    date: parseDate(row[mapping.date]),
    signedAmount: parseAmount(row[mapping.amount]),
    description: String(row[mapping.description] || '').trim()
  })).filter(row => row.date && Number.isFinite(row.signedAmount));
}

export function statementFingerprint(rows = []) {
  return rows.map(row => `${row.date}|${row.signedAmount.toFixed(2)}|${canon(row.description)}`)
    .sort().join('\n');
}

function signedTransactionAmount(tx) {
  if (tx.affectsBalance === false) return 0;
  return tx.movement === 'Gasto' ? -Number(tx.amount || 0) : Number(tx.amount || 0);
}

export function accountBalanceAtCutoff(state, accountName, cutoffDate) {
  return state.transactions.reduce((sum, tx) => {
    if (tx.account !== accountName || tx.date > cutoffDate) return sum;
    return sum + signedTransactionAmount(tx);
  }, 0);
}
```

Implement `matchStatementToTransactions` with same signed amount and a deterministic candidate sort: lowest absolute day difference, then highest token overlap of `canon(description)`, then lexical transaction id. Emit `exact`, `dateWarning`, `distantCandidate`, `ambiguous`, `onlyInApp` and `onlyInBank`; do not set `confirmed` from a proposed candidate. `buildGuidedAuditReview` filters app transactions by `accountName`, `cutoffDate`, range and `affectsBalance !== false`, applies persisted decisions and computes `delta = realBalance - recordedBalance`.

Add to `src/services/financeService.js` only the exported helper below if other screens need it; do not change `accountBalances` behavior:

```js
export function signedBalanceAmount(transaction) {
  if (transaction.affectsBalance === false) return 0;
  return transaction.movement === 'Gasto'
    ? -Number(transaction.amount || 0)
    : Number(transaction.amount || 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/guided-audit.test.mjs`  
Expected: `guided-audit.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/services/guidedAuditService.js src/services/financeService.js tests/guided-audit.test.mjs
git commit -m "feat: add guided audit matching service"
```

### Task 2: Lectura local de CSV y XLSX con asignación de columnas

**Files:**
- Create: `assets/vendor/xlsx.full.min.js`
- Create: `assets/vendor/LICENSE-sheetjs.txt`
- Create: `src/services/statementFileService.js`
- Modify: `index.html`
- Modify: `tests/guided-audit.test.mjs`

**Interfaces:**
- Consumes: `parseCSV` y `rowsToObjects` de `src/services/importExportService.js`, `window.XLSX` de la distribución vendorizada.
- Produces: `readStatementFile(file): Promise<{ headers: string[], objects: object[], format: 'csv' | 'xlsx' }>` y `validateStatementMapping(headers, mapping): { ok: boolean, message: string }`.

- [ ] **Step 1: Write the failing test**

```js
import { validateStatementMapping } from '../src/services/statementFileService.js';

assert.deepEqual(
  validateStatementMapping(['Fecha', 'Monto', 'Descripción'], {
    date: 'Fecha', amount: 'Monto', description: 'Descripción'
  }),
  { ok: true, message: '' }
);
assert.equal(
  validateStatementMapping(['Fecha', 'Monto'], { date: 'Fecha', amount: 'Fecha', description: 'Monto' }).ok,
  false
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/guided-audit.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `statementFileService.js`.

- [ ] **Step 3: Write the minimal implementation**

Add the exact SheetJS Community Edition 0.18.5 browser distribution and its license as static local files. Load it before the app module so no network request is required:

```html
<!-- index.html, immediately before src/main.js -->
<script src="./assets/vendor/xlsx.full.min.js"></script>
<script type="module" src="./src/main.js"></script>
```

```js
// src/services/statementFileService.js
import { parseCSV, rowsToObjects } from './importExportService.js';
import { canon } from '../utils/format.js';

export function validateStatementMapping(headers = [], mapping = {}) {
  const required = ['date', 'amount', 'description'];
  if (required.some(key => !headers.includes(mapping[key]))) return { ok: false, message: 'Asigna fecha, importe y descripción.' };
  if (new Set(required.map(key => mapping[key])).size !== required.length) return { ok: false, message: 'Cada campo debe usar una columna distinta.' };
  return { ok: true, message: '' };
}

export async function readStatementFile(file) {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const text = await file.text();
    const { rows } = parseCSV(text);
    return { headers: rows[0] || [], objects: rowsToObjects(rows), format: 'csv' };
  }
  if (extension === 'xlsx') {
    const workbook = globalThis.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
    return { headers: rows[0] || [], objects: rowsToObjects(rows), format: 'xlsx' };
  }
  throw new Error('Selecciona un archivo CSV o XLSX.');
}

export function suggestedStatementMapping(headers = []) {
  const find = names => headers.find(header => names.includes(canon(header))) || '';
  return {
    date: find(['fecha', 'date', 'fecha transaccion', 'fecha de transaccion']),
    amount: find(['monto', 'importe', 'amount', 'valor']),
    description: find(['descripcion', 'descripción', 'detalle', 'description', 'concepto'])
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/guided-audit.test.mjs`  
Expected: `guided-audit.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add index.html assets/vendor/xlsx.full.min.js assets/vendor/LICENSE-sheetjs.txt src/services/statementFileService.js tests/guided-audit.test.mjs
git commit -m "feat: read local audit statements"
```

### Task 3: Persistir cierres y decisiones sin tocar transacciones

**Files:**
- Modify: `src/state.js`
- Modify: `tests/guided-audit.test.mjs`

**Interfaces:**
- Consumes: `normalizeStatementRows`, `statementFingerprint` de `guidedAuditService.js`; `mutate`, `persist`, `mergeState` existentes.
- Produces: `createAuditClose(payload)`, `saveAuditCloseDecision(closeId, decision)`, `deleteAuditClose(closeId)` y `state.auditClosures`.
- `AuditClose` tiene `{ id, accountName, cutoffDate, realBalance, range, statementRows, fingerprint, decisions, createdAt, updatedAt }`.
- `AuditDecision` tiene `{ id, statementRowId, transactionId, status: 'confirmed' | 'dismissed', createdAt }`.

- [ ] **Step 1: Write the failing test**

```js
const close = {
  id: 'close-1', accountName: 'BAC Débito', cutoffDate: '2026-07-19', realBalance: 56.8,
  range: { from: '2026-07-01', to: '2026-07-19' }, statementRows, fingerprint: statementFingerprint(statementRows), decisions: []
};
const next = applyAuditCloseDecision(close, {
  id: 'decision-1', statementRowId: 'statement-2', transactionId: 'app-netflix', status: 'confirmed'
});
assert.equal(next.decisions.length, 1);
assert.equal(close.decisions.length, 0);
assert.throws(() => applyAuditCloseDecision(next, {
  id: 'decision-2', statementRowId: 'statement-2', transactionId: 'app-transfer', status: 'confirmed'
}), /ya tiene una decisión/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/guided-audit.test.mjs`  
Expected: FAIL because `applyAuditCloseDecision` is not exported.

- [ ] **Step 3: Write the minimal implementation**

```js
// src/state.js imports and additions to initialState
import { applyAuditCloseDecision, statementFingerprint } from './services/guidedAuditService.js';

auditClosures: [],

// mergeState, after transactions are normalized
merged.auditClosures = Array.isArray(saved.auditClosures)
  ? saved.auditClosures.map(close => ({ ...close, decisions: Array.isArray(close.decisions) ? close.decisions : [] }))
  : [];

export async function createAuditClose(close) {
  await mutate(s => { s.auditClosures.push(close); }, { undo: 'Cierre de auditoría creado' });
}

export async function saveAuditCloseDecision(closeId, decision) {
  await mutate(s => {
    const close = s.auditClosures.find(item => item.id === closeId);
    if (!close) return;
    close.decisions = applyAuditCloseDecision(close, decision).decisions;
    close.updatedAt = new Date().toISOString();
  }, { undo: 'Revisión de cierre actualizada' });
}

export async function deleteAuditClose(closeId) {
  await mutate(s => { s.auditClosures = s.auditClosures.filter(close => close.id !== closeId); }, { undo: 'Cierre de auditoría eliminado' });
}
```

Implement and export `applyAuditCloseDecision(close, decision)` in `guidedAuditService.js`. It must clone the closure, reject a second decision for the same `statementRowId`, and never inspect or alter transactions. Add an import fingerprint uniqueness check in `createAuditClose`: reject a close with equal `accountName`, `range.from`, `range.to` and `fingerprint` with `showToast('Ese extracto ya está asociado a un cierre de esta cuenta.')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/guided-audit.test.mjs`  
Expected: `guided-audit.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/state.js src/services/guidedAuditService.js tests/guided-audit.test.mjs
git commit -m "feat: persist guided audit closures"
```

### Task 4: Pantallas y sheets móviles del cierre guiado

**Files:**
- Create: `src/screens/auditClose.js`
- Modify: `src/screens/audit.js`
- Modify: `styles/screens.css`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- Consumes: `buildGuidedAuditReview(close, state)`, `state.auditClosures`, `formatDate`, `formatMoney`, `html`, `icon` y `card`.
- Produces: `renderAuditCloseEntry(state)`, `renderAuditCloseSheet(state)`, `renderAuditCloseList(state)`.
- Events: `data-open-audit-close`, `data-open-audit-close-id`, `data-audit-close-field`, `data-audit-close-file`, `data-audit-close-map`, `data-audit-close-create`, `data-audit-close-decision`, `data-audit-close-delete`.

- [ ] **Step 1: Write the failing contract test**

```js
const auditClose = await readFile(new URL('../src/screens/auditClose.js', import.meta.url), 'utf8');
assert.match(auditClose, /data-open-audit-close/);
assert.match(auditClose, /data-audit-close-file/);
assert.match(auditClose, /data-audit-close-map/);
assert.match(auditClose, /Solo en la app/);
assert.match(auditClose, /Solo en el banco/);
assert.match(auditClose, /Advertencia de fecha/);
assert.doesNotMatch(auditClose, /<select\b/i);
assert.match(styles, /\.guided-audit-summary\s*\{[\s\S]*?grid-template-columns/);
assert.match(styles, /\.guided-audit-action\s*\{[\s\S]*?min-height:\s*var\(--control-md\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/mobile-ui-contract.test.mjs`  
Expected: FAIL because `auditClose.js` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```js
// src/screens/audit.js, above the existing filters
${'${renderAuditCloseEntry(state)}'}
```

```js
// src/screens/auditClose.js
export function renderAuditCloseEntry(state) {
  const openCount = state.auditClosures.filter(close => close.status !== 'balanced').length;
  return card(`
    <div class="guided-audit-entry">
      <div><strong>Auditoría guiada</strong><small>${openCount ? `${openCount} cierres por revisar` : 'Compara una cuenta con su estado de cuenta'}</small></div>
      <button class="primary-button compact" data-open-audit-close>Nuevo cierre</button>
    </div>
  `);
}
```

Implement the sheet in five explicit visual stages: Datos, Importar, Revisar, Resultado. Use `pickerButton`/`optionPickerSheet` for account and column choices, `input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` only for file selection, and never a native select. Render `Solo en la app`, `Solo en el banco`, `Advertencia de fecha`, `Candidato lejano` and `Ambiguo` as separate cards. Each candidate displays both date/amount/description values and controls `Confirmar`, `No corresponde`, `Dejar pendiente`.

```css
/* styles/screens.css */
.guided-audit-summary { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:var(--space-sm); }
.guided-audit-action { min-height:var(--control-md); }
.guided-audit-delta.pending { color:var(--amber); }
.guided-audit-exception.app-only { border-left:4px solid var(--red); }
.guided-audit-exception.bank-only { border-left:4px solid var(--blue); }
.guided-audit-exception.date-warning { border-left:4px solid var(--amber); }
@media (max-width:420px) { .guided-audit-summary { grid-template-columns:1fr; } }
```

- [ ] **Step 4: Run contract test to verify it passes**

Run: `node tests/mobile-ui-contract.test.mjs`  
Expected: `mobile-ui-contract.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/screens/audit.js src/screens/auditClose.js styles/screens.css tests/mobile-ui-contract.test.mjs
git commit -m "feat: render guided audit close flow"
```

### Task 5: Conectar eventos, importación y reapertura del cierre

**Files:**
- Modify: `src/main.js`
- Modify: `src/state.js`
- Modify: `src/screens/auditClose.js`
- Modify: `tests/guided-audit.test.mjs`

**Interfaces:**
- Consumes: `readStatementFile`, `suggestedStatementMapping`, `validateStatementMapping`; `normalizeStatementRows`; `createAuditClose`, `saveAuditCloseDecision`, `deleteAuditClose`.
- Produces: `validateRowsAgainstRange(rows, range)`, cierre creado solo después de validar cuenta, fecha, saldo, rango, archivo y columnas; reapertura por id; decisiones persistidas con `status` explícito.

- [ ] **Step 1: Write the failing test**

```js
const outOfRange = normalizeStatementRows([
  { fecha: '2026-06-30', monto: '-10', detalle: 'Antes del rango' }
], { date: 'fecha', amount: 'monto', description: 'detalle' });
assert.equal(validateRowsAgainstRange(outOfRange, { from: '2026-07-01', to: '2026-07-19' }).ok, false);
assert.equal(
  validateRowsAgainstRange(statementRows, { from: '2026-07-01', to: '2026-07-19' }).ok,
  true
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/guided-audit.test.mjs`  
Expected: FAIL because `validateRowsAgainstRange` is not exported.

- [ ] **Step 3: Write the minimal implementation**

```js
// main.js, create only UI draft data; persist only through createAuditClose
document.querySelector('[data-open-audit-close]')?.addEventListener('click', () => {
  state.ui.auditCloseDraft = { step: 'details', accountName: '', cutoffDate: todayISO(), realBalance: '', range: { from: '', to: '' }, headers: [], objects: [], mapping: {}, statementRows: [] };
  openSheet('guided-audit-close');
});

document.addEventListener('change', event => {
  if (!event.target.matches('[data-audit-close-file]')) return;
  readStatementFile(event.target.files[0]).then(fileData => {
    state.ui.auditCloseDraft = { ...state.ui.auditCloseDraft, ...fileData, mapping: suggestedStatementMapping(fileData.headers) };
    render();
  }).catch(error => captureError('guided audit statement', error));
});
```

Add `guided-audit-close` to `renderActiveSheet()`. Bind `data-audit-close-map` through the existing option-picker mechanism, and on `data-audit-close-create` require:

```js
const rangeOk = draft.range.from && draft.range.to && draft.range.from <= draft.range.to && draft.cutoffDate >= draft.range.to;
const mapping = validateStatementMapping(draft.headers, draft.mapping);
const rows = normalizeStatementRows(draft.objects, draft.mapping);
const range = validateRowsAgainstRange(rows, draft.range);
if (!draft.accountName || !Number.isFinite(parseAmount(draft.realBalance)) || !rangeOk || !mapping.ok || !range.ok) {
  showToast(!mapping.ok ? mapping.message : !range.ok ? range.message : 'Completa cuenta, corte, saldo y rango antes de continuar.');
  return;
}
```

Then construct the `AuditClose` object with `uid('audit-close')`, `statementFingerprint(rows)`, empty `decisions`, ISO timestamps and `status` derived from `buildGuidedAuditReview`. On confirm/dismiss, call only `saveAuditCloseDecision`; leave-pending creates no decision. On delete, open a confirmation sheet that calls only `deleteAuditClose`. Reopen uses `state.ui.auditCloseId` and recomputes review from the latest state; it must not alter any transaction.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `node tests/guided-audit.test.mjs`  
Expected: `guided-audit.test.mjs passed`.

Run: `node tests/transaction-edit.test.mjs`  
Expected: `transaction-edit.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/main.js src/state.js src/screens/auditClose.js src/services/guidedAuditService.js tests/guided-audit.test.mjs
git commit -m "feat: persist guided audit review actions"
```

### Task 6: PWA, contratos de regresión y evidencia operativa

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/mobile-ui-contract.test.mjs`
- Modify: `VERIFIER.md`
- Modify: `PROGRESS.md`

**Interfaces:**
- Consumes: `APP_SHELL` and `CACHE_NAME` contract; verifier requirements established by the approved design.
- Produces: offline shell with all guided-audit modules and local XLSX parser, and explicit evidence checklist marked only after execution.

- [ ] **Step 1: Write the failing contract assertions**

```js
assert.match(worker, /cfo-personal-v7-cache-38/);
assert.match(worker, /'\.\/src\/services\/guidedAuditService\.js'/);
assert.match(worker, /'\.\/src\/services\/statementFileService\.js'/);
assert.match(worker, /'\.\/src\/screens\/auditClose\.js'/);
assert.match(worker, /'\.\/assets\/vendor\/xlsx\.full\.min\.js'/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/mobile-ui-contract.test.mjs`  
Expected: FAIL because cache-38 and guided-audit assets are absent.

- [ ] **Step 3: Write the minimal implementation**

```js
// service-worker.js
const CACHE_NAME = 'cfo-personal-v7-cache-38';
// add these APP_SHELL entries
'./src/services/guidedAuditService.js',
'./src/services/statementFileService.js',
'./src/screens/auditClose.js',
'./assets/vendor/xlsx.full.min.js',
```

In `VERIFIER.md`, leave all guided-audit entries unchecked until execution evidence exists. In `PROGRESS.md`, replace “plan técnico pendiente” with the implementation status only after the task actually starts; retain the statement that real-data validation needs a confirmed JSON backup.

- [ ] **Step 4: Run verification suite**

Run:

```powershell
node --check src/main.js
node --check src/state.js
node --check src/services/guidedAuditService.js
node --check src/services/statementFileService.js
node --check src/screens/auditClose.js
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/guided-audit.test.mjs
node tests/mobile-ui-contract.test.mjs
git diff --check
```

Expected: every command exits `0`; no whitespace errors.

Then serve the app with `python -m http.server 8787`, review the entire guided-audit flow at 390 × 844, and confirm: column mapping, file errors, exact/±2-day/distant/ambiguous candidates, confirmation, dismissal, reopen, deletion confirmation, no native select, no overflow and no bottom-navigation conflict. For real data, first confirm a JSON backup and create no financial records.

- [ ] **Step 5: Commit**

```powershell
git add service-worker.js tests/mobile-ui-contract.test.mjs VERIFIER.md PROGRESS.md
git commit -m "test: verify guided audit workflow"
```

## Plan Self-Review

- Spec coverage: Task 1 covers matching, delta, cutoff and no-mutation calculation; Task 2 covers CSV/XLSX local input and column mapping; Task 3 covers persistent/reopenable evidence; Task 4 covers mobile components and all difference states; Task 5 covers range validation and human decisions; Task 6 covers PWA, regression, mobile and real-data verification.
- Placeholder scan: no open markers, deferred steps or implicit error-handling steps remain. Every failure path named in the design is bound to a function, UI state or test.
- Type consistency: `AuditClose`, `AuditDecision`, `NormalizedStatementRow`, `GuidedAuditReview`, `statementFingerprint`, `normalizeStatementRows` and decision statuses use the same names across tasks.
