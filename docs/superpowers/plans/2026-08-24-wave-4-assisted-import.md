# Oleada 4 — Importación asistida Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir importar Movimientos y Presupuestos desde CSV mediante decisiones asistidas, trazables y reversibles, sin introducir datos ambiguos como texto libre.

**Architecture:** Un servicio puro construye y resuelve un borrador de importación sin mutar estado. Sólo un plan final validado llega a `state.js`, donde una única mutación crea catálogos, filas y metadata de lote; `main.js` se limita a representar el borrador y delegar acciones. La metadata se normaliza, persiste y respalda explícitamente para que los datos históricos sigan siendo compatibles.

**Tech Stack:** PWA ES modules nativos, IndexedDB existente, `node:assert/strict`, Browser a 390 × 844, CSS propio y service worker existente.

**Spec:** `docs/superpowers/specs/2026-08-24-wave-4-assisted-import-design.md`

## Global Constraints

- Alcance exclusivo: CSV de `Movimientos` y `Presupuestos`; no XLSX, PDF, OCR, conexión bancaria ni mapeador genérico de columnas.
- Una cuenta, categoría o subcategoría desconocida nunca se persiste como texto libre: debe coincidir, resolverse, crearse o descartarse.
- Los únicos movimientos importables son `Ingreso` y `Gasto`. `Transferencia`, `Provisión`, tipos desconocidos y tipos ambiguos quedan bloqueados hasta resolución o descarte; nunca se degradan a una fila financiera diferente.
- El borrador no persiste cambios. La confirmación usa una única `mutate()` y un único deshacer inmediato para todo el lote.
- La trazabilidad vive en JSON mediante `importMeta` e `importBatches`; CSV mantiene el contrato de columnas actual.
- Datos legacy sin metadata nueva deben cargar y restaurarse sin errores.
- No usar `<select>` nativo. A 390 × 844: targets ≥44 px, sin overflow horizontal, sin contenido bajo la navegación y con foco/scroll estables.
- Usar fixtures sintéticos; no cargar, modificar ni guardar datos financieros personales durante QA.
- Durante ejecución, crear un worktree aislado y no tocar archivos ajenos. No publicar ni hacer push sin autorización textual fresca para el SHA y destino exactos.
- Usar checkpoints de pruebas entre tareas; preparar un único commit local final de la oleada después de la revisión independiente. No crear commits por tarea salvo una recuperación técnica imprescindible y previamente documentada.

---

## File structure

- Create: `src/services/assistedImportService.js` — análisis puro, grupos equivalentes, decisiones, duplicados y plan final.
- Modify: `src/services/importExportService.js` — conserva parser/CSV existente y delega el análisis de Movimientos/Presupuestos al servicio nuevo.
- Modify: `src/state.js` — migra `importBatches`, conserva `importMeta` y aplica planes atómicos.
- Modify: `src/services/financeService.js` — propaga `importMeta` de forma explícita al normalizar transacciones y presupuestos.
- Modify: `src/services/backupService.js` — incluye `importBatches` en el respaldo JSON.
- Modify: `src/main.js` — renderiza el borrador asistido, acciones por grupo, excepciones y confirmación final.
- Modify: `styles/screens.css` — geometría móvil del resumen, grupos, decisiones y confirmación de importación.
- Modify: `service-worker.js` — precachea el nuevo servicio y eleva la versión de caché.
- Modify: `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md` — documentan contrato, evidencia y pendientes reales.
- Create: `tests/assisted-import-review.test.mjs` — contratos puros de análisis y resoluciones.
- Create: `tests/assisted-import-commit.test.mjs` — atomicidad, migración, undo y trazabilidad persistida.
- Create: `tests/assisted-import-ui.test.mjs` — contrato de interfaz, copy, controles propios y acciones seguras.
- Modify: `tests/pwa-cache-parity.test.mjs`, `tests/transaction-edit.test.mjs`, `tests/backup-provisions.test.mjs` — regresiones de precache, invariantes financieras y JSON.

## Task 1: Contrato puro del borrador y grupos de revisión

**Files:**
- Create: `src/services/assistedImportService.js`
- Create: `tests/assisted-import-review.test.mjs`
- Modify: `src/services/importExportService.js:292-338`

**Interfaces:**
- Consumes: `canon`, `parseAmount`, `parseDate`, `parseMonth` de `src/utils/format.js` y catálogos del estado actual.
- Produces: `createImportReviewDraft(kind, objects, state, options)`, `resolveImportGroup(draft, groupId, resolution, applyToEquivalent)`, `discardImportRow(draft, sourceRow)` y `buildAssistedImportPlan(draft, state)`.
- `createImportReviewDraft()` devuelve `{ kind, rows, groups, fingerprint, summary }`; cada fila incluye `sourceRow`, `original`, `resolved`, `issues`, `decisions` y `status`.

- [ ] **Step 1: Write the failing pure-service tests**

Create `tests/assisted-import-review.test.mjs` with a catalog fixture and these executable expectations:

```js
import assert from 'node:assert/strict';
import {
  createImportReviewDraft,
  resolveImportGroup,
  buildAssistedImportPlan
} from '../src/services/assistedImportService.js';

const state = {
  accounts: [{ id: 'cash', name: 'Caja' }],
  categories: [{ id: 'food', name: 'Comida', subcategories: [{ id: 'market', name: 'Mercado' }] }],
  transactions: [],
  budgets: [],
  importBatches: []
};
const rows = [
  { __row: 2, cuenta: 'Banco BAC', movimiento: 'Débito', monto: '12.50', categoria: 'Comida', subcategoria: 'Mercado', descripcion: 'Café', fecha: '2026-08-20' },
  { __row: 3, cuenta: 'Banco BAC', movimiento: 'Débito', monto: '7.00', categoria: 'Comida', subcategoria: 'Mercado', descripcion: 'Pan', fecha: '2026-08-21' }
];

const draft = createImportReviewDraft('transactions', rows, state, { batchId: 'batch-1', importedAt: '2026-08-24T12:00:00.000Z' });
const accountGroup = draft.groups.find(group => group.field === 'account');
assert.equal(accountGroup.count, 2);
assert.equal(accountGroup.status, 'new');
const resolved = resolveImportGroup(draft, accountGroup.id, { kind: 'create', value: 'BAC principal', accountType: 'Cuenta Corriente' }, true);
assert.equal(resolved.rows.every(row => row.resolved.account === 'BAC principal'), true);
assert.equal(resolved.rows.every(row => row.original.account === 'Banco BAC'), true);
assert.equal(buildAssistedImportPlan(resolved, state).ok, true);
```

Add cases for canonical match, category/subcategory contextual resolution, one row exception, invalid date/monto, unknown movement, and an explicit `Transferencia` blocked issue.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/assisted-import-review.test.mjs`

Expected: failure because `src/services/assistedImportService.js` and its exports do not exist.

- [ ] **Step 3: Implement the minimum pure review service**

Create the service with explicit constants and no state writes:

```js
export const IMPORTABLE_MOVEMENTS = new Set(['Ingreso', 'Gasto']);

export function createImportReviewDraft(kind, objects, state, options = {}) {
  const rows = objects.map((object, index) => classifyImportRow(kind, object, state, index));
  return {
    kind,
    batchId: options.batchId || crypto.randomUUID(),
    importedAt: options.importedAt || new Date().toISOString(),
    fingerprint: fingerprintImport(kind, rows),
    rows,
    groups: groupReviewIssues(rows),
    summary: summarizeReview(rows)
  };
}

export function resolveImportGroup(draft, groupId, resolution, applyToEquivalent) {
  return rebuildDraft({ ...draft, rows: applyResolution(draft.rows, groupId, resolution, applyToEquivalent) });
}
```

`classifyImportRow()` must preserve aliases in `original`, record fields as `account`, `category`, `subcategory`, `movement`, `amount`, `date`, `month`, and distinguish `matched`, `new`, `ambiguous`, `invalid`, `possibleDuplicate` or `blocked`. `rebuildDraft()` recalculates groups and summary from rows; it never mutates its argument.

- [ ] **Step 4: Delegate legacy issue reporting to the service**

Keep `importIssuesV702()` as a compatibility wrapper in `src/services/importExportService.js`, but derive its legacy `{ row, fields }` output from `createImportReviewDraft()` for Movimientos/Presupuestos. Leave catalog import validation unchanged.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node tests/assisted-import-review.test.mjs
node tests/import-export-provisions.test.mjs
```

Expected: both exit `0`; matching values are auto-resolved, new/ambiguous values are not importable, and legacy provision validation remains unchanged.

## Task 2: Decisiones masivas, duplicados y preflight inmutable

**Files:**
- Modify: `src/services/assistedImportService.js`
- Modify: `tests/assisted-import-review.test.mjs`

**Interfaces:**
- Consumes: Task 1 `ImportReviewDraft` and state `transactions`, `budgets`, `importBatches`.
- Produces: `discardImportRow(draft, sourceRow)`, `approvePossibleDuplicate(draft, sourceRow)`, `buildAssistedImportPlan(draft, state)`.
- `buildAssistedImportPlan()` returns either `{ ok: false, errors }` or `{ ok: true, plan }`, where `plan` contains `batch`, `catalogCreates`, `transactions`, `budgets`, `skippedRows`, `decisions` and `duplicateWarnings`.

- [ ] **Step 1: Add failing tests for scope and duplicates**

Extend `tests/assisted-import-review.test.mjs` with these cases:

```js
const duplicateDraft = createImportReviewDraft('transactions', [{
  __row: 2, cuenta: 'Caja', movimiento: 'Gasto', monto: '12', categoria: 'Comida',
  subcategoria: 'Mercado', descripcion: 'Café', fecha: '2026-08-20'
}], { ...state, transactions: [{ date: '2026-08-20', account: 'Caja', movement: 'Gasto', amount: 12, category: 'Comida', subcategory: 'Mercado', description: 'Café' }] }, { batchId: 'batch-duplicate' });
assert.equal(duplicateDraft.rows[0].issues.some(issue => issue.kind === 'possibleDuplicate'), true);
assert.equal(buildAssistedImportPlan(duplicateDraft, state).ok, false);
assert.equal(buildAssistedImportPlan(approvePossibleDuplicate(duplicateDraft, 2), state).ok, true);

const reimport = createImportReviewDraft('transactions', rows, { ...state, importBatches: [{ fingerprint: 'same-fingerprint' }] }, { batchId: 'batch-repeat', fingerprint: 'same-fingerprint' });
assert.equal(reimport.rows.every(row => row.issues.some(issue => issue.kind === 'duplicateBatch')), true);
```

Also assert that a group action shows count `N`, only mutates rows with the same field/original canonical value, and subcategory grouping includes the resolved category identity.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/assisted-import-review.test.mjs`

Expected: failure because duplicate approvals, duplicate-batch blocking or preflight validation are not implemented.

- [ ] **Step 3: Implement deterministic preflight**

Implement semantic duplicate keys from canonical date, account, amount, movement, category, subcategory and description. Treat a prior batch fingerprint as a hard block; treat semantic duplicate as `possibleDuplicate` requiring row-level approval. Construct a plan only when every retained row is valid, resolved, importable and either non-duplicate or explicitly approved.

```js
export function buildAssistedImportPlan(draft, state) {
  const errors = draft.rows.filter(row => row.status === 'blocked' || row.status === 'unresolved');
  if (errors.length) return { ok: false, errors };
  return { ok: true, plan: freezeImportPlan(materializePlan(draft, state)) };
}
```

`materializePlan()` must deduplicate proposed catalog creates canonically and retain a complete per-row decision record. It must not change `state`, `draft`, input rows or original values.

- [ ] **Step 4: Run focused tests**

Run: `node tests/assisted-import-review.test.mjs`

Expected: exit `0`; same-lot reimport is blocked, possible duplicates require approval, and legitimate repeated rows can be explicitly retained.

## Task 3: Persisted metadata and legacy migration

**Files:**
- Modify: `src/state.js:14-96`
- Modify: `src/services/financeService.js:4-45`
- Modify: `src/services/backupService.js:10-31`
- Create: `tests/assisted-import-commit.test.mjs`
- Modify: `tests/backup-provisions.test.mjs`
- Modify: `tests/transaction-edit.test.mjs`

**Interfaces:**
- Consumes: Task 2 immutable plan metadata.
- Produces: `state.importBatches`, normalized `transaction.importMeta`, normalized `budget.importMeta`, and JSON payload containing `importBatches`.

- [ ] **Step 1: Add failing migration and backup tests**

Create the test fixture with imported and legacy records:

```js
const imported = normalizeTransaction({
  date: '2026-08-20', account: 'Caja', movement: 'Gasto', amount: 12,
  importMeta: { batchId: 'batch-1', source: 'CSV', sourceRow: 2, original: { cuenta: 'Caja' }, resolutions: { account: 'matched' }, importedAt: '2026-08-24T12:00:00.000Z' }
}, state);
assert.equal(imported.importMeta.batchId, 'batch-1');
assert.equal(normalizeTransaction({ date: '2026-08-20', account: 'Caja', amount: 1 }, state).importMeta, undefined);
assert.deepEqual(backupPayload({ ...fixtureState, importBatches: [{ id: 'batch-1', fingerprint: 'abc' }] }).data.importBatches, [{ id: 'batch-1', fingerprint: 'abc' }]);
```

Add a `mergeState`/restore case proving saved V7 data without `importBatches` becomes an empty array and records without `importMeta` remain valid.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node tests/assisted-import-commit.test.mjs
node tests/backup-provisions.test.mjs
```

Expected: failure because `importMeta` is dropped by normalizers and `importBatches` is absent from state/backup.

- [ ] **Step 3: Implement explicit migration and normalization**

Add `importBatches: []` to `initialState`; in `mergeState()` copy only valid batch summaries. Add a small `normalizeImportMeta()` helper in `financeService.js` that returns `undefined` for absent/invalid metadata and a cloned safe object for valid metadata. Include it explicitly in both normalizers:

```js
importMeta: normalizeImportMeta(tx.importMeta)
```

Do not derive metadata from `source: 'CSV'`; historical imports retain their current shape. Include `importBatches` in `backupPayload()` and preserve it through restore via `mergeState()`.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node tests/assisted-import-commit.test.mjs
node tests/backup-provisions.test.mjs
node tests/transaction-edit.test.mjs
```

Expected: exit `0`; metadata survives normalize/backup/restore and all legacy transaction editing assertions remain unchanged.

## Task 4: Aplicación atómica de un lote y deshacer único

**Files:**
- Modify: `src/state.js:207-244`
- Modify: `src/services/importExportService.js:175-289`
- Modify: `tests/assisted-import-commit.test.mjs`

**Interfaces:**
- Consumes: Task 2 valid `ImportPlan` and Task 3 state metadata.
- Produces: `applyAssistedImportPlan(plan)` from `src/state.js`, returning `{ imported, createdAccounts, createdCategories, createdSubcategories, skipped }`.
- `applyAssistedImportPlan()` is the only writer used by the new flow.

- [ ] **Step 1: Add failing atomicity tests**

Add a MemoryIndexedDB-backed state test:

```js
const result = await applyAssistedImportPlan({
  batch: { id: 'batch-1', fingerprint: 'abc', importedAt: '2026-08-24T12:00:00.000Z', kind: 'transactions' },
  catalogCreates: { accounts: [{ name: 'BAC principal', type: 'Cuenta Corriente' }], categories: [{ name: 'Mascotas' }], subcategories: [{ category: 'Mascotas', name: 'Veterinario' }] },
  transactions: [{ date: '2026-08-20', account: 'BAC principal', movement: 'Gasto', amount: 20, category: 'Mascotas', subcategory: 'Veterinario', description: 'Consulta', importMeta: { batchId: 'batch-1', source: 'CSV', sourceRow: 2, original: {}, resolutions: {}, importedAt: '2026-08-24T12:00:00.000Z' } }],
  budgets: [], skippedRows: [], decisions: [], duplicateWarnings: []
});
assert.deepEqual(result, { imported: 1, createdAccounts: 1, createdCategories: 1, createdSubcategories: 1, skipped: 0 });
assert.equal(state.importBatches.length, 1);
await undo();
assert.equal(state.transactions.length, 0);
assert.equal(state.accounts.some(account => account.name === 'BAC principal'), false);
```

Add a malformed plan case that rejects before `mutate()` and leaves every state collection equal to its pre-call snapshot.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/assisted-import-commit.test.mjs`

Expected: failure because `applyAssistedImportPlan` does not exist.

- [ ] **Step 3: Implement one validated state mutation**

In `state.js`, validate the immutable plan before calling `mutate()`. Inside one updater, create accounts/categories/subcategories only when no canonical equivalent exists, normalize transaction/budget rows against the updated in-memory catalog, append the batch summary and set `onboarded`. Use one undo label such as `Importación CSV deshecha`.

```js
export async function applyAssistedImportPlan(plan) {
  const validated = validateAssistedImportPlan(plan, state);
  if (!validated.ok) return { ok: false, errors: validated.errors };
  let result;
  await mutate(s => { result = applyValidatedImportPlan(s, validated.plan); }, { undo: 'Importación CSV deshecha' });
  return { ok: true, ...result };
}
```

Do not call existing multi-mutation `importCatalog()` or `importTransactions()` from this path. Keep them untouched for their existing catalog flows.

- [ ] **Step 4: Connect the executor without changing old imports**

Export a thin `commitAssistedImport(plan)` helper from `importExportService.js` only if it improves the `main.js` boundary; otherwise import `applyAssistedImportPlan()` directly in `main.js`. Existing direct catalog imports and their tests must continue using their current functions.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
node tests/assisted-import-commit.test.mjs
node tests/import-export-provisions.test.mjs
node tests/transaction-edit.test.mjs
```

Expected: exit `0`; a batch writes once, undo restores pre-batch state, and legacy import paths still work.

## Task 5: Revisión móvil por grupos, excepciones y confirmación

**Files:**
- Modify: `src/main.js:1536-1548,2032-2097,2644-2720`
- Modify: `styles/screens.css:1134-1210,1688-1760`
- Create: `tests/assisted-import-ui.test.mjs`

**Interfaces:**
- Consumes: Task 1 draft, Task 2 actions, Task 4 `applyAssistedImportPlan()`.
- Produces: `renderAssistedImportReview(draft)`, `replaceImportReviewSection(draft)`, `confirmAssistedImportDraft()` and delegated actions `data-import-group-*`.

- [ ] **Step 1: Add failing UI-contract tests**

Create `tests/assisted-import-ui.test.mjs` that reads `src/main.js` and `styles/screens.css` and asserts all of the following markup contracts:

```js
assert.match(main, /data-import-group-resolve/);
assert.match(main, /Aplicar a \$\{group\.count\} equivalentes/);
assert.match(main, /data-import-row-discard/);
assert.match(main, /data-import-confirm-review/);
assert.match(main, /Transferencia.*no se puede importar/i);
assert.doesNotMatch(main, /<select\b/i);
assert.match(styles, /\.assisted-import-group[\s\S]*min-height:\s*44px/);
```

Also test that row cards render `original` as escaped text, confirmation exposes import/create/discard counts, and the legacy simple preview remains available for catalog imports.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/assisted-import-ui.test.mjs`

Expected: failure because grouped actions and confirmation markup do not exist.

- [ ] **Step 3: Render an assisted review without writing state**

Keep `importSheetV702()` as the entry point, but branch only for `transactions` and `budgets` with parsed objects. Add `renderAssistedImportReview()` with:

- summary counts for read, ready, unresolved, possible duplicate and discarded rows;
- one card per issue group, displaying original value, affected count, selector/create/correct actions and unselected `Aplicar a N equivalentes`;
- individual row exception view with edit, approve duplicate and discard controls;
- an explicit blocked card for transfer/provision/unsupported type;
- final confirmation trigger disabled while unresolved or blocking rows remain.

Use existing `pickerButton()`/searchable controls for existing values. Creation is a compact in-sheet form; account creation includes a visible account-type choice and states that no opening balance is created.

- [ ] **Step 4: Bind actions with localized review updates**

Route delegated actions through the pure service. For text input, update the draft and replace only `[data-assisted-import-review]` with `replaceImportReviewSection()` so the active input remains mounted. Structural transitions — open/close picker, create form or final confirmation — may use the existing overlay render coordinator and must preserve focus identity.

Use these action contracts:

```js
data-import-group-resolve="<group-id>"
data-import-group-apply-equivalent="<group-id>"
data-import-row-discard="<source-row>"
data-import-row-approve-duplicate="<source-row>"
data-import-confirm-review
data-import-confirm-final
```

`confirmAssistedImportDraft()` first calls `buildAssistedImportPlan()`, then opens a confirmation overlay. Only `data-import-confirm-final` calls `applyAssistedImportPlan(plan)`.

- [ ] **Step 5: Add responsive styles and accessibility**

Add focused classes for group cards, compact row exceptions, count badges and the confirmation summary. Keep the same radii, spacing and typography tokens as existing import cards. Ensure button rows wrap without changing target height, text uses semantic labels/`aria-live` for changing summary counts, and all dismiss paths use the existing overlay lifecycle.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
node tests/assisted-import-ui.test.mjs
node tests/assisted-import-review.test.mjs
node tests/assisted-import-commit.test.mjs
node tests/render-coordinator.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Expected: exit `0`; UI exposes only safe actions, text is escaped, and unrelated overlay/mobile contracts remain green.

## Task 6: PWA parity, sources of truth and complete verification

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/pwa-cache-parity.test.mjs`
- Modify: `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md`
- Modify: all tests named in Tasks 1–5 as required by final suite

**Interfaces:**
- Consumes: completed implementation, `assistedImportService.js` and existing service worker manifest list.
- Produces: `cfo-personal-v7-cache-48`, documented behavior/evidence and a publishable single-wave commit.

- [ ] **Step 1: Add the failing cache-parity assertion**

Extend `tests/pwa-cache-parity.test.mjs` to require one occurrence of `src/services/assistedImportService.js`, no docs/tests/data assets in `APP_SHELL`, and `cfo-personal-v7-cache-48`.

- [ ] **Step 2: Run the cache test to verify it fails**

Run: `node tests/pwa-cache-parity.test.mjs`

Expected: failure because cache `47` and `APP_SHELL` do not yet contain the assisted-import service.

- [ ] **Step 3: Update PWA and sources of truth**

Add the service to `APP_SHELL`, increase cache name to `cfo-personal-v7-cache-48`, and update documents with only verified facts:

- `PRODUCT_SPEC.md`: import decisions, safe type limits, atomic confirmation and JSON traceability.
- `DESIGN_SYSTEM.md`: group cards, explicit mass-apply confirmation, exception controls and mobile accessibility.
- `BACKLOG.md`: mark assisted import delivered only after all gates pass; leave PDF/XLSX and transfer import deferred.
- `PROGRESS.md`: record actual behavior, QA evidence and SHA only after commit exists.
- `VERIFIER.md`: record commands, counts, review result and external publication/phone validation as separate future gates.

- [ ] **Step 4: Run all automated verification**

Run every test serially from the repository root:

```powershell
$failed = @(); $files = Get-ChildItem tests -Filter '*.test.mjs' | Sort-Object Name; foreach ($file in $files) { node $file.FullName; if ($LASTEXITCODE -ne 0) { $failed += $file.Name } }; if ($failed.Count) { throw ($failed -join ', ') }
```

Then run syntax for every JavaScript file changed from the wave base and whitespace/privacy checks:

```powershell
$jsFiles = git diff --name-only 509113c -- '*.js'; foreach ($file in $jsFiles) { node --check $file; if ($LASTEXITCODE -ne 0) { exit 1 } }
git diff --check 509113c
git status --short
```

Expected: all tests pass, every changed JavaScript file parses, no diff whitespace errors, and no CSV/XLSX/JSON data, backups, captures or secrets are proposed.

- [ ] **Step 5: Perform rendered QA with synthetic data**

Serve the execution worktree over HTTP. In Browser at 390 × 844, import a synthetic CSV containing:

- two rows sharing a new account;
- a new category plus subcategory;
- an existing category with a new subcategory;
- one possible duplicate;
- one invalid date or amount;
- one transfer/unsupported type;
- one row-level exception.

Verify decisions by group, unselected/apply-to-equivalents behavior, counts, explicit duplicate approval, discard, cancellation with zero writes, confirmation summary, creation result, immediate undo, reload persistence and backup/restore with `importMeta`. Confirm no native select, no horizontal overflow, no control below 44 px, no console errors and no focus/scroll loss during typing.

- [ ] **Step 6: Independent reviewer gate**

Dispatch a reviewer who did not implement the feature. Give it the approved spec, this plan, changed files and the 40-minute timebox. It must inspect code, run focused tests, exercise the 390 × 844 synthetic flow and classify only reproducible findings as Critical, Important or Minor. Correct only Critical/Important findings within at most two repair/review loops; rerun the full verification after any repair.

- [ ] **Step 7: Create the single final wave commit**

After all gates pass, stage only source, tests and truth documents for this oleada. Do not include synthetic CSV files, local data, backups, screenshots, `.superdesign/` or `.superpowers/sdd/` artifacts.

```powershell
git add src/services/assistedImportService.js src/services/importExportService.js src/services/financeService.js src/services/backupService.js src/state.js src/main.js styles/screens.css service-worker.js tests PRODUCT_SPEC.md DESIGN_SYSTEM.md BACKLOG.md PROGRESS.md VERIFIER.md docs/superpowers/specs/2026-08-24-wave-4-assisted-import-design.md docs/superpowers/plans/2026-08-24-wave-4-assisted-import.md
git commit -m "feat: add assisted CSV import review"
```

Before any push, report the exact SHA, tests, reviewer result and publication destination, then wait for fresh textual authorization.

## Execution order and agent assignments

1. Principal/architecture: GPT-5.6 Terra High owns the worktree, interfaces, sequencing and final decisions.
2. Implementer A: GPT-5.6 Terra High executes Tasks 1–2 only, then returns evidence.
3. Implementer B: GPT-5.6 Terra High executes Tasks 3–4 after Task 2 review, then returns evidence.
4. Implementer C: GPT-5.6 Terra High executes Task 5 after persistence/atomicity review, then returns evidence.
5. QA agent: GPT-5.6 Terra Medium executes Task 6 Steps 1–5 independently of the implementers.
6. Reviewer: GPT-5.6 Terra High executes Task 6 Step 6, with no implementation responsibility and a 40-minute maximum.

The tasks are intentionally sequential where contracts depend on the prior task. QA can begin static/PWA inspection once Task 5 is complete, but the reviewer starts only after full automated and Browser evidence exists.
