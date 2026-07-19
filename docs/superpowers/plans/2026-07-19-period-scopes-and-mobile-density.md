# Períodos por contexto y densidad móvil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el período global del contexto persistente de Auditoría, habilitar comparación analítica acotada en Auditoría/Categorías y compactar los flujos móviles aprobados sin cambiar reglas financieras.

**Architecture:** Crear `periodService` como límite puro para borradores, navegación y comparaciones de período. `state.js` persistirá el período independiente de Auditoría y el estado de comparación de Categorías; `main.js` sólo orquestará borradores de UI y confirmaciones. Los servicios financieros calcularán comparaciones con períodos y filtros explícitos, sin mutar el estado.

**Tech Stack:** ES modules nativos, IndexedDB mediante el almacenamiento actual, Node `assert/strict` para pruebas, CSS propio y PWA con service worker.

## Global Constraints

- Usar ES modules nativos, dos espacios, punto y coma, comillas simples y camelCase.
- No introducir `<select>` nativos; los controles móviles son propios, compactos y cerrables.
- Transferencias vinculadas no afectan ingresos, gastos ni presupuesto; las comparaciones tampoco pueden alterar movimientos, presupuestos, cuentas, balances ni trazabilidad.
- La referencia visual obligatoria es 390 × 844, con targets de al menos 44 px, sin overflow ni superposición con navegación/safe areas.
- No versionar datos reales, CSV, respaldos ni capturas privadas. Las pruebas visuales con datos reales son sólo lectura tras respaldo confirmado.
- Todo JavaScript modificado requiere `node --check`; al cambiar módulos o estilos, aumentar el cache de `service-worker.js` y mantener el shell completo.

---

## Estructura de archivos y límites

| Archivo | Responsabilidad tras el cambio |
| --- | --- |
| `src/services/periodService.js` | Funciones puras de borrador, presets, validación, desplazamiento y período comparable. |
| `src/state.js` | Estado persistente `auditPeriod`, migración segura y estado de comparación de Categorías. |
| `src/components/periodPicker.js` | Sheet visual reutilizable, sin mutar estado confirmado. |
| `src/components/ui.js` | Flechas globales que delegan el desplazamiento al servicio puro. |
| `src/main.js` | Apertura, edición temporal, calendario, confirmación y persistencia de cada ámbito. |
| `src/services/financeService.js` | Filtrado y resúmenes comparativos puros para Auditoría y Categorías. |
| `src/screens/audit.js` | Sello de período local, filtros compactos y resumen comparativo. |
| `src/screens/categories.js` | Variación por tarjeta y resumen de comparación de gasto. |
| `src/components/keypad.js` | Teclado sin acceso duplicado al calendario. |
| `styles/screens.css`, `styles/components.css` | Layout vertical del selector, filtros compactos, tarjetas comparativas y keypad de cuatro columnas. |
| `tests/period-scope.test.mjs` | Reglas puras de período, migración y no mutación. |
| `tests/comparison-analysis.test.mjs` | Comparación filtrada de Auditoría/Categorías y referencia vacía. |
| `tests/mobile-ui-contract.test.mjs` | Contratos de markup/CSS para selector, filtros y keypad. |
| `service-worker.js` | Cache actualizado con el nuevo servicio. |

## Interfaces que se implementarán

```js
// src/services/periodService.js
export function createPeriodDraft(period, options = {});
export function migrateAuditPeriod(period);
export function applyDraftPreset(draft, preset, dashboardPeriod);
export function setDraftDate(draft, field, value);
export function shiftPeriod(period, delta);
export function validatePeriodDraft(draft);
export function isComparisonAvailable(period);
export function comparisonPeriod(period);

// src/services/financeService.js
export function filterAuditTransactions(rows, filters);
export function buildAuditComparison(state, period, filters);
export function buildCategoryComparison(state, period, filters);
```

`buildAuditComparison` devuelve `{ currentRows, previousRows, currentTotal, previousTotal, delta, percent, previousPeriod }`. `buildCategoryComparison` devuelve `{ rows, currentSpent, previousSpent, delta, percent, previousPeriod }`, donde cada fila incluye `previousSpent`, `spentDelta` y `spentDeltaPercent` (`null` cuando no hay base anterior).

### Task 1: Crear el dominio puro de períodos y migrar estado persistente

**Files:**
- Create: `src/services/periodService.js`
- Modify: `src/state.js`
- Create: `tests/period-scope.test.mjs`

**Consumes:** `currentMonth`, `monthStart`, `monthEnd` y `previousEquivalentPeriod` de `src/utils/format.js`.

**Produces:** Borradores aislados, navegación que conserva el modo y `state.auditPeriod` persistible para los siguientes tasks.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `tests/period-scope.test.mjs` con los casos deterministas siguientes:

```js
import assert from 'node:assert/strict';
import {
  applyDraftPreset,
  comparisonPeriod,
  createPeriodDraft,
  isComparisonAvailable,
  migrateAuditPeriod,
  shiftPeriod,
  validatePeriodDraft
} from '../src/services/periodService.js';

const may = { mode: 'month', month: '2026-05' };
const draft = createPeriodDraft(may, { scope: 'global', compare: false });
assert.deepEqual(draft, { scope: 'global', mode: 'month', month: '2026-05', year: 2026, from: '', to: '', compare: false, tab: 'range' });
assert.deepEqual(shiftPeriod(may, -1), { mode: 'month', month: '2026-04' });
assert.deepEqual(shiftPeriod({ mode: 'year', year: 2026, month: '2026-01' }, 1), { mode: 'year', year: 2027, month: '2027-01' });
assert.deepEqual(shiftPeriod({ mode: 'range', from: '2026-05-01', to: '2026-05-31', month: '2026-05' }, -1), { mode: 'range', from: '2026-03-31', to: '2026-04-30', month: '2026-03' });
assert.deepEqual(comparisonPeriod({ mode: 'range', from: '2026-05-01', to: '2026-05-31' }), { mode: 'range', from: '2026-03-31', to: '2026-04-30' });
assert.equal(validatePeriodDraft({ mode: 'range', from: '2026-05-31', to: '2026-05-01' }).ok, false);
assert.equal(isComparisonAvailable({ mode: 'all' }), false);
assert.deepEqual(migrateAuditPeriod(), { mode: 'all', compare: false });
assert.deepEqual(applyDraftPreset(createPeriodDraft({ mode: 'all' }, { scope: 'audit' }), 'dashboard', may).mode, 'month');
console.log('period-scope.test.mjs passed');
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `node tests/period-scope.test.mjs`

Expected: falla por no encontrar `src/services/periodService.js`.

- [ ] **Step 3: Implementar el módulo puro y la migración mínima**

Crear `src/services/periodService.js` con estas reglas; no importar `state.js` ni tocar el DOM:

```js
import { currentMonth, monthEnd, monthStart, previousEquivalentPeriod } from '../utils/format.js';

const isIsoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const monthFor = period => period?.month || currentMonth();

export function migrateAuditPeriod(period) {
  if (period?.mode === 'all') return { mode: 'all', compare: false };
  const draft = createPeriodDraft(period, { scope: 'audit', compare: Boolean(period?.compare) });
  const validation = validatePeriodDraft(draft);
  return validation.ok ? stripDraft(draft) : { mode: 'all', compare: false };
}

export function createPeriodDraft(period = {}, { scope = 'global', compare = false } = {}) {
  if (scope === 'audit' && period.mode === 'all') return { scope, mode: 'all', month: monthFor(period), year: Number(monthFor(period).slice(0, 4)), from: '', to: '', compare: false, tab: 'range' };
  const mode = ['month', 'year', 'range'].includes(period.mode) ? period.mode : 'month';
  const month = monthFor(period);
  const year = Number(period.year || month.slice(0, 4));
  const bounds = mode === 'range' ? { from: period.from || monthStart(month), to: period.to || monthEnd(month) } : { from: '', to: '' };
  return { scope, mode, month, year, ...bounds, compare: Boolean(period.compare ?? compare), tab: mode === 'year' ? 'year' : 'range' };
}

export function applyDraftPreset(draft, preset, dashboardPeriod) {
  if (preset === 'all') return { ...draft, mode: 'all', from: '', to: '', compare: false, tab: 'range' };
  if (preset === 'dashboard') return { ...createPeriodDraft(dashboardPeriod, { scope: draft.scope }), compare: false, tab: 'range' };
  const now = currentMonth();
  if (preset === 'thisMonth') return { ...draft, mode: 'month', month: now, year: Number(now.slice(0, 4)), from: '', to: '', tab: 'range' };
  if (preset === 'lastMonth') return { ...draft, ...shiftPeriod({ mode: 'month', month: now }, -1), from: '', to: '', tab: 'range' };
  if (preset === 'thisYear') return { ...draft, mode: 'year', year: Number(now.slice(0, 4)), month: `${now.slice(0, 4)}-01`, from: '', to: '', tab: 'year' };
  if (preset === 'custom') return { ...draft, mode: 'range', from: draft.from || `${now}-01`, to: draft.to || monthEnd(now), month: (draft.from || now).slice(0, 7), tab: 'range' };
  return draft;
}

export function setDraftDate(draft, field, value) {
  const next = { ...draft, mode: 'range', [field]: value, month: value.slice(0, 7), tab: 'range' };
  return next;
}

export function shiftPeriod(period, delta) {
  if (period.mode === 'year') {
    const year = Number(period.year || period.month?.slice(0, 4)) + delta;
    return { mode: 'year', year, month: `${year}-01` };
  }
  if (period.mode === 'range') {
    const start = new Date(`${period.from}T12:00:00`);
    const end = new Date(`${period.to}T12:00:00`);
    const days = Math.round((end - start) / 86400000) + 1;
    const from = shiftIsoDate(period.from, days * delta);
    const to = shiftIsoDate(period.to, days * delta);
    return { mode: 'range', from, to, month: from.slice(0, 7) };
  }
  const [year, month] = monthFor(period).split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return { mode: 'month', month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` };
}

function shiftIsoDate(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function validatePeriodDraft(draft) {
  if (draft.mode === 'all') return { ok: true };
  if (draft.mode !== 'range') return { ok: true };
  if (!isIsoDate(draft.from) || !isIsoDate(draft.to)) return { ok: false, message: 'Selecciona ambas fechas.' };
  if (draft.from > draft.to) return { ok: false, message: 'La fecha inicial no puede ser posterior a la final.' };
  return { ok: true };
}

export function isComparisonAvailable(period) {
  return period?.mode !== 'all';
}

export function comparisonPeriod(period) {
  return { mode: 'range', ...previousEquivalentPeriod(period) };
}

function stripDraft(draft) {
  const { scope, tab, ...period } = draft;
  return period;
}
```

En `src/state.js`, importar `migrateAuditPeriod`, añadir `auditPeriod: { mode: 'all', compare: false }` en `initialState`, añadir `compare: false` al filtro de Categorías y, dentro de `mergeState`, añadir:

```js
merged.auditPeriod = migrateAuditPeriod(saved.auditPeriod);
merged.filters.categories = {
  ...initialState.filters.categories,
  ...(saved.filters?.categories || {}),
  compare: Boolean(saved.filters?.categories?.compare)
};
```

- [ ] **Step 4: Ejecutar las pruebas para comprobar que pasan**

Run: `node tests/period-scope.test.mjs`

Expected: `period-scope.test.mjs passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/services/periodService.js src/state.js tests/period-scope.test.mjs
git commit -m "feat: add scoped period domain"
```

### Task 2: Conectar borradores confirmables al selector global y de Auditoría

**Files:**
- Modify: `src/components/periodPicker.js`
- Modify: `src/components/ui.js`
- Modify: `src/main.js`
- Modify: `src/screens/audit.js`
- Modify: `styles/components.css`
- Modify: `styles/screens.css`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Consumes:** `createPeriodDraft`, `applyDraftPreset`, `setDraftDate`, `shiftPeriod`, `validatePeriodDraft` e `isComparisonAvailable` del Task 1.

**Produces:** Selector sin mutación anticipada, período local de Auditoría y contexto visible para los cálculos del Task 3.

- [ ] **Step 1: Extender el contrato visual que debe fallar**

Agregar a `tests/mobile-ui-contract.test.mjs` estas aserciones:

```js
const periodPicker = await readFile(new URL('../src/components/periodPicker.js', import.meta.url), 'utf8');
assert.match(periodPicker, /data-period-scope/);
assert.match(periodPicker, /data-period-compare/);
assert.match(periodPicker, /data-period-copy-dashboard/);
assert.doesNotMatch(periodPicker, /data-period-tab="compare"/);
assert.match(audit, /data-open-audit-period/);
assert.match(styles, /\.period-sheet-footer\s*\{[\s\S]*?position:\s*sticky/);
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `node tests/mobile-ui-contract.test.mjs`

Expected: falla al no encontrar el nuevo markup del selector y el sello de Auditoría.

- [ ] **Step 3: Implementar el flujo de borrador y retorno desde calendario**

Cambiar la firma de `renderPeriodSheet` a `renderPeriodSheet(draft, options)`. El sheet debe tener `data-period-scope`, tabs sólo `Por rango`/`Por año`, un botón `Todo el historial` y `Copiar período del dashboard` únicamente para `scope === 'audit'`, y el control siguiente sólo cuando `options.showComparison`:

```js
<label class="analysis-toggle period-compare-toggle">
  <span><strong>Comparar con período anterior</strong><small>${options.previousLabel}</small></span>
  <input type="checkbox" data-period-compare ${draft.compare ? 'checked' : ''} ${draft.mode === 'all' ? 'disabled' : ''}>
  <i></i>
</label>
```

Usar este pie fijo en lugar de botones sueltos:

```js
<div class="period-sheet-footer">
  <button class="secondary-button" data-period-close>Cancelar</button>
  <button class="primary-button" data-period-apply>Aplicar</button>
</div>
```

En `main.js`, sustituir las mutaciones directas de `state.period` por helpers equivalentes a estos:

```js
function openPeriodSheet(scope) {
  const period = scope === 'audit' ? state.auditPeriod : state.period;
  const compare = scope === 'audit' ? Boolean(state.auditPeriod.compare) : Boolean(state.filters.categories.compare);
  state.ui.periodDraft = createPeriodDraft(period, { scope, compare });
  openSheet('period');
}

async function applyPeriodDraft() {
  const draft = state.ui.periodDraft;
  const validation = validatePeriodDraft(draft);
  if (!validation.ok) {
    state.ui.periodDraft = { ...draft, error: validation.message };
    render();
    return;
  }
  const { scope, tab, error, compare, ...period } = draft;
  if (scope === 'audit') state.auditPeriod = { ...period, compare: Boolean(compare && isComparisonAvailable(period)) };
  else {
    state.period = period;
    if (state.activeView === 'categories') state.filters.categories.compare = Boolean(compare && isComparisonAvailable(period));
  }
  state.ui.periodDraft = null;
  closeSheet();
  await persist();
  render();
}
```

Abrir el selector global con `openPeriodSheet('global')` desde `cfo:period`. Añadir `[data-open-audit-period]` en `renderAudit` para abrir `openPeriodSheet('audit')`. El sello debe usar `Todo el historial` o `periodLabel(state.auditPeriod)` y comparar ese texto contra `periodLabel(state.period)`.

Para fechas, usar `state.ui.calendarTarget = 'period:global:from'` o `period:audit:to`. Al confirmar calendario, actualizar únicamente `state.ui.periodDraft = setDraftDate(...)`, volver a `state.ui.activeSheet = 'period'` y renderizar; no persistir ni cerrar el selector. Al cancelar calendario, volver también al sheet de período sin tocar el borrador.

En el listener genérico de `[data-sheet-close]`, insertar antes de `closeSheet()` esta ruta de retorno para no perder el borrador:

```js
if (state.ui.activeSheet === 'calendar' && String(state.ui.calendarTarget || '').startsWith('period:')) {
  state.ui.activeSheet = 'period';
  state.ui.calendarTarget = null;
  render();
  return;
}
```

En `components/ui.js`, reemplazar `shiftMonth` por `shiftPeriod(state.period, delta)` y persistir/renderizar sólo el resultado confirmado. Mantener el header global aun estando en Auditoría; el sello local explica la diferencia y ofrece su propio `Cambiar`.

Agregar estilos para `.period-sheet`, `.period-sheet-content`, `.period-sheet-footer` y `.period-compare-toggle`: a 420 px los campos Desde/Hasta son una columna, el footer queda sticky al fondo del sheet con fondo opaco y padding que respeta safe area.

- [ ] **Step 4: Ejecutar la prueba y comprobaciones sintácticas**

Run:

```powershell
node --check src/services/periodService.js
node --check src/components/periodPicker.js
node --check src/components/ui.js
node --check src/main.js
node --check src/screens/audit.js
node tests/period-scope.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Expected: todos terminan con código 0; las dos pruebas imprimen `passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/components/periodPicker.js src/components/ui.js src/main.js src/screens/audit.js styles/components.css styles/screens.css tests/mobile-ui-contract.test.mjs
git commit -m "feat: add confirmable scoped period pickers"
```

### Task 3: Crear cálculos comparativos puros y mostrarlos en Auditoría

**Files:**
- Modify: `src/services/financeService.js`
- Modify: `src/screens/audit.js`
- Create: `tests/comparison-analysis.test.mjs`

**Consumes:** `comparisonPeriod` del Task 1 y `state.auditPeriod` del Task 2.

**Produces:** Resultados filtrados y no mutables para Auditoría; Categorías los reutilizará en el Task 4.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `tests/comparison-analysis.test.mjs` con una fixture de abril/mayo y estas aserciones:

```js
import assert from 'node:assert/strict';
import { buildAuditComparison } from '../src/services/financeService.js';

const state = {
  categories: [{ name: 'Comida', subcategories: [] }, { name: 'Hogar', subcategories: [] }],
  budgets: [],
  transactions: [
    { id: 'apr-food', date: '2026-04-05', movement: 'Gasto', account: 'Caja', category: 'Comida', subcategory: '', amount: 120 },
    { id: 'apr-home', date: '2026-04-06', movement: 'Gasto', account: 'Caja', category: 'Hogar', subcategory: '', amount: 30 },
    { id: 'may-food', date: '2026-05-05', movement: 'Gasto', account: 'Caja', category: 'Comida', subcategory: '', amount: 80 },
    { id: 'may-trip', date: '2026-05-07', movement: 'Gasto', account: 'Caja', category: 'Transporte', subcategory: '', amount: 20 },
    { id: 'may-income', date: '2026-05-06', movement: 'Ingreso', account: 'Caja', category: '', subcategory: '', amount: 900 }
  ]
};
const before = structuredClone(state);
const result = buildAuditComparison(state, { mode: 'month', month: '2026-05', compare: true }, {
  text: '', accounts: [], types: ['Gasto'], categories: ['Comida'], subcategories: []
});
assert.equal(result.currentRows.length, 1);
assert.equal(result.previousRows.length, 1);
assert.equal(result.currentTotal, -80);
assert.equal(result.previousTotal, -120);
assert.equal(result.delta, 40);
assert.equal(result.percent, 33.33333333333333);
assert.deepEqual(state, before);
const noBase = buildAuditComparison(state, { mode: 'month', month: '2026-05', compare: true }, {
  text: '', accounts: [], types: ['Gasto'], categories: ['Transporte'], subcategories: []
});
assert.equal(noBase.previousTotal, 0);
assert.equal(noBase.percent, null);
console.log('comparison-analysis.test.mjs passed');
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `node tests/comparison-analysis.test.mjs`

Expected: falla porque `buildAuditComparison` no se exporta.

- [ ] **Step 3: Implementar el servicio y la tarjeta de comparación**

En `financeService.js`, extraer el filtrado hoy privado de `audit.js` como `filterAuditTransactions(rows, filters)`. Debe conservar la búsqueda sobre descripción/categoría/subcategoría/cuenta/tipo, selección múltiple y orden descendente por fecha.

Implementar `buildAuditComparison` con este cuerpo de cálculo:

```js
export function buildAuditComparison(state, period, filters) {
  const currentRows = filterAuditTransactions(periodTransactions(state, period), filters);
  if (!period.compare || period.mode === 'all') {
    return { currentRows, previousRows: [], currentTotal: sumSigned(currentRows), previousTotal: 0, delta: 0, percent: null, previousPeriod: null };
  }
  const previousPeriod = comparisonPeriod(period);
  const previousRows = filterAuditTransactions(periodTransactions(state, previousPeriod), filters);
  const currentTotal = sumSigned(currentRows);
  const previousTotal = sumSigned(previousRows);
  const delta = currentTotal - previousTotal;
  return {
    currentRows,
    previousRows,
    currentTotal,
    previousTotal,
    delta,
    percent: previousTotal === 0 ? null : (delta / Math.abs(previousTotal)) * 100,
    previousPeriod
  };
}

function sumSigned(rows) {
  return rows.reduce((sum, tx) => sum + (tx.movement === 'Gasto' ? -Number(tx.amount || 0) : Number(tx.amount || 0)), 0);
}
```

Añadir al inicio de `periodTransactions`:

```js
if (period?.mode === 'all') return state.transactions.filter(tx => parseDate(tx.date));
```

En `audit.js`, reemplazar `periodTransactions(state)` y `filterRows` por `buildAuditComparison(state, state.auditPeriod, filters)`. La lista usa únicamente `comparison.currentRows`. Encima del subtotal, renderizar una tarjeta sólo si `state.auditPeriod.compare` con total actual, total anterior, diferencia y porcentaje; cuando `percent === null`, mostrar `Sin base anterior`. No presentar `previousRows` como registros.

- [ ] **Step 4: Ejecutar las pruebas focalizadas**

Run:

```powershell
node --check src/services/financeService.js
node --check src/screens/audit.js
node tests/comparison-analysis.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
```

Expected: todas pasan; edición, capacidad y transferencias conservan su comportamiento.

- [ ] **Step 5: Commit**

```powershell
git add src/services/financeService.js src/screens/audit.js tests/comparison-analysis.test.mjs
git commit -m "feat: add filtered audit comparison"
```

### Task 4: Comparar Categorías y aplicar la compactación aprobada

**Files:**
- Modify: `src/services/financeService.js`
- Modify: `src/screens/categories.js`
- Modify: `src/screens/audit.js`
- Modify: `src/main.js`
- Modify: `src/components/keypad.js`
- Modify: `styles/screens.css`
- Modify: `tests/comparison-analysis.test.mjs`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Consumes:** `buildAuditComparison`, `comparisonPeriod`, `state.filters.categories.compare` y los selectores propios existentes.

**Produces:** Variación por categoría, filtros compactos de Auditoría y registro de ingreso sin calendario duplicado.

- [ ] **Step 1: Extender pruebas de comparación y contrato móvil**

Agregar a `tests/comparison-analysis.test.mjs`:

```js
import { buildCategoryComparison } from '../src/services/financeService.js';
const categoryResult = buildCategoryComparison(state, { mode: 'month', month: '2026-05' }, {
  text: '', categories: ['Comida'], view: 'spend'
});
assert.equal(categoryResult.rows.length, 1);
assert.equal(categoryResult.rows[0].name, 'Comida');
assert.equal(categoryResult.rows[0].spent, 80);
assert.equal(categoryResult.rows[0].previousSpent, 120);
assert.equal(categoryResult.rows[0].spentDelta, -40);
assert.equal(categoryResult.rows[0].spentDeltaPercent, -33.33333333333333);
```

Agregar a `tests/mobile-ui-contract.test.mjs`:

```js
assert.match(categories, /class="category-comparison-summary"/);
assert.match(categories, /class="category-comparison-note"/);
assert.match(audit, /data-toggle-audit-filters/);
assert.match(styles, /\.audit-filter-panel\s*\{[\s\S]*?position:\s*relative/);
assert.match(styles, /\.keypad\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, 1fr\)/);
const keypad = await readFile(new URL('../src/components/keypad.js', import.meta.url), 'utf8');
assert.doesNotMatch(keypad, /key\('calendar'/);
```

- [ ] **Step 2: Ejecutar pruebas para comprobar que fallan**

Run:

```powershell
node tests/comparison-analysis.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Expected: ambas fallan por las exportaciones y clases aún ausentes.

- [ ] **Step 3: Implementar comparación de Categorías y ritmo móvil**

En `financeService.js`, implementar `buildCategoryComparison` sin escribir en `state`:

```js
export function buildCategoryComparison(state, period, filters = {}) {
  const visible = row => {
    if (filters.text && !canon(row.name).includes(canon(filters.text))) return false;
    if (filters.categories?.length && !filters.categories.some(name => canon(name) === canon(row.name))) return false;
    if (filters.view === 'budget') return row.planned > 0;
    if (filters.view === 'spend') return row.spent > 0;
    return row.planned > 0 || row.spent > 0;
  };
  const currentRows = categoryRows(state, period).filter(visible);
  const previousByName = new Map(categoryRows(state, comparisonPeriod(period)).map(row => [canon(row.name), row]));
  const rows = currentRows.map(row => {
    const previousSpent = Number(previousByName.get(canon(row.name))?.spent || 0);
    const spentDelta = row.spent - previousSpent;
    return { ...row, previousSpent, spentDelta, spentDeltaPercent: previousSpent === 0 ? null : (spentDelta / previousSpent) * 100 };
  });
  const currentSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const previousSpent = rows.reduce((sum, row) => sum + row.previousSpent, 0);
  return { rows, currentSpent, previousSpent, delta: currentSpent - previousSpent, percent: previousSpent === 0 ? null : ((currentSpent - previousSpent) / previousSpent) * 100, previousPeriod: comparisonPeriod(period) };
}
```

En `categories.js`, usar `buildCategoryComparison` cuando `filters.compare && filters.view !== 'budget'`; de lo contrario conservar `categoryRows`. Renderizar `.category-comparison-summary` con el total y la referencia; en `categoryCard`, renderizar `.category-comparison-note` debajo de la barra con `vs. período anterior`, diferencia y porcentaje o `Sin base anterior`. No añadir esa línea si comparar está apagado o la vista es `budget`.

En `audit.js`, sustituir la fila permanente de cuatro chips por un botón `data-toggle-audit-filters` que muestra `Filtros` o `Filtros (n)`. Al abrir, renderizar un contenedor `.audit-filter-panel` con los cuatro `selectorChip`; conservar los dropdowns anclados, `Listo`, búsqueda y selección múltiple dentro de ese panel. Mantener los chips activos como resumen removible.

En `main.js`, añadir `auditFiltersOpen: false` a `initialState.ui`; cerrar el panel cuando se limpia o cambia la vista. Usar una función de persistencia con debounce de 250 ms para cambios de filtros de Auditoría y Categorías:

```js
let filterPersistTimer = 0;
function renderAndPersistFilters() {
  window.clearTimeout(filterPersistTimer);
  render();
  filterPersistTimer = window.setTimeout(() => {
    persist().catch(error => captureError('filter persistence', error));
  }, 250);
}
```

Llamar `renderAndPersistFilters()` desde búsqueda, limpiar, selector de cuenta/tipo/categoría/subcategoría, categorías seleccionadas, vista y toggle de comparación. No usar `mutate`, porque son preferencias de vista y no deben crear undo financiero.

En `components/keypad.js`, eliminar el botón `calendar` y la rama `else if (key === 'calendar')`. En `main.js`, eliminar `onCalendarOpen` al crear el keypad. En CSS, cambiar `.keypad` a cuatro columnas y `.keypad .confirm` a `grid-column: span 3; grid-row: auto;` para que el keypad siga mostrando todos los dígitos, operadores, moneda, retroceso y confirmación con targets de 44 px o más.

- [ ] **Step 4: Ejecutar las pruebas focalizadas**

Run:

```powershell
node --check src/main.js
node --check src/services/financeService.js
node --check src/screens/audit.js
node --check src/screens/categories.js
node --check src/components/keypad.js
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Expected: todos terminan con código 0 y las tres pruebas imprimen `passed`.

- [ ] **Step 5: Commit**

```powershell
git add src/services/financeService.js src/screens/categories.js src/screens/audit.js src/main.js src/components/keypad.js styles/screens.css tests/comparison-analysis.test.mjs tests/mobile-ui-contract.test.mjs
git commit -m "feat: compare categories and compact mobile flows"
```

### Task 5: Actualizar PWA, documentación y verificación integral

**Files:**
- Modify: `service-worker.js`
- Modify: `PROGRESS.md`
- Modify: `VERIFIER.md`
- Modify: `BACKLOG.md`
- Modify: `V7_ROADMAP.md`

**Consumes:** Todos los módulos y pruebas de los Tasks 1–4.

**Produces:** PWA que carga los módulos nuevos y evidencia operativa honesta antes de publicación.

- [ ] **Step 1: Añadir la regresión de cache que debe fallar**

Agregar al final de `tests/mobile-ui-contract.test.mjs`:

```js
const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.match(worker, /cfo-personal-v7-cache-30/);
assert.match(worker, /'\.\/src\/services\/periodService\.js'/);
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `node tests/mobile-ui-contract.test.mjs`

Expected: falla porque el cache actual es `cfo-personal-v7-cache-29` y no conoce el nuevo servicio.

- [ ] **Step 3: Implementar cache y actualizar evidencia documental**

En `service-worker.js`, reemplazar exactamente:

```js
const CACHE_NAME = 'cfo-personal-v7-cache-29';
```

por:

```js
const CACHE_NAME = 'cfo-personal-v7-cache-30';
```

e insertar `'./src/services/periodService.js'` junto a los demás servicios de `APP_SHELL`.

En `PROGRESS.md`, cambiar el estado de diseño aprobado a implementado sólo después de completar Task 4 y las pruebas automáticas. En `VERIFIER.md`, marcar únicamente las comprobaciones que tengan salida de prueba o captura visual adjunta; conservar sin marcar la validación con datos reales respaldados hasta realizarla. En `BACKLOG.md` y `V7_ROADMAP.md`, mover este bloque a validación con datos reales, no a completado, hasta que se recoja esa evidencia.

- [ ] **Step 4: Ejecutar la batería completa y revisión móvil**

Run:

```powershell
node --check src/services/periodService.js
node --check src/state.js
node --check src/components/periodPicker.js
node --check src/components/ui.js
node --check src/components/keypad.js
node --check src/services/financeService.js
node --check src/screens/audit.js
node --check src/screens/categories.js
node --check src/screens/recordFlow.js
node --check src/main.js
node --check service-worker.js
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/mobile-ui-contract.test.mjs
git diff --check
```

Expected: todos terminan con código 0; las pruebas imprimen `passed` y `git diff --check` no produce salida.

Iniciar `python -m http.server 8787`, abrir `http://127.0.0.1:8787/` a 390 × 844 y capturar evidencia de:

1. Global: preset no cambia hasta Aplicar; Cancelar conserva encabezado; flechas de mes, año y rango conservan modo.
2. Auditoría: Todo el historial, sello independiente, Copiar período del dashboard, persistencia tras recargar y comparación filtrada por cuenta/tipo/categoría/subcategoría.
3. Categorías: comparación apagada, comparación activa, selección de categorías, Solo gasto y Solo presupuesto sin variación.
4. Registro de ingreso: fecha sólo desde el campo, keypad sin calendario duplicado, monto/guardar visibles.
5. Dropdowns, footer del selector, textos largos, importes y navegación inferior sin overflow ni controles tapados.

Antes de abrir datos reales, pedir o confirmar un respaldo JSON existente. Durante esa revisión, no crear, editar ni borrar registros reales; usar una sesión/perfil de prueba para datos sintéticos si hace falta probar persistencia de escritura.

- [ ] **Step 5: Commit**

```powershell
git add service-worker.js PROGRESS.md VERIFIER.md BACKLOG.md V7_ROADMAP.md tests/mobile-ui-contract.test.mjs
git commit -m "chore: verify scoped periods release"
```

## Cobertura de la especificación

| Requisito aprobado | Task |
| --- | --- |
| Borrador, Aplicar, Cancelar y flechas por modo | 1, 2 |
| Auditoría independiente, Todo el historial y copia puntual | 1, 2 |
| Comparar sólo Auditoría/Categorías, período anterior equivalente y sin mutación | 1, 3, 4 |
| Filtros simétricos de Auditoría y variación por categoría | 3, 4 |
| Solo gasto/Combinado vs Solo presupuesto | 4 |
| Selector vertical, filtros compactos y keypad sin calendario duplicado | 2, 4 |
| PWA, pruebas, evidencia móvil y documentos operativos | 5 |
