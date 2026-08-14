# Oleada 1.1 — Recuperación de Registro y pulido de selectores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperar el feedback inmediato y completo de la calculadora de Registro, acercar los controles del calendario al pulgar y entregar un selector global de períodos compacto, simétrico y sin textos visuales redundantes.

**Architecture:** El keypad se extrae a un binder local que sólo opera dentro de `#record-root`, con listeners que capturan su propio controlador. El calendario recibe variantes explícitas `record` y `period`; sólo la primera adopta la nueva composición. El selector deriva la selección visible desde el borrador, conserva un gate de aplicación en `state.ui.periodDraftApplyEnabled` y separa la geometría compacta global de la variante alta de Auditoría.

**Tech Stack:** ES modules nativos, DOM/CSS sin framework, Node.js `assert`, servidor HTTP local, Browser QA.

## Global Constraints

- No modificar reglas financieras, saldos, presupuestos, transferencias, provisiones, persistencia de movimientos ni la independencia entre `period` y `auditPeriod`.
- No introducir dependencias ni `<select>` nativos.
- Referencia móvil obligatoria: 390 × 844; targets táctiles mínimos de 44 px.
- La calculadora conserva la cuadrícula clásica de cuatro columnas y el guardado financiero sigue siendo la única confirmación del movimiento.
- La nueva composición del calendario se aplica sólo cuando `context === 'record'`; `Desde`/`Hasta` conservan la composición actual.
- No mostrar texto visible `Seleccionado` ni `Selección actual`; la selección usa superficie/borde, check sin texto y `aria-pressed`.
- En móvil, los ocho años usan dos columnas por cuatro filas; el sheet global usa altura exacta `min(640px, calc(100dvh - 24px))` con fallback `vh`; Auditoría conserva 760 px.
- `Aplicar` se deshabilita cuando el borrador no tiene representación visible. `Usar período del dashboard` es una acción explícita que vuelve a habilitarlo; un cambio posterior de pestaña vuelve a evaluar el gate.
- Un único commit publicado para toda la Oleada 1.1. Los commits temporales de tareas se aplastan localmente antes del gate final.
- Ningún push ni publicación sin autorización textual fresca del SHA final y del repositorio remoto exacto.

---

### Task 1: Controlador local y regresión integrada del keypad

**Files:**
- Create: `src/components/recordKeypad.js`
- Modify: `src/main.js:26,462-532`
- Create: `tests/record-keypad-integration.test.mjs`
- Modify: `tests/keypad.test.mjs`
- Modify: `tests/record-flow.test.mjs`

**Interfaces:**
- Produces: `bindRecordKeypad(root, flow, { clearValidation }) -> controller | null`.
- `root` consume `querySelector`, `querySelectorAll` y botones con `data-key`.
- `flow` conserva `amountExpression`, `displayAmount`, `keypadError`, `keypadState` y `amount`.
- `main.js` deja de declarar `let keypad` y llama al binder local desde `bindRecordEvents(root)`.

- [ ] **Step 1: Escribir el test integrado que reproduce la rotura.**

Crear botones y nodos DOM mínimos con listeners reales y verificar el orden de enlace que rompió la Oleada 0:

```js
const screenRoot = fakeRoot();
const record = recordFixture();
const sheetRoot = fakeRoot();

assert.equal(bindRecordKeypad(screenRoot, flow, { clearValidation }), null);
const controller = bindRecordKeypad(record.root, flow, { clearValidation });
assert.ok(controller);
assert.equal(bindRecordKeypad(sheetRoot, flow, { clearValidation }), null);

record.keys.get('1').click();
assert.equal(flow.amountExpression, '1');
assert.equal(record.amount.textContent, 'USD 1');
assert.equal(record.backspace.disabled, false);

record.keys.get('back').click();
assert.equal(flow.amountExpression, '');
assert.equal(record.amount.textContent, 'USD 0');
assert.equal(record.backspace.disabled, true);
```

- [ ] **Step 2: Ejecutar el test y observar RED.**

Run: `node tests/record-keypad-integration.test.mjs`

Expected: FAIL por ausencia de `src/components/recordKeypad.js` o `bindRecordKeypad`; no aceptar un fallo de fixture o sintaxis.

- [ ] **Step 3: Implementar el binder mínimo.**

```js
import { createKeypadController } from './keypad.js';

export function bindRecordKeypad(root, flow, { clearValidation = () => {} } = {}) {
  const buttons = [...(root?.querySelectorAll?.('[data-key]') || [])];
  const amount = root.querySelector('[data-record-amount]');
  if (!flow || !amount || !buttons.length) return null;

  const error = root.querySelector('[data-record-amount-error]');
  const backspace = root.querySelector('[data-record-backspace]');
  const controller = createKeypadController({
    initial: flow.amountExpression || '',
    onChange: keypadState => {
      flow.amountExpression = keypadState.expression;
      flow.displayAmount = keypadState.display;
      flow.keypadError = keypadState.error || '';
      flow.keypadState = keypadState;
      clearValidation(flow, 'amount');
      if (Number.isFinite(keypadState.value)) flow.amount = keypadState.value;
      if (amount) amount.textContent = `USD ${keypadState.display}`;
      if (error) {
        error.textContent = keypadState.error || '';
        error.hidden = !keypadState.error;
      }
      if (backspace) backspace.disabled = !keypadState.expression;
    }
  });
  buttons.forEach(button => button.addEventListener('click', () => controller.press(button.dataset.key)));
  return controller;
}
```

- [ ] **Step 4: Sustituir el controlador global en `main.js`.**

Importar `bindRecordKeypad`, eliminar `let keypad` y reemplazar el bloque de creación/listeners por:

```js
if (state.ui.recordFlow?.step === 'form') {
  bindRecordKeypad(root, state.ui.recordFlow, { clearValidation: clearRecordValidation });
}
```

- [ ] **Step 5: Completar la matriz pura y de formulario.**

En `keypad.test.mjs`, añadir literales para cero inicial, decimal único, sustitución de operador, `+`, `−`, `×`, `÷`, precedencia, división por cero, negativo y borrado hasta vacío. En `record-flow.test.mjs`, añadir payload/validación literal para ingreso, transferencia, presupuesto, provisión y edición; no duplicar pruebas de persistencia que ya pertenecen a `transaction-edit.test.mjs`.

- [ ] **Step 6: Verificar GREEN y regresiones enfocadas.**

Run:

```powershell
node tests/record-keypad-integration.test.mjs
node tests/keypad.test.mjs
node tests/record-flow.test.mjs
node tests/render-coordinator.test.mjs
```

Expected: todos con código 0. Confirmar mediante mutación temporal que reemplazar el controller capturado por uno externo hace fallar `record-keypad-integration.test.mjs`; restaurar inmediatamente el código verde.

- [ ] **Step 7: Crear commit temporal de Task 1.**

```powershell
git add src/components/recordKeypad.js src/main.js tests/record-keypad-integration.test.mjs tests/keypad.test.mjs tests/record-flow.test.mjs
git commit -m "fix: restore record keypad feedback"
```

---

### Task 2: Variante de calendario para Registro

**Files:**
- Modify: `src/components/calendar.js`
- Modify: `src/main.js:267-273`
- Modify: `styles/components.css`
- Modify: `styles/screens.css:930-1020`
- Create: `tests/calendar.test.mjs`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- `renderCalendarSheet({ selectedDate, visibleMonth, title, context = 'period' })`.
- `context: 'record'` produce orden `grid → navegación → atajos → Listo`, sin `Fecha seleccionada` ni `Personalizado`.
- `context: 'period'` conserva el markup y orden actuales.
- Cada día usa `aria-label` con fecha completa, `aria-pressed` y `aria-current="date"` sólo para hoy.

- [ ] **Step 1: Escribir contratos RED del HTML real.**

```js
const record = renderCalendarSheet({
  selectedDate: '2026-08-14',
  visibleMonth: '2026-08',
  context: 'record'
});
assert.ok(record.indexOf('calendar-grid') < record.indexOf('data-cal-nav="-1"'));
assert.ok(record.indexOf('data-cal-nav="1"') < record.indexOf('data-cal-quick="today"'));
assert.ok(record.indexOf('data-cal-quick="monthStart"') < record.indexOf('data-cal-confirm'));
assert.doesNotMatch(record, /Fecha seleccionada|data-cal-quick="custom"/);
assert.match(record, /data-cal-date="2026-08-14"[^>]*aria-pressed="true"[^>]*aria-label="14 de agosto de 2026"/);

const period = renderCalendarSheet({ selectedDate: '2026-08-14', visibleMonth: '2026-08', context: 'period' });
assert.ok(period.indexOf('quick-grid') < period.indexOf('calendar-grid'));
assert.match(period, /data-cal-quick="custom"/);
```

- [ ] **Step 2: Ejecutar RED.**

Run: `node tests/calendar.test.mjs`

Expected: FAIL porque `context` aún no existe, Registro conserva el orden anterior y los días carecen de semántica completa.

- [ ] **Step 3: Implementar render compartido con ramas explícitas.**

Crear helpers `renderCalendarGrid(...)`, `renderMonthNavigation(...)`, `renderQuickActions({ includeCustom })` y ensamblar:

```js
const content = context === 'record'
  ? `${grid}${navigation}${renderQuickActions({ includeCustom: false })}${confirm}`
  : `${renderQuickActions({ includeCustom: true })}${navigation}${grid}${selectedCard}${confirm}`;
```

El botón de día seleccionado tendrá clases `selected`, `aria-pressed="true"` y fecha completa en `aria-label`; hoy añade `aria-current="date"`.

- [ ] **Step 4: Conectar el contexto desde `main.js`.**

```js
if (sheet === 'calendar') {
  const context = state.ui.calendarTarget === 'record-date' ? 'record' : 'period';
  return renderCalendarSheet({ ...calendarDraft, context });
}
```

- [ ] **Step 5: Implementar geometría de Registro.**

Añadir clase `.record-calendar-sheet` y reglas exactas:

```css
.record-calendar-sheet {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto auto;
  height: min(720px, calc(100vh - 24px));
  height: min(720px, calc(100dvh - 24px));
  overflow: hidden;
}

.record-calendar-sheet .quick-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.record-calendar-sheet .calendar-grid .selected {
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--blue);
  font-weight: 850;
}
```

Mantener cada acción en al menos 44 px y ajustar gaps/padding hasta que `Listo` sea visible sin scroll a 390 × 844 con seis semanas.

- [ ] **Step 6: Verificar GREEN y contrato móvil.**

Run:

```powershell
node tests/calendar.test.mjs
node tests/mobile-ui-contract.test.mjs
node --check src/components/calendar.js
node --check src/main.js
```

Expected: código 0 y ningún cambio contractual en `context: 'period'`.

- [ ] **Step 7: Crear commit temporal de Task 2.**

```powershell
git add src/components/calendar.js src/main.js styles/components.css styles/screens.css tests/calendar.test.mjs tests/mobile-ui-contract.test.mjs
git commit -m "feat: move record calendar actions within thumb reach"
```

---

### Task 3: Selector sin texto redundante y geometría simétrica

**Files:**
- Modify: `src/state.js`
- Modify: `src/services/periodService.js`
- Modify: `src/components/periodPicker.js`
- Modify: `src/main.js:304-362,591-629`
- Modify: `styles/components.css:850-900`
- Modify: `styles/screens.css:750-805,990-1015,2256-2275`
- Modify: `tests/period-scope.test.mjs`
- Modify: `tests/period-interaction.test.mjs`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- Produces: `hasVisibleDraftSelection(draft, dashboardPeriod) -> boolean` desde `periodService.js`.
- `state.ui.periodDraftApplyEnabled` es estado efímero; nunca se persiste dentro de `period` o `auditPeriod`.
- `renderPeriodSheet(draft, { ..., applyEnabled })` controla `disabled` y `aria-disabled` de `Aplicar`.
- `periodSelectedIndicator()` devuelve un check sin texto con `aria-hidden="true"`.

- [ ] **Step 1: Reescribir primero los tests de selección visible.**

Los helpers de `period-scope.test.mjs` exigirán:

```js
assert.match(choice, /class="[^"]*\bselected\b/);
assert.match(choice, /aria-pressed="true"/);
assert.match(choice, /data-period-selected-indicator/);
assert.doesNotMatch(choice, />Seleccionado</);
assert.doesNotMatch(markup, /Selección actual|data-period-current-summary/);
```

Añadir casos literales:

```js
assert.equal(hasVisibleDraftSelection({ ...yearDraft, tab: 'range' }, dashboardYear), true); // Este año
assert.equal(hasVisibleDraftSelection({ ...currentMonthDraft, tab: 'year' }, may), false);

const blocked = renderPeriodSheet({ ...currentMonthDraft, tab: 'year' }, { ...globalOptions, applyEnabled: false });
assert.match(blocked, /data-period-apply[^>]*disabled[^>]*aria-disabled="true"/);
assert.doesNotMatch(blocked, /Selección actual/);
```

- [ ] **Step 2: Ejecutar RED.**

Run:

```powershell
node tests/period-scope.test.mjs
node tests/period-interaction.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Expected: fallos por textos/resumen actuales, helper inexistente, `Aplicar` siempre habilitado y cuadrícula 5+3.

- [ ] **Step 3: Implementar la derivación y el gate efímero.**

Mover `hasVisibleDraftSelection` a `periodService.js`. Añadir `periodDraftApplyEnabled: false` al estado UI inicial. Actualizar transiciones:

```js
function openPeriodSheet(scope) {
  const period = scope === 'audit' ? state.auditPeriod : state.period;
  const compare = scope === 'audit' ? Boolean(state.auditPeriod.compare) : Boolean(state.filters.categories.compare);
  const draft = createPeriodDraft(period, { scope, compare });
  state.ui.periodDraft = draft;
  state.ui.periodDraftApplyEnabled = hasVisibleDraftSelection(draft, state.period);
  openSheet('period');
}
```

Reglas de eventos:

- tab: recalcular con `hasVisibleDraftSelection`;
- preset o año: `true`;
- copia del dashboard: `true` aunque no coincida con preset;
- cancelar/aplicar: volver a `false`;
- `applyPeriodDraft()`: salir sin mutar si el gate es `false`.

- [ ] **Step 4: Sustituir texto/resumen por indicador.**

```js
function periodSelectedIndicator() {
  return `<span class="period-selected-indicator" data-period-selected-indicator aria-hidden="true">${icon('check')}</span>`;
}
```

Eliminar `selectedMark()`, `renderCurrentDraftSummary()` y todo su CSS. Mantener `Usar período del dashboard` sin `.selected` ni `aria-pressed`.

- [ ] **Step 5: Implementar cuadrícula y alturas exactas.**

```css
.period-sheet[data-period-scope="global"] {
  height: min(640px, calc(100vh - 24px));
  height: min(640px, calc(100dvh - 24px));
}

.period-mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(52px, 1fr));
}

@media (min-width: 641px) {
  .period-mode-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(52px, 1fr));
  }
}
```

Las tarjetas, checks y footer deben compartir alturas, radios y gaps exactos; la variante de Auditoría conserva la regla base de 760 px.

- [ ] **Step 6: Verificar GREEN, independencia y mutación nula.**

Run:

```powershell
node tests/period-scope.test.mjs
node tests/period-interaction.test.mjs
node tests/mobile-ui-contract.test.mjs
node tests/comparison-analysis.test.mjs
```

Expected: código 0; los snapshots de `transactions`, `budgets` y `provisions` no cambian; copia puntual e independencia de Auditoría permanecen cubiertas.

- [ ] **Step 7: Crear commit temporal de Task 3.**

```powershell
git add src/state.js src/services/periodService.js src/components/periodPicker.js src/main.js styles/components.css styles/screens.css tests/period-scope.test.mjs tests/period-interaction.test.mjs tests/mobile-ui-contract.test.mjs
git commit -m "feat: refine period selection feedback"
```

---

### Task 4: Fuentes de verdad, precache y cache-44

**Files:**
- Modify: `DESIGN_SYSTEM.md`
- Modify: `PRODUCT_SPEC.md`
- Modify: `PROGRESS.md`
- Modify: `VERIFIER.md`
- Modify: `service-worker.js`
- Modify: `tests/mobile-ui-contract.test.mjs`
- Include: `docs/superpowers/specs/2026-08-13-wave-1-1-regression-and-ui-polish-design.md`
- Include: `docs/superpowers/plans/2026-08-13-wave-1-1-regression-and-ui-polish-implementation.md`

**Interfaces:**
- Cache activo: `cfo-personal-v7-cache-44`.
- `APP_SHELL` incluye `./src/components/recordKeypad.js` exactamente una vez.
- `VERIFIER.md` deja publicación y teléfono pendientes antes del push.

- [ ] **Step 1: Escribir primero el contrato fallido de precache.**

Extender `mobile-ui-contract.test.mjs` para leer `service-worker.js` y exigir:

```js
assert.match(worker, /cfo-personal-v7-cache-44/);
assert.match(worker, /\.\/src\/components\/recordKeypad\.js/);
assert.equal((worker.match(/\.\/src\/components\/recordKeypad\.js/g) || []).length, 1);
```

- [ ] **Step 2: Ejecutar RED.**

Run: `node tests/mobile-ui-contract.test.mjs`

Expected: FAIL contra cache-43 y módulo ausente del `APP_SHELL`.

- [ ] **Step 3: Actualizar worker y fuentes de verdad.**

- `service-worker.js`: cache-44 y nuevo módulo en precache.
- `DESIGN_SYSTEM.md`: check no textual, gate de `Aplicar`, calendario record-only, simetría y altura global.
- `PRODUCT_SPEC.md`: misma regla sin alterar la copia puntual ni la independencia de Auditoría.
- `PROGRESS.md`: regresión corregida y alcance de 1.1, sin afirmar publicación o teléfono.
- `VERIFIER.md`: comandos y evidencia automatizada/Browser/reviewer; publicación/teléfono pendientes.

- [ ] **Step 4: Verificar contratos y sintaxis del worker.**

Run:

```powershell
node tests/mobile-ui-contract.test.mjs
node --check service-worker.js
git diff --check
```

Expected: código 0; sólo avisos de fin de línea permitidos.

- [ ] **Step 5: Crear commit temporal de Task 4.**

```powershell
git add DESIGN_SYSTEM.md PRODUCT_SPEC.md PROGRESS.md VERIFIER.md service-worker.js tests/mobile-ui-contract.test.mjs docs/superpowers/specs/2026-08-13-wave-1-1-regression-and-ui-polish-design.md docs/superpowers/plans/2026-08-13-wave-1-1-regression-and-ui-polish-implementation.md
git commit -m "docs: align wave 1.1 contracts and cache"
```

---

### Task 5: QA real, revisión final y commit único

**Files:**
- Modify only if a verified reviewer finding requires it.
- Do not store screenshots, synthetic financial data or temporary reports in tracked paths.

**Interfaces:**
- Viewport obligatorio: 390 × 844.
- Reviewer independiente: `gpt-5.6-sol`, High, máximo 40 minutos y dos rondas de corrección.
- Commit final: `fix: recover record and refine period pickers`.

- [ ] **Step 1: Ejecutar verificación automatizada fresca.**

```powershell
Get-ChildItem src,tests -Recurse -Include *.js,*.mjs | ForEach-Object { node --check $_.FullName }
node --test --test-isolation=none --test-concurrency=1 tests/*.test.mjs
git diff --check
```

Expected: toda sintaxis válida, todas las pruebas pasan y no hay whitespace errors.

- [ ] **Step 2: Confirmar que el servidor entrega el código del worktree actual.**

Servir el worktree en un puerto libre, comprobar que `/src/main.js`, `/src/components/recordKeypad.js` y `/service-worker.js` corresponden al worktree y que el worker anuncia cache-44. No reutilizar el puerto 8787 sin validar su directorio y contenido.

- [ ] **Step 3: QA Browser a 390 × 844.**

Con datos sintéticos y sin guardar movimientos:

1. Registro → Gasto: `1`, `2`, decimal, `+`, borrar; cada pulsación actualiza monto y borrar inmediatamente.
2. Abrir/cerrar Cuenta, Categoría y Fecha; escribir Descripción; el valor no desaparece ni necesita otro render.
3. Edición de movimiento sintético: mismo feedback y guardado visible/accesible, sin confirmar el movimiento.
4. Calendario de Registro: seis semanas, día circular seleccionado, navegación/atajos debajo, `Listo` visible sin scroll.
5. Calendario `Desde`/`Hasta`: composición anterior conservada.
6. Selector global: sin textos redundantes, check visible, años 2 × 4, rango/año con delta exterior 0 px, footer visible.
7. Borrador sin opción visible: `Aplicar` disabled; volver de tab restaura selección; copia dashboard habilita `Aplicar` y un cambio posterior de tab reevalúa el gate.
8. Auditoría: 760 px, período independiente, sin compactación accidental.
9. Sin overflow horizontal, safe-area collision, errores o advertencias relevantes de consola.

- [ ] **Step 4: Smoke test de escritorio.**

Comprobar selector 4 × 2, Registro, calendario y navegación principal sin overflow ni controles deformados.

- [ ] **Step 5: Revisión independiente y máximo dos rondas.**

Entregar al reviewer la especificación, este plan, diff completo desde `7e308ab`, resultados automáticos y evidencia Browser. Corregir sólo hallazgos Critical/Important confirmados; cada cambio de comportamiento requiere RED antes de producción. Repetir únicamente tests y QA afectados, más la suite final.

- [ ] **Step 6: Revisión de privacidad.**

Confirmar que no se añadieron CSV, backups, capturas privadas, datos bancarios, tokens, secretos ni dumps de almacenamiento.

- [ ] **Step 7: Aplastar commits temporales y crear el único commit final.**

Desde el worktree verificado de la rama `codex/wave-1-1-regression-ui`:

```powershell
git reset --soft 7e308ab
git status --short
git commit -m "fix: recover record and refine period pickers"
```

Después repetir la suite completa y `git diff --check` contra el SHA final. No modificar `main` ni publicar todavía.

- [ ] **Step 8: Solicitar autorización externa.**

Reportar el SHA final, pruebas, QA, reviewer y estado de la rama. Solicitar autorización textual fresca para publicar ese SHA en `https://github.com/hbarcenas88/cfo-personal-v7.git` y verificar GitHub Pages.
