# Estabilidad móvil de Registro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabilizar toda la escritura móvil, unificar selectores y calculadoras, y permitir completar un registro normal a 390 × 844 sin scroll manual ni cambios financieros.

**Architecture:** La calculadora se mantiene como módulo puro con expresión, formato y evaluación seguros. Registro conserva un borrador estable y actualiza el DOM del importe sin reconstruir el formulario activo; los errores de guardado se representan sólo al intentar guardar. Los selectores buscables se convierten en un patrón explícito de lista primero y búsqueda bajo intención; los resultados de búsqueda se actualizan en contenedores acotados para conservar el input y el teclado.

**Tech Stack:** HTML/CSS/ES modules nativos, IndexedDB existente, Node `node:assert/strict`, pruebas de contrato estático, servidor local y Chrome a 390 × 844.

## Global Constraints

- V7 sigue como única línea operativa; trabajar en el worktree aislado actual y no recuperar worktrees históricos.
- No usar `<select>` nativo; todos los selectores móviles continúan siendo controles propios.
- No cambiar saldos, presupuesto, transferencias, movimientos, provisiones, capacidad de pago ni trazabilidad financiera.
- La única acción que guarda un movimiento es la palomita de cabecera existente; eliminar `Confirmar monto`.
- Mantener objetivo táctil mínimo de 44 px y recorrido normal completo sin scroll manual a 390 × 844.
- La coma es separador de miles y el punto es el único separador decimal; el valor persistido sigue siendo numérico.
- Todo campo editable conserva foco, cursor y teclado mientras se escribe; nunca re-renderizar su nodo durante `input`.
- Cada cambio JavaScript requiere `node --check`, pruebas enfocadas y regresión existente. Un nuevo módulo precacheado exige actualizar `service-worker.js`, su cache y el contrato PWA.
- Antes de publicar, mantener `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md` y `V7_ROADMAP.md` alineados con evidencia real.

---

## File structure

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/keypad.js` | Teclas clásicas, coma de miles, punto decimal, evaluación segura y controlador sin acción de confirmación. |
| `tests/keypad.test.mjs` | Contrato puro de orden de teclas, formato, operaciones y errores de expresión. |
| `src/screens/recordFlow.js` | Marcado de Registro, validación previa al guardado y destinos de foco para errores. |
| `tests/record-flow.test.mjs` | Validación de borrador de Registro y preservación de reglas financieras del payload. |
| `src/components/searchableOptions.js` | Filtrado puro y marcado reutilizable para lista primero y búsqueda activada por intención. |
| `src/screens/audit.js` | Dropdown de Auditoría con activador de búsqueda sin `autofocus` y zona de resultados acotada. |
| `src/screens/categories.js` | Zona de resultados acotada para buscar categorías sin sustituir su input. |
| `src/main.js` | Enlaces de borrador estables, actualización parcial de importe/resultados, foco de error y uso del selector reutilizable. |
| `styles/screens.css` | Grilla clásica compacta, botón de borrado, viewport seguro y estados de error/selector. |
| `tests/searchable-options.test.mjs` | Filtrado, marcado de intención de búsqueda y ausencia de teclado automático. |
| `tests/mobile-ui-contract.test.mjs` | Contrato de no-confirmación de importe, grilla, selectores, cache y fuentes operativas. |
| `service-worker.js` | Precachea `searchableOptions.js` y eleva la versión de cache. |
| `VERIFIER.md`, `PROGRESS.md`, `BACKLOG.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `V7_ROADMAP.md` | Evidencia, estado y reglas actuales una vez que la implementación esté observada. |

### Task 1: Motor de calculadora clásica

**Files:**
- Modify: `src/components/keypad.js`
- Create: `tests/keypad.test.mjs`

**Interfaces:**
- Produces: `CLASSIC_KEYPAD_ROWS`, `createKeypadController(options)`, `evaluateExpression(expression)`, `formatKeypadDisplay(expression)`.
- `createKeypadController` calls `onChange({ expression, display, value, error })`; `value` is a finite number only when the expression is complete.
- Consumed by: `src/main.js` and `src/screens/recordFlow.js` in Task 2.

- [ ] **Step 1: Write the failing keypad tests**

```js
import assert from 'node:assert/strict';
import { CLASSIC_KEYPAD_ROWS, createKeypadController, evaluateExpression, formatKeypadDisplay, renderKeypad } from '../src/components/keypad.js';

assert.deepEqual(CLASSIC_KEYPAD_ROWS, [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'minus'],
  ['group', '0', 'decimal', 'plus']
]);
assert.equal(evaluateExpression('1,200.50+4.50').value, 1205);
assert.equal(formatKeypadDisplay('1200.5'), '1,200.5');
assert.match(renderKeypad(), /data-key="back"/);
assert.doesNotMatch(renderKeypad(), /data-key="confirm"/);

const changes = [];
const keypad = createKeypadController({ onChange: change => changes.push(change) });
['1', '2', '0', '0', '.', '5', '+', '4', '.', '5'].forEach(key => keypad.press(key));
assert.equal(changes.at(-1).value, 1205);
assert.equal(evaluateExpression('1,').error, 'Cálculo incompleto');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/keypad.test.mjs`
Expected: FAIL because the current component exposes no `CLASSIC_KEYPAD_ROWS`, still renders `confirm`, and does not normalize commas.

- [ ] **Step 3: Implement the smallest safe controller change**

```js
export const CLASSIC_KEYPAD_ROWS = [
  ['7', '8', '9', 'divide'],
  ['4', '5', '6', 'multiply'],
  ['1', '2', '3', 'minus'],
  ['group', '0', 'decimal', 'plus']
];

export function evaluateExpression(expression) {
  const text = String(expression || '')
    .replaceAll(',', '')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-');
  // Preserve the existing tokenizer/RPN evaluator and reject incomplete,
  // non-finite and negative results through its existing error contract.
}
```

Render the four rows above plus a dedicated `back` icon in the amount area; remove `currency` and `confirm` keys. Map symbolic keys to `÷`, `×`, `−`, `+`, `,` and `.`. `group` may be entered only inside the current integer operand and is discarded by `evaluateExpression`; `decimal` is accepted once per operand. Every press emits `{ expression, display, value, error }`. A valid expression updates `value` immediately; an incomplete one has `value: null` and `error: 'Cálculo incompleto'` without inventing an amount.

- [ ] **Step 4: Run focused verification**

Run: `node --check src/components/keypad.js; node tests/keypad.test.mjs`
Expected: both commands exit `0`.

- [ ] **Step 5: Commit the isolated deliverable**

```powershell
git add src/components/keypad.js tests/keypad.test.mjs
git commit -m "feat: unify classic amount keypad"
```

### Task 2: Borrador estable y validación explícita de Registro

**Files:**
- Modify: `src/screens/recordFlow.js`
- Modify: `src/main.js:334-409`
- Modify: `styles/screens.css:792-926`
- Create: `tests/record-flow.test.mjs`

**Interfaces:**
- Consumes: keypad change object from Task 1.
- Produces: `validateRecordFlow(flow, keypadState)` returning `{ ok, field, message }` and markup targets `data-record-focus`.
- Preserves: `recordPayload(flow)` and the existing `saveTransaction`/`updateTransaction` financial paths.

- [ ] **Step 1: Write the failing validation tests**

```js
import assert from 'node:assert/strict';
import { recordPayload, validateRecordFlow } from '../src/screens/recordFlow.js';

const base = { type: 'expense', date: '2026-07-26', account: 'BAC', amount: 12.5, amountExpression: '12.5' };
assert.deepEqual(validateRecordFlow(base, { value: 12.5, error: '' }), { ok: true });
assert.deepEqual(validateRecordFlow({ ...base, amountExpression: '12+' }, { value: null, error: 'Cálculo incompleto' }), {
  ok: false, field: 'amount', message: 'Completa el cálculo'
});
assert.deepEqual(validateRecordFlow({ ...base, account: '' }, { value: 12.5, error: '' }), {
  ok: false, field: 'account', message: 'Cuenta requerida'
});
assert.equal(recordPayload({ ...base, isExtraordinary: true }).isExtraordinary, true);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/record-flow.test.mjs`
Expected: FAIL because `validateRecordFlow` does not exist.

- [ ] **Step 3: Implement stable draft updates and error focus**

```js
export function validateRecordFlow(flow, keypadState) {
  if (!flow.date) return { ok: false, field: 'date', message: 'Fecha requerida' };
  if (keypadState?.error || !Number.isFinite(keypadState?.value) || keypadState.value <= 0) {
    return { ok: false, field: 'amount', message: keypadState?.error ? 'Completa el cálculo' : 'Monto requerido' };
  }
  if (flow.type !== 'budget' && !flow.account) return { ok: false, field: 'account', message: 'Cuenta requerida' };
  if (flow.type === 'transfer' && (!flow.accountTo || flow.account === flow.accountTo)) {
    return { ok: false, field: 'accountTo', message: 'Selecciona cuentas distintas' };
  }
  return { ok: true };
}
```

In `bindRecordEvents`, make `[data-record-field]` on `input` mutate only `state.ui.recordFlow[field]`; do not call `render()`. Keep structural rendering only for an actual picker selection, calendar action, close/back, successful save or validation attempt. On keypad change, update the amount text, amount error and backspace enabled state directly through stable `data-record-*` nodes instead of calling `render()`.

Before `saveTransaction` or `updateTransaction`, evaluate the current expression and call `validateRecordFlow`. For a failure, save `{ field, message }` in the record-flow UI, render once, then focus the unique `[data-record-focus="${field}"]`. For success, assign the evaluated amount, clear the validation state, build the unchanged `recordPayload`, and use the existing state service. The header check remains enabled throughout.

Render the `back` key inside `.amount-hero`; render the error with `role="alert"`; add `data-record-focus` to date, account, accountTo, category, description and amount targets. Replace the old 4×5 keypad/confirm styles with a compact four-row classical grid; every button stays at least 44 px. Keep the normal record body within the viewport, retain `overflow:auto` only as a safe fallback for small/zoomed viewports, and reserve `var(--safe-bottom)`.

- [ ] **Step 4: Run focused verification**

Run: `node --check src/screens/recordFlow.js; node --check src/main.js; node tests/record-flow.test.mjs; node tests/transaction-edit.test.mjs`
Expected: all commands exit `0`, including the existing extraordinary regression.

- [ ] **Step 5: Commit the isolated deliverable**

```powershell
git add src/main.js src/screens/recordFlow.js styles/screens.css tests/record-flow.test.mjs
git commit -m "fix: keep record drafts focused on mobile"
```

### Task 3: Selector buscable bajo intención y búsqueda estable

**Files:**
- Create: `src/components/searchableOptions.js`
- Modify: `src/main.js:48-53, 536-538, 610-643, 870-873, 1385-1454, 1969-1977, 2151-2155`
- Modify: `src/screens/audit.js:79-100`
- Modify: `src/screens/categories.js:52-61`
- Modify: `styles/screens.css:1336-1370`
- Create: `tests/searchable-options.test.mjs`

**Interfaces:**
- Produces: `filterSearchableOptions(options, query)`, `renderSearchActivator(active)` and `renderSearchableOptionRows(options, selectedValues)`.
- The screen owns its selected values; the component only filters labels and supplies stable `data-option-value` rows.
- Consumed by: generic option picker, Audit dropdown, Categories search and global search.

- [ ] **Step 1: Write the failing selector tests**

```js
import assert from 'node:assert/strict';
import { filterSearchableOptions, renderSearchActivator } from '../src/components/searchableOptions.js';

const options = [{ value: 'BAC', label: 'Banco BAC' }, { value: 'Caja', label: 'Caja chica' }];
assert.deepEqual(filterSearchableOptions(options, 'caj').map(option => option.value), ['Caja']);
assert.match(renderSearchActivator(false), /data-option-search-open/);
assert.doesNotMatch(renderSearchActivator(false), /autofocus/);
assert.match(renderSearchActivator(true), /data-option-search/);
assert.doesNotMatch(renderSearchActivator(true), /autofocus/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/searchable-options.test.mjs`
Expected: FAIL because the reusable selector module does not exist.

- [ ] **Step 3: Implement the reusable list-first behavior**

```js
import { canon, html } from '../utils/format.js';

export function filterSearchableOptions(options, query) {
  const needle = canon(query);
  return (options || []).filter(option => !needle || canon(option.label || option.value).includes(needle));
}

export function renderSearchActivator(active) {
  return active
    ? '<input class="input" data-option-search placeholder="Buscar o escribir" inputmode="search">'
    : '<button type="button" class="option-search-trigger" data-option-search-open>Buscar o escribir</button>';
}

export function renderSearchableOptionRows(options, selectedValues = []) {
  return (options || []).map(option => `
    <button class="option-row ${selectedValues.includes(option.value) ? 'selected' : ''}" data-option-value="${html(option.value)}">
      <span>${html(option.label || option.value)}</span>
    </button>
  `).join('') || '<div class="empty-state" data-option-empty>Sin opciones</div>';
}
```

`openOptionPicker` starts with `searchActive: false`; `optionPickerSheet` renders the full option list first, never adds `autofocus`, and includes the search activator whenever the list is searchable. Clicking the activator sets `searchActive: true`, renders once and explicitly focuses `[data-option-search]`. Typing updates `state.ui.optionPicker.search` and hides/shows existing option rows through `hidden`; it does not call `render()`.

Apply the same list-first activator and DOM-only filtering to `renderAuditDropdown`; remove its `autofocus` and the input handler that rerenders it. In `audit.js` export `renderAuditResults(state)` and wrap its existing variable result section in `<div data-audit-results>…</div>`; in `categories.js` export `renderCategoriesResults(state)` and wrap its variable result section in `<div data-categories-results>…</div>`. Keep their filter headers and active inputs outside those containers.

In `main.js`, replace the current `renderAndPersistFilters()` call made from input handlers with these operations:

```js
function persistFiltersSoon() {
  window.clearTimeout(filterPersistTimer);
  filterPersistTimer = window.setTimeout(() => persist().catch(error => captureError('filter persistence', error)), 250);
}

function replaceSearchResults(selector, markup) {
  const target = document.querySelector(selector);
  if (target) target.innerHTML = markup;
}
```

`[data-audit-search]` calls `persistFiltersSoon()` then `replaceSearchResults('[data-audit-results]', renderAuditResults(state))`; `[data-cat-search]` does the same with `renderCategoriesResults`; `[data-global-search-input]` replaces only `[data-global-search-results]` using a new `renderGlobalSearchResults(query)`. None of those input handlers calls `render()`. Preserve Escape, outside-click, `Listo`, `Limpiar`, picker selection and existing filter semantics.

- [ ] **Step 4: Run focused verification**

Run: `node --check src/components/searchableOptions.js; node --check src/screens/audit.js; node --check src/screens/categories.js; node --check src/main.js; node tests/searchable-options.test.mjs; node tests/storage-scope.test.mjs`
Expected: all commands exit `0` and storage scope remains unchanged.

- [ ] **Step 5: Commit the isolated deliverable**

```powershell
git add src/components/searchableOptions.js src/main.js src/screens/audit.js src/screens/categories.js styles/screens.css tests/searchable-options.test.mjs
git commit -m "fix: keep searchable controls stable on mobile"
```

### Task 4: Contrato móvil, PWA y evidencia operativa

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/mobile-ui-contract.test.mjs`
- Modify: `VERIFIER.md`
- Modify: `PROGRESS.md`
- Modify: `BACKLOG.md`
- Modify: `PRODUCT_SPEC.md`
- Modify: `DESIGN_SYSTEM.md`
- Modify: `V7_ROADMAP.md`

**Interfaces:**
- Consumes: all public components and data attributes from Tasks 1–3.
- Produces: cache PWA actualizado y evidencia explícita de las pruebas sin afirmar observación móvil no realizada.

- [ ] **Step 1: Extend the failing mobile contract**

```js
assert.match(keypad, /CLASSIC_KEYPAD_ROWS/);
assert.doesNotMatch(keypad, /data-key="confirm"/);
assert.match(keypad, /data-key="back"/);
assert.match(styles, /\.keypad\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, 1fr\)/);
assert.match(main, /data-option-search-open/);
assert.doesNotMatch(audit, /autofocus/);
assert.match(worker, /cfo-personal-v7-cache-40/);
assert.match(worker, /'\.\/src\/components\/searchableOptions\.js'/);
```

- [ ] **Step 2: Run the contract to verify it fails**

Run: `node tests/mobile-ui-contract.test.mjs`
Expected: FAIL until the new component is precached and the cache version is `cfo-personal-v7-cache-40`.

- [ ] **Step 3: Update runtime shell and operational documentation**

Add `./src/components/searchableOptions.js` to `APP_SHELL` and change `CACHE_NAME` to `cfo-personal-v7-cache-40`. Update the six operational documents with only observed facts: central input/selector/keypad behavior implemented and automated evidence executed; leave real-device acceptance unchecked until observed. Keep audit-guided status and financial rules unchanged.

- [ ] **Step 4: Run complete automated verification**

Run:

```powershell
node --check src/components/keypad.js
node --check src/components/searchableOptions.js
node --check src/screens/recordFlow.js
node --check src/screens/audit.js
node --check src/screens/categories.js
node --check src/main.js
node --check service-worker.js
node tests/keypad.test.mjs
node tests/record-flow.test.mjs
node tests/searchable-options.test.mjs
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/guided-audit.test.mjs
node tests/guided-audit-state.test.mjs
node tests/mobile-ui-contract.test.mjs
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 5: Perform rendered QA before completion**

Serve with `python -m http.server 8787` and use `build-web-apps:frontend-testing-debugging` with the available browser surface. At 390 × 844, verify: Record with extraordinary uses no manual scroll; typing Notes/Descripción preserves keyboard and cursor; every calculator has the same classical layout; list opens without keyboard; `Buscar o escribir` opens keyboard only on intent; Audit, Categories and global search preserve their active input; invalid save identifies and focuses the missing field; no native `<select>`, horizontal overflow or safe-area/navigation collision appears. Re-run the current financial walkthrough without creating or changing real data.

- [ ] **Step 6: Commit the verified deliverable**

```powershell
git add service-worker.js tests/mobile-ui-contract.test.mjs VERIFIER.md PROGRESS.md BACKLOG.md PRODUCT_SPEC.md DESIGN_SYSTEM.md V7_ROADMAP.md
git commit -m "test: verify mobile record stability"
```

## Plan self-review

- **Spec coverage:** Task 1 covers classic amount input, comma/point and errors; Task 2 covers stable drafts, header save and one-screen Record; Task 3 covers list-first searchable controls and the remaining live search inputs; Task 4 covers PWA shell, automated regression, mobile QA and operational documents.
- **Scope:** Provisions with goal/release date, PDF audit, cloud, themes and financial rule changes remain excluded.
- **Consistency:** `CLASSIC_KEYPAD_ROWS`, `createKeypadController`, `validateRecordFlow` and `searchableOptions.js` are introduced before later tasks consume them.
- **No unobserved claims:** Task 4 requires rendered/device evidence before marking mobile acceptance complete.
