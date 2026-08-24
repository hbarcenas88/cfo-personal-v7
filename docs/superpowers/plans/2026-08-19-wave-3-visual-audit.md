# Oleada 3 — Auditoría visual, interacción y Planeación compacta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los patrones visuales y de interacción que impiden que CFO Personal se sienta como un producto móvil terminado, y convertir Planeación en una navegación compacta sin alterar lógica financiera.

**Architecture:** Mantener la PWA vanilla y sus pantallas actuales, añadir contratos puros para navegación/presentación y extender el coordinador de render únicamente donde preserve una interacción real. `settings.js` pasa de tres gestores simultáneos a un pequeño estado de navegación de sesión. Los estilos se consolidan alrededor de primitivas compartidas para iconos, targets, filas de decisión, segmentados y overlays.

**Tech Stack:** HTML/CSS, ES modules nativos, estado persistente existente, Node test runner, Playwright para QA renderizado cuando el Browser in-app no pueda cargarse, service worker PWA.

**Spec:** `docs/superpowers/specs/2026-08-19-wave-3-visual-audit-design.md`

## Global Constraints

- Cero cambios a fórmulas, saldos, transacciones, presupuestos o reglas de provisiones/recurrentes.
- Investigar el comportamiento existente antes de cambiarlo y escribir primero una prueba que falle por el defecto real.
- No usar `<select>` nativos. Referencia móvil 390 × 844; target táctil mínimo 44 px.
- Escapar texto persistido y validar colores antes de interpolarlos en HTML/estilos.
- Preservar render localizado de Oleada 0; no resolver foco/scroll volviendo al render total.
- No afirmar Browser, teléfono, PWA o datos reales con evidencia de otra superficie.
- Subagentes con responsabilidades acotadas; reviewer final independiente con timebox de 40 minutos.
- Un único commit local final. Detenerse y pedir autorización textual fresca antes de publicar ese SHA.

---

### Task 1: Primitivas visuales, seguridad de render y ciclo de overlays

**Files:**
- Modify: `src/icons.js`, `src/components/ui.js`, `src/utils/format.js`, `src/utils/renderCoordinator.js`, `src/main.js`
- Modify: `styles/base.css`, `styles/components.css`, `styles/screens.css`
- Test: `tests/mobile-ui-contract.test.mjs`, `tests/render-coordinator.test.mjs`
- Create: `tests/render-safety.test.mjs`, `tests/overlay-interaction.test.mjs`

**Produces:** SVG 20 px por defecto anulable por CSS; patrón de trailing icon; helper de color seguro; identidad estable de overlay; foco inicial/retorno y cierre Escape/exterior.

- [x] **Step 1: Escribir pruebas RED** para X/chevrons dimensionados, color inválido, texto literal, target mínimo y scroll/foco limitado al mismo overlay.
- [x] **Step 2: Ejecutar pruebas enfocadas y observar RED** por los contratos ausentes, no por errores de sintaxis del test.
- [x] **Step 3: Implementar el mínimo compartido**: dimensiones explícitas en `icon()`, clases reutilizables, validación de color y una identidad de overlay que no trate cualquier `.sheet` como la misma superficie.
- [x] **Step 4: Conectar foco y cierres** sin reintroducir render total. Al abrir se enfoca título/control apropiado; al cerrar vuelve al disparador que lo abrió.
- [x] **Step 5: Verificar GREEN y mutaciones dirigidas**. Cambiar SVG a tamaño intrínseco, aceptar color arbitrario o restaurar scroll entre overlays distintos debe romper una prueba nombrada.

### Task 2: Navegación compacta de Planeación

**Files:**
- Modify: `src/screens/settings.js`, `src/main.js`, `src/state.js`, `styles/screens.css`, `styles/components.css`
- Test: `tests/planning-management.test.mjs`, `tests/planning-state.test.mjs`, `tests/mobile-ui-contract.test.mjs`

**Produces:** `planningView` de sesión con estados `hub`, `budgets`, `provisions`, `recurring` y `manager`; acciones `Ver lo planeado`/`Crear`; filtros existentes o semánticos por tipo.

- [x] **Step 1: Escribir pruebas RED** que demuestren que el hub no contiene los tres managers, que cada tipo abre una subvista y que volver conserva una jerarquía de un nivel.
- [x] **Step 2: Añadir contratos RED** para filtro mensual de presupuestos, filtro Activas/Liberadas/Todas de provisiones, estado vigente/completo de recurrentes y ausencia de `<select>`.
- [x] **Step 3: Implementar navegación de sesión** reutilizando CRUD/sheets de Oleada 2. No duplicar servicios ni tocar mutaciones financieras.
- [x] **Step 4: Ajustar filas**: meta/fecha sólo si existen, fechas humanas, acción Crear siempre alcanzable y confirmaciones destructivas con clase correcta.
- [x] **Step 5: Verificar GREEN** con pruebas enfocadas y QA sintético del recorrido `Planeación → tipo → Ver/Crear → volver` a 390 × 844.

### Task 3: Auditoría y Categorías — filtros premium y render localizado

**Files:**
- Modify: `src/screens/audit.js`, `src/screens/auditClose.js`, `src/screens/categories.js`, `src/components/searchableOptions.js`, `src/main.js`
- Modify: `styles/components.css`, `styles/screens.css`
- Test: `tests/mobile-ui-contract.test.mjs`
- Create: `tests/audit-filter-interaction.test.mjs`, `tests/categories-filter-interaction.test.mjs`

**Produces:** búsqueda/limpieza con responsabilidades separadas; opciones accesibles; consulta, foco y scroll persistentes; segmentado simétrico; contenido escapado.

- [x] **Step 1: Escribir RED de seguridad** con comillas, `<especial>` y `&` en búsqueda, chips, movimientos y categorías.
- [x] **Step 2: Escribir RED de interacción** para seleccionar dos opciones tras buscar sin perder consulta/foco/scroll, y para expandir/filtrar Categorías sin salto al inicio.
- [x] **Step 3: Implementar actualizaciones localizadas** de resultados/panel o preservar explícitamente el estado real. La X del buscador borra sólo texto; `Limpiar todos` actúa sólo sobre filtros activos.
- [x] **Step 4: Armonizar geometría y semántica**: controles en filas deliberadas, triggers al 100%, chevrons contenidos, segmentado `Combinado/Presupuesto/Gasto`, `aria-pressed`, `aria-expanded` y `aria-controls`.
- [x] **Step 5: Pulir cierre guiado** con alturas uniformes, gaps de confirmación y foco visible del archivo.
- [x] **Step 6: Verificar GREEN** en pruebas enfocadas y escenarios con lista larga, nombres largos e importe `$999,999,999.99`.

### Task 4: Consistencia del resto de superficies

**Files:**
- Modify only confirmed targets: `src/screens/balances.js`, `src/screens/summary.js`, `src/screens/recordFlow.js`, `src/screens/settings.js`, `src/components/ui.js`, `src/main.js`, `src/screens/auditClose.js`, `styles/*.css`
- Test: extend focused screen contracts and `tests/mobile-ui-contract.test.mjs`

**Produces:** ledger cerrado de defectos confirmados fuera de Auditoría/Categorías, sin convertir la tarea en un rediseño indefinido.

- [x] **Step 1: Convertir cada hallazgo confirmado en un RED enfocado**: trailing icons; targets menores de 44 px; `Completo` sin estado; donut vacío; montos truncados; acceso oculto de Balances; acciones futuras/destructivas de Ajustes; retorno de foco al trigger exacto en V3-09.
- [x] **Step 2: Implementar sólo las correcciones del ledger** usando las primitivas de Task 1. El acceso de Balances se vuelve explícito, pero conserva exactamente la misma acción de auditoría.
- [x] **Step 3: Revisar copia visible** en las superficies tocadas y corregir inconsistencias de español/acento sin reescribir contenido financiero.
- [x] **Step 4: Verificar GREEN** y ejecutar smoke de navegación completa móvil/escritorio, con foco visible y sin overflow.

### Task 5: PWA, fuentes de verdad y QA integral

**Files:**
- Modify: `service-worker.js`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `PROGRESS.md`, `VERIFIER.md`, `BACKLOG.md`
- Test: all `tests/*.test.mjs`

**Produces:** cache `cfo-personal-v7-cache-47`, documentación vigente y evidencia honesta por superficie.

- [x] **Step 1: Añadir RED de cache/paridad** y comprobar que falla contra cache-46.
- [x] **Step 2: Elevar cache a 47** y mantener cada asset de aplicación una sola vez en `APP_SHELL`.
- [x] **Step 3: Actualizar fuentes de verdad** con Planeación compacta, geometría, overlays, accesibilidad, seguridad de render y defectos diferidos reales. `VERIFIER` deja publicación/teléfono explícitamente pendientes.
- [x] **Step 4: Ejecutar verificación fresca**: todas las pruebas seriales, sintaxis de todo JS modificado, `git diff --check` y revisión de privacidad.
- [x] **Step 5: Ejecutar QA renderizado** verificando primero versión/cache/markers servidos. Cubrir 390 × 844 y escritorio: Planeación completa; Auditoría con búsqueda y cuatro filtros; Categorías con 0/1/12+ entradas; Registro; Balances; Resumen; Ajustes; teclado, Escape, exterior, foco, scroll, contraste, targets y consola.
- [x] **Step 6: Reviewer independiente (máximo 40 min)** contrasta spec, plan, arquitectura, pruebas y pantalla real. Corregir sólo hallazgos Critical/Important reproducibles y hacer una única re-revisión acotada.
- [x] **Step 7: Crear un único commit local** con archivos de producto, pruebas y fuentes de verdad. Excluir datos, capturas privadas y artefactos temporales de herramientas.
- [ ] **Step 8: Detenerse antes de push** y reportar SHA, evidencia y límites; solicitar autorización fresca para `https://github.com/hbarcenas88/cfo-personal-v7.git` y GitHub Pages.

## Plan Self-Review

- Los ejemplos de la usuaria están incluidos, pero el alcance cubre los patrones transversales que los causan.
- Planeación cambia estructura de navegación, no datos ni cálculos.
- Cada decisión perceptible tiene criterio automatizable y escenario de pantalla real.
- La entrega evita ceremonial de PR, usa un solo commit final y conserva rollback claro.
- Superdesign es una ayuda opcional de canvas; ningún fragmento de código sale del repositorio sin autorización externa explícita.
