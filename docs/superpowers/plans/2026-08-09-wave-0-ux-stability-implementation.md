# Oleada 0 — Estabilidad de interacción y auditoría móvil

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Follow TDD and do not commit until the complete wave passes the independent review.

**Goal:** Evitar reconstrucciones globales innecesarias, conservar el contexto de interacción y corregir la tarjeta rota de cierres guardados en Auditoría.

**Architecture:** La carcasa se monta una sola vez. Un coordinador agrupa solicitudes de render, actualiza sólo la pantalla activa y los overlays necesarios, y conserva foco, selección y scroll en reemplazos estructurales. La tarjeta de cierre adopta una cuadrícula móvil explícita con contenido flexible y affordance compacto.

**Tech Stack:** ES modules nativos, DOM/CSS sin framework, Node.js tests, Browser QA.

## Global Constraints

- No modificar reglas financieras, saldos, presupuestos, transferencias, provisiones ni trazabilidad.
- No introducir dependencias ni `<select>` nativos.
- Referencia móvil obligatoria: 390 × 844; targets táctiles mínimos de 44 px.
- Un solo commit para toda la Oleada 0, después de pruebas y revisión independiente.
- La publicación sólo ocurre si la oleada es autocontenida y no deja una migración o contrato a medias.
- Browser QA no sustituye la validación posterior de la PWA en el teléfono de la usuaria.

---

### Task 1: Coordinador de render y continuidad de interacción

**Files:**
- Create: `src/utils/renderCoordinator.js`
- Modify: `src/components/ui.js`
- Modify: `src/main.js`
- Test: `tests/render-coordinator.test.mjs`
- Test: `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- `createRenderCoordinator({ schedule, render })` agrupa scopes solicitados durante el mismo frame y ejecuta una sola actualización.
- `captureInteractionState(root)` devuelve foco, selección y scroll identificables.
- `restoreInteractionState(snapshot, root)` restaura sólo elementos que todavía existen y son compatibles.
- `ensureShell()` monta la carcasa una vez; `updateShellState()` actualiza período, navegación y drawer sin sustituir `#app`.

- [ ] Escribir pruebas fallidas que demuestren que solicitudes duplicadas se agrupan, que scopes se combinan y que el snapshot conserva foco/selección/scroll.
- [ ] Ejecutar `node tests/render-coordinator.test.mjs` y confirmar fallos por APIs inexistentes.
- [ ] Implementar el coordinador y las utilidades de continuidad con el mínimo código necesario.
- [ ] Convertir la carcasa en montaje único y actualización localizada; eliminar el doble render al abrir/cerrar el drawer.
- [ ] Renderizar sólo la pantalla activa, sheet, Registro y toast; vaciar pantallas inactivas para evitar listeners duplicados.
- [ ] Sustituir llamadas redundantes por solicitudes coordinadas, manteniendo las actualizaciones locales de búsquedas y keypad.
- [ ] Ejecutar pruebas enfocadas y la batería completa; confirmar una sola actualización por transición cubierta.

### Task 2: Tarjeta móvil de cierres guardados y matriz UX

**Files:**
- Modify: `src/screens/auditClose.js`
- Modify: `styles/screens.css`
- Test: `tests/guided-audit.test.mjs`
- Test: `tests/mobile-ui-contract.test.mjs`
- Modify: `VERIFIER.md`
- Modify: `PROGRESS.md`

**Interfaces:**
- Cada cierre se presenta como una tarjeta/botón con bloque de identidad flexible, metadatos legibles y chevrón dentro de un affordance máximo de 44 × 44 px.
- El nombre de cuenta, estado, monto y fecha deben conservar orden de lectura y no compartir una columna de ancho cero.

- [ ] Escribir pruebas fallidas del contrato DOM/CSS: grid `minmax(0, 1fr) auto`, contenido con `min-width: 0`, estado separado y chevrón contenido.
- [ ] Ejecutar pruebas enfocadas y confirmar que fallan contra la tarjeta actual.
- [ ] Implementar el markup semántico y el CSS responsive para nombres largos, estados extensos, monto y fecha.
- [ ] Registrar en `VERIFIER.md` la comprobación de la tarjeta y en `PROGRESS.md` el alcance real de la oleada.
- [ ] Ejecutar las pruebas enfocadas y confirmar ausencia de overflow contractual.

### Task 3: QA renderizado y revisión independiente

**Files:**
- No crear capturas ni reportes dentro del repositorio.

- [ ] Ejecutar comprobación sintáctica de todos los JavaScript modificados y todos los `tests/*.test.mjs`.
- [ ] Servir el worktree por HTTP y revisar a 390 × 844: drawer, Registro, filtros/sheets y tarjeta de cierres guardados.
- [ ] Confirmar identidad de página, contenido no vacío, consola limpia, screenshot e interacción real.
- [ ] Entregar diff, criterios y evidencia a un revisor independiente `gpt-5.6-sol` high, con máximo 40 minutos y dos ciclos de corrección.
- [ ] Resolver hallazgos bloqueantes/importantes y repetir sólo las comprobaciones afectadas.

### Task 4: Cierre y publicación de la oleada

**Files:**
- Modify: `service-worker.js` sólo si cambia el catálogo de assets o módulos precacheados; incrementar cache en ese caso.

- [ ] Ejecutar batería completa, `git diff --check`, inspección de datos privados y estado final del worktree.
- [ ] Crear un único commit `fix: stabilize mobile interaction rendering`.
- [ ] Publicar la rama, integrar en `main` y verificar GitHub Pages.
- [ ] Reportar la URL publicada y pedir validación en el teléfono antes de proponer la Oleada 1.
