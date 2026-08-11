# Oleada 1 — Sistema de períodos claro y consistente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que la selección de períodos sea inequívoca y estable en móvil, e integrar el período independiente de Auditoría en el control superior común.

**Architecture:** La lógica persistida de `period` y `auditPeriod` permanece separada. La carcasa superior resuelve el período visible según la pantalla activa y emite intenciones de abrir o desplazar el contexto correcto; el selector trabaja siempre sobre un borrador hasta `Aplicar`. El componente del selector deriva estados visuales y accesibles desde ese borrador, y el sheet usa un único contenedor desplazable con pie fijo.

**Tech Stack:** ES modules nativos, DOM/CSS sin framework, Node.js tests, Browser QA.

## Global Constraints

- No modificar reglas financieras, saldos, presupuestos, transferencias, provisiones ni trazabilidad.
- No introducir dependencias ni `<select>` nativos.
- Referencia móvil obligatoria: 390 × 844; targets táctiles mínimos de 44 px.
- El período de Auditoría sigue persistido e independiente; `Usar período del dashboard` es una copia puntual, nunca una sincronización viva.
- `Cancelar`, Escape y cierre exterior descartan el borrador sin cambiar el período confirmado ni los datos visibles.
- `Desde` y `Hasta` sólo se muestran para el rango `Personalizado`.
- Un solo commit para toda la Oleada 1, después de pruebas, QA renderizado y revisión independiente.
- La publicación sólo ocurre si la oleada es autocontenida; Browser QA no sustituye la validación posterior en el teléfono.

---

### Task 1: Contratos de período y estado de selección

**Files:**
- Modify: `src/services/periodService.js`
- Modify: `src/components/periodPicker.js`
- Modify: `tests/period-scope.test.mjs`
- Modify: `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- `periodPresetState(draft, preset, dashboardPeriod)` devuelve `{ selected, copied }`; `selected` identifica el borrador activo y `copied` sólo identifica que el borrador de Auditoría coincide con una copia puntual del dashboard.
- Cada opción seleccionable expone `aria-pressed="true|false"`, clase `selected` y una marca visual con texto `Seleccionado`; una opción no seleccionada no puede aparentar confirmación.
- `Personalizado` es la única selección que renderiza `data-period-date="from"` y `data-period-date="to"`.

- [ ] **Step 1: Escribir pruebas fallidas de semántica del borrador.** Añadir casos con expectativas literales: mes actual selecciona `thisMonth`; rango selecciona `custom`; `all` selecciona `all`; una copia del dashboard se reconoce sólo por igualdad de modo y campos relevantes, sin crear vínculo posterior.
- [ ] **Step 2: Ejecutar `node tests/period-scope.test.mjs` y confirmar que falla porque `periodPresetState` todavía no existe.**
- [ ] **Step 3: Implementar la derivación mínima de estados sin mutar `draft`, `dashboardPeriod` ni datos financieros.**
- [ ] **Step 4: Ejecutar `node tests/period-scope.test.mjs` y confirmar que pasa.**
- [ ] **Step 5: Añadir primero contratos fallidos del HTML real.** Renderizar `renderPeriodSheet()` con borradores de mes, año, rango y `all`; comprobar `aria-pressed`, `.selected`, `Seleccionado`, la ausencia de fechas en presets no personalizados y la etiqueta exacta `Usar período del dashboard`.
- [ ] **Step 6: Ejecutar la prueba enfocada y confirmar fallos por el markup actual indistinto.**
- [ ] **Step 7: Implementar el estado visual/accesible en `periodPicker.js`; mantener las pestañas rango/año, comparación y las ocho opciones de año existentes.**
- [ ] **Step 8: Repetir las pruebas enfocadas y la batería serial completa.**

### Task 2: Control superior contextual e independencia de Auditoría

**Files:**
- Modify: `src/components/ui.js`
- Modify: `src/main.js`
- Modify: `src/screens/audit.js`
- Modify: `tests/mobile-ui-contract.test.mjs`
- Test: `tests/period-interaction.test.mjs`

**Interfaces:**
- El control superior usa `state.auditPeriod` cuando `state.activeView === 'audit'`; en las demás pantallas usa `state.period`.
- `cfo:period` incluye `detail.scope` y abre el borrador correcto.
- El desplazamiento por flechas se resuelve sobre el mismo alcance visible y persiste sólo ese período.
- Auditoría muestra junto al control superior el microcopy exacto `Sólo afecta Auditoría`; desaparece el sello inferior `.audit-period-seal` y su botón `Cambiar`.

- [ ] **Step 1: Escribir una prueba fallida de la carcasa.** Con estado global `Jul 2026`, Auditoría en `Todo el historial` y vista `audit`, `updateShellState()` debe mostrar `Todo el historial`, el alcance `audit`, la nota `Sólo afecta Auditoría` y emitir apertura/desplazamiento de Auditoría; al cambiar a `summary`, debe mostrar `Jul 2026` y alcance global.
- [ ] **Step 2: Ejecutar la prueba enfocada y confirmar que falla porque la cabecera siempre consume `state.period`.**
- [ ] **Step 3: Implementar la resolución contextual en la carcasa y trasladar las mutaciones/persistencia de las flechas a `main.js`, sin duplicar listeners ni reconstruir la shell.**
- [ ] **Step 4: Ejecutar la prueba enfocada y confirmar que pasa.**
- [ ] **Step 5: Escribir una prueba de interacción fallida que cubra el ciclo confirmado → borrador → cancelar/aplicar.** Usar períodos global y de Auditoría distintos; seleccionar `Usar período del dashboard`, cancelar y comprobar que ambos confirmados siguen iguales; repetir y aplicar, comprobar que Auditoría toma una copia y que un cambio global posterior no la modifica.
- [ ] **Step 6: Ejecutar la prueba y confirmar que captura cualquier mutación antes de `Aplicar` o cualquier sincronización viva.**
- [ ] **Step 7: Eliminar el sello inferior de Auditoría, mantener sus resultados y filtros intactos, y conectar el control superior al selector de alcance correcto.**
- [ ] **Step 8: Ejecutar las pruebas enfocadas y la batería serial completa.**

### Task 3: Sheet móvil estable y acabado visual

**Files:**
- Modify: `styles/components.css`
- Modify: `styles/screens.css`
- Modify: `tests/mobile-ui-contract.test.mjs`
- Modify: `DESIGN_SYSTEM.md`
- Modify: `PRODUCT_SPEC.md`

**Interfaces:**
- `.period-sheet` tiene altura estable limitada por el viewport y `overflow: hidden`.
- `.period-sheet-content` es el único contenedor con scroll vertical.
- `.period-sheet-footer` permanece visible, sin depender del scroll, y conserva botones de al menos 44 px.
- Año y rango comparten la misma geometría exterior; el estado seleccionado reutiliza tokens azules existentes y no introduce una nueva paleta.

- [ ] **Step 1: Reforzar primero el contrato CSS para que falle si el sheet carece de altura estable, si tiene scroll exterior o si el footer vuelve al flujo desplazable.**
- [ ] **Step 2: Ejecutar `node tests/mobile-ui-contract.test.mjs` y confirmar los fallos contra el CSS actual.**
- [ ] **Step 3: Implementar la geometría con `dvh` y fallback compatible, un solo scroll interno, pie fijo y targets táctiles; eliminar CSS huérfano del sello de Auditoría.**
- [ ] **Step 4: Estilizar `.record-choice.selected` y su indicador con los tokens `--blue`, `--blue-soft`, radios y tipografía existentes; no rediseñar otros sheets.**
- [ ] **Step 5: Actualizar `DESIGN_SYSTEM.md` y `PRODUCT_SPEC.md` con el control contextual, el borrador explícito, la copia puntual y la regla de fechas sólo para rango libre.**
- [ ] **Step 6: Ejecutar sintaxis de JavaScript modificado, pruebas enfocadas y batería serial completa.**

### Task 4: QA real, revisión independiente y publicación

**Files:**
- Modify: `PROGRESS.md`
- Modify: `VERIFIER.md`
- Modify: `service-worker.js`
- No guardar capturas, datos de prueba ni reportes temporales dentro del repositorio.

**Interfaces:**
- El cache activo pasa de `cfo-personal-v7-cache-42` a `cfo-personal-v7-cache-43` porque cambian assets JS/CSS ya precacheados.
- La evidencia de Browser usa datos sintéticos y viewport 390 × 844, además de una comprobación de escritorio.

- [ ] **Step 1: Servir el worktree por HTTP y definir el flujo:** dashboard → abrir período → elegir borrador → cancelar/aplicar → Auditoría → usar período del dashboard → verificar independencia.
- [ ] **Step 2: En Browser a 390 × 844 comprobar identidad, contenido no vacío, ausencia de overlay, consola sin errores/advertencias relevantes, screenshot e interacción real.** Confirmar estado azul visible, `Desde/Hasta` sólo en personalizado, altura exterior igual en rango/año, footer visible sin scroll y targets sin solape.
- [ ] **Step 3: Comprobar en Auditoría que el control superior muestra su contexto, `Sólo afecta Auditoría`, que no existe sello inferior y que cancelar conserva exactamente el rótulo y los resultados visibles.**
- [ ] **Step 4: Repetir un smoke test de escritorio y registrar evidencia concreta en `VERIFIER.md`; actualizar `PROGRESS.md` sin declarar validación telefónica que aún no se observó.**
- [ ] **Step 5: Incrementar el cache a `cache-43` y ajustar el contrato automatizado correspondiente.**
- [ ] **Step 6: Entregar plan, diff, criterios, pruebas y evidencia a un revisor independiente `gpt-5.6-sol` high.** Timebox máximo: 40 minutos; máximo dos rondas de corrección; probar pantalla real 390 × 844.
- [ ] **Step 7: Verificar técnicamente cada hallazgo; corregir sólo hallazgos reales, añadir prueba fallida antes de cada corrección de comportamiento y repetir las comprobaciones afectadas.**
- [ ] **Step 8: Ejecutar verificación fresca completa: sintaxis de todos los JS modificados, `node --test --test-isolation=none --test-concurrency=1 tests/*.test.mjs`, `git diff --check`, revisión de privacidad y estado del worktree.**
- [ ] **Step 9: Crear un único commit `feat: clarify period selection contexts`, publicar, integrar en `main` y verificar GitHub Pages antes de solicitar validación telefónica de la Oleada 1.**
