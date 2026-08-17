# Oleada 2 — Planeación administrable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Administrar presupuestos y provisiones conceptuales desde Planeación, incluyendo una liberación trazable que devuelve una provisión a cero sin alterar cuentas.

**Architecture:** Extraer cálculos y normalización de Planeación a un servicio puro; `state.js` conserva mutaciones persistentes y reversibles, incluido un historial conceptual de liberaciones separado del catálogo. La pantalla de Ajustes consume las vistas de Planeación y `main.js` coordina sheets/confirmaciones. Balances descuenta ese historial de su reserva acumulada, mientras Capacidad lee los saldos actuales del catálogo.

**Tech Stack:** PWA estática con ES modules, IndexedDB/local storage existente, Node test runner, CSS existente y service worker precache.

## Global Constraints

- Provisiones son conceptuales: nunca alteran saldo bancario, ingreso, gasto, presupuesto, transferencia ni auditoría bancaria.
- Liberar importe `X` deja `balance = 0`, reduce la reserva/capacidad por `X` y registra un evento conceptual ligado a la provisión.
- Presupuestos sólo cambian analítica; no modifican movimientos ni saldos.
- No usar `<select>` nativos; 390 × 844 es la referencia móvil y todos los objetivos táctiles principales miden al menos 44 px.
- Mantener compatibilidad con provisiones importadas o existentes; no crear movimientos históricos retrospectivos.
- Incluir nuevos módulos en `APP_SHELL`, elevar el cache a `cfo-personal-v7-cache-45` y probar la paridad.
- Actualizar `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `PROGRESS.md`, `VERIFIER.md` y `BACKLOG.md` sin afirmar publicación antes de la autorización fresca para el SHA final.
- Resultado: un único commit local de oleada; publicación sólo después de autorización textual fresca para ese SHA y destino.

---

## File Structure

- Create: `src/services/planningService.js` — normalización, estados, cálculo de reserva administrada y validaciones puras.
- Modify: `src/state.js` — CRUD reversible de presupuesto/provisión y liberación conceptual sin mutar cuentas/transacciones.
- Modify: `src/services/financeService.js` — usar la reserva administrada en Balances y Capacidad.
- Modify: `src/screens/settings.js` — gestor único Planeación, filas accionables y resumen de impacto.
- Modify: `src/screens/balances.js`, `src/main.js`, `styles/*.css` — enlaces, sheets, eventos y geometría móvil.
- Modify: `src/services/importExportService.js`, `service-worker.js` y documentación — compatibilidad, precache y fuentes de verdad.
- Create/Modify tests: `tests/planning-service.test.mjs`, `tests/planning-state.test.mjs`, `tests/mobile-ui-contract.test.mjs`, `tests/capacity-summary.test.mjs` y contrato de service worker existente.

### Task 1: Modelo conceptual de provisiones y reserva compartida

**Files:**
- Create: `src/services/planningService.js`
- Modify: `src/state.js`, `src/services/financeService.js`
- Test: `tests/planning-service.test.mjs`, `tests/planning-state.test.mjs`, `tests/capacity-summary.test.mjs`

**Interfaces:**
- Produces `normalizeProvision(provision)`, `provisionStatus(provision, today)`, `managedProvisionReserve(state)`, `releasedProvisionAmount(state)`, `releaseProvision(id, payload)`, `updateProvision(id, payload)`, `deleteProvision(id)`.
- `managedProvisionReserve(state)` returns the sum of non-negative catalog balances for capacity. `state.provisionEvents` preserves `provisionId`, `kind`, `amount` and `date` after catalog deletion. `releasedProvisionAmount(state)` reads those recorded releases (and recognizes a nested historical event only while normalizing); `financeService.provisionReserve` subtracts it from its existing provision-movement reserve and clamps at zero.

- [ ] **Step 1: Write failing behavior tests**

```js
assert.equal(managedProvisionReserve({ provisions: [{ balance: 120 }, { balance: 80 }] }), 200);
await releaseProvision('vacaciones', { date: '2026-08-16' });
assert.equal(state.provisions[0].balance, 0);
assert.equal(managedProvisionReserve(state), 80);
assert.equal(provisionReserve(state), 80);
await deleteProvision('vacaciones');
assert.equal(provisionReserve(state), 80);
assert.equal(state.accounts[0].name, 'BAC');
assert.equal(state.transactions.length, transactionsBefore);
```

- [ ] **Step 2: Verify RED**

Run: `node tests/planning-service.test.mjs` and `node tests/planning-state.test.mjs`.

Expected: import/export or release behavior is missing.

- [ ] **Step 3: Implement minimal pure service and state mutations**

```js
export function managedProvisionReserve(state) {
  return (state.provisions || []).reduce((sum, provision) => sum + Math.max(0, Number(provision.balance) || 0), 0);
}

export function releasedProvisionAmount(state) {
  return (state.provisionEvents || []).filter(event => event.kind === 'release')
    .concat((state.provisions || []).flatMap(provision => provision.events || []).filter(event => event.kind === 'release'))
    .reduce((sum, event) => sum + Math.max(0, Number(event.amount) || 0), 0);
}

export async function releaseProvision(id, payload = {}) {
  await mutate(s => {
    const provision = s.provisions.find(item => item.id === id);
    const amount = Math.max(0, Number(provision?.balance) || 0);
    provision.balance = 0;
    s.provisionEvents = [...(s.provisionEvents || []), { provisionId: id, kind: 'release', amount, date: payload.date }];
  }, { undo: 'Provisión liberada' });
}
```

The implementation rejects missing provisions, zero-balance releases and deletion with positive balance through existing toast/result conventions. It preserves all account and transaction collections. An allowed deletion leaves `state.provisionEvents` intact. `financeService.provisionReserve` keeps the existing transaction-derived reserve, subtracts `releasedProvisionAmount(state)` and clamps at zero; capacity continues to use each selected current catalog balance.

- [ ] **Step 4: Verify GREEN and mutation coverage**

Run: `node tests/planning-service.test.mjs`, `node tests/planning-state.test.mjs`, `node tests/capacity-summary.test.mjs`, `node tests/transaction-edit.test.mjs`.

Expected: all pass; changing release to modify an account, retain a positive balance, or omit the event fails a named test.

### Task 2: Gestor de presupuestos y provisiones dentro de Planeación

**Files:**
- Modify: `src/screens/settings.js`, `src/main.js`, `src/state.js`, `styles/*.css`
- Test: `tests/planning-management.test.mjs`, `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- Consumes Task 1 provision functions/statuses.
- Produces sheet targets `planning-budget`, `planning-provision`, `confirm-release-provision` and `confirm-delete-budget` using the existing `state.ui.activeSheet` lifecycle.

- [ ] **Step 1: Write failing interaction/UI contract tests**

```js
assert.match(renderSettings(state), /data-planning-section="budgets"/);
assert.match(renderSettings(state), /data-planning-section="provisions"/);
assert.doesNotMatch(renderDrawer(state), /data-settings="provisions-admin"/);
assert.match(renderProvisionSheet(state), /No modifica ninguna cuenta/);
```

- [ ] **Step 2: Verify RED**

Run: `node tests/planning-management.test.mjs` and `node tests/mobile-ui-contract.test.mjs`.

Expected: the current placeholder planner actions and catalog route do not satisfy the manager contracts.

- [ ] **Step 3: Implement manager UI and confirmation flows**

```js
${tool('planning-budgets', 'calendar', 'Presupuestos', 'Administrar planes guardados')}
${tool('planning-provisions', 'shield', 'Provisiones', 'Reservas conceptuales y liberación')}
```

Budget rows expose Editar/Eliminar with period and analytical impact. Provision rows expose Editar/Liberar/Eliminar according to balance; goals/date remain optional and show an explicit compact status. A release confirmation names amount, resulting zero balance, and non-effect on accounts. The old catalog/drawer route is removed; a Balances action routes to Planeación → Provisiones.

- [ ] **Step 4: Verify GREEN**

Run: `node tests/planning-management.test.mjs`, `node tests/mobile-ui-contract.test.mjs`, `node tests/planning-state.test.mjs`.

Expected: managers, actions, copy and route consolidation pass; no native select or duplicate menu route remains.

### Task 3: Compatibilidad, PWA y documentación operativa

**Files:**
- Modify: `src/services/importExportService.js`, `service-worker.js`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `PROGRESS.md`, `VERIFIER.md`, `BACKLOG.md`
- Test: `tests/mobile-ui-contract.test.mjs` (the repository’s existing worker/cache assertions live here)

**Interfaces:**
- Imports normalize through `normalizeProvision` or preserve absent optional fields.
- The precache contains every new application module exactly once and cache value is `cfo-personal-v7-cache-45`.

- [ ] **Step 1: Write failing compatibility and cache tests**

```js
assert.deepEqual(normalizeProvision({ name: 'Viaje', balance: 50 }), {
  name: 'Viaje', balance: 50, monthlyAmount: 0, targetAmount: 0, releaseDate: '', events: []
});
assert.match(serviceWorker, /cfo-personal-v7-cache-45/);
assert.match(serviceWorker, /'\.\/src\/services\/planningService\.js'/);
```

- [ ] **Step 2: Verify RED**

Run the focused compatibility and worker-contract tests.

Expected: cache version/module entry and new provenance fields are absent.

- [ ] **Step 3: Implement backwards-compatible normalization and documentation**

Update import/export instructions for optional target/release fields. Document that a release is conceptual and reduces usable liquidity without touching accounts. Move the old future release item from Backlog to the executed-wave section, while preserving real provisions as a future decision. Document automated/Browser/reviewer evidence only; leave external publication pending.

- [ ] **Step 4: Verify GREEN**

Run focused import/worker tests, `node --check` for every modified JS module, and `git diff --check`.

Expected: parser compatibility, cache parity, syntax and whitespace checks pass.

### Task 4: Integración, QA móvil y cierre de oleada

**Files:**
- Modify only when findings are real: files named by QA/reviewer.
- Test: entire `tests/*.test.mjs` suite and rendered Browser flow.

- [ ] **Step 1: Run fresh full automated verification**

Run every `tests/*.test.mjs` serially, syntax-check modified JavaScript and run `git diff --check`.

- [ ] **Step 2: Execute rendered QA using Browser at 390 × 844 and desktop**

Flow: Ajustes → Planeación → nueva provisión → editar meta/fecha → liberar → confirmar saldo cero and capacity release → abrir Balances → Administrar → Provisiones; then editar/eliminar un presupuesto. Check page identity, meaningful DOM, no error/warn console entries, screenshot, visible footer/targets, no overflow and one target-flow interaction per action.

- [ ] **Step 3: Independent timeboxed review**

Dispatch an independent reviewer for a maximum of 40 minutes. It evaluates this plan, all behavior, migration compatibility, financial invariants, UI at 390 × 844, cache parity and documentation. Fix only Critical/Important findings, then perform one scoped re-review.

- [ ] **Step 4: Create the single local commit**

Stage only this oleada’s files and commit once after verification/review:

```bash
git add src services styles tests service-worker.js PRODUCT_SPEC.md DESIGN_SYSTEM.md PROGRESS.md VERIFIER.md BACKLOG.md docs/superpowers
git commit -m "feat: manage planning budgets and provisions"
```

- [ ] **Step 5: Stop for external-publication authorization**

Report the exact commit SHA, test/Browser/reviewer evidence and request fresh authorization before pushing or verifying GitHub Pages.

## Plan Self-Review

- Coverage: Tasks 1–3 implement every approved behavior; Task 4 verifies UX, independent review and one-commit delivery.
- Scope: import assistance, all-app visual audit and real provisions remain out of scope.
- Consistency: release never writes accounts/transactions; Balances subtracts its recorded conceptual release from the existing movement reserve, while Capacity reads the same provision's current balance.
- No placeholders: all public interfaces, acceptance behavior, test commands and publication gate are explicit.
