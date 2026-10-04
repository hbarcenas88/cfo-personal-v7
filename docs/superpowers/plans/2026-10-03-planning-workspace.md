# Planeación mensual y provisiones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Ejecutar por oleadas con subagentes; coordinador integra y verificador final independiente no implementa.

**Goal:** Reducir fricción de provisiones y crear planeación mensual táctil con edición puntual.
**Architecture:** Lógica pura de operaciones/borrador separada de UI. Coordinador controla integración, persistencia y archivos compartidos. Cambios locales sobre worktree aislado; no publicar automáticamente.
**Tech Stack:** ES modules nativos, CSS local, pruebas Node y navegador local.
**Spec:** docs/superpowers/specs/2026-10-03-planning-workspace-design.md

## Global Constraints

Base 79928f2; no datos personales, CSV reales, backups privados ni secretos versionados. Dos espacios, punto y coma, comillas simples, camelCase. Fechas visibles DD/MM/AAAA; formatos técnicos compatibles. Targets ≥44 px, sin select nativo; 390 × 844 obligatorio. Máximo tres subagentes simultáneos. No commits ni publicación sin integración coordinada.

## Review Focus

- Persistencia fallida conserva estado anterior; cubrir aplicación, liberación y guardado mensual.
- Recarga/restauración/cambio de planeación no reabre aplicación del mismo mes.
- Copiar anterior preserva multiplicidad/importaciones y no duplica al repetir.
- Conflictos con fila afectada conservan borrador para revisión.
- Navegación con cambios y keypad preservan foco, scroll y datos hasta decisión explícita.

## Oleada 0 — Documentación

Responsable: subagente documental. Archivos: PROGRESS, ROADMAP, BACKLOG, VERIFIER, PRODUCT_SPEC, DESIGN_SYSTEM y diseño/plan.
- [x] Reconciliar a2c92ec y 79928f2; guardar contratos aprobados y diferir hallazgos generales.
- [x] Registrar gates independientes y ledger sin atribuir QA futura.

## Oleada 1 — Operaciones de provisiones

Responsable: subagente de lógica financiera; coordinador integra persistencia.
Interfaz requerida: applyProvisionPlanning(provisionId); releaseProvision acepta importe parcial. Eventos conceptuales con ID, provisión, nombre, mes, importe y fecha.
- [x] Pruebas enfocadas inicialmente fallidas: reserva150/asignado50/aplicar50→150/100/50, insuficiencia30, repetición, recarga/restauración, fallo de escritura y undo.
- [x] Implementar validación en centavos, mes calendario vigente, bloqueo mensual, eventos únicos y escritura candidata antes de estado activo.
- [x] Probar liberación20/saldo100→80/reserva−20, dos eventos mismo día y neutralidad bancaria.

## Oleada 2 — UI de provisiones

Responsable: subagente UI de provisiones.
- [x] Administrar desde Balances abre gestor; fila abre detalle completo.
- [x] Aplicar muestra mes/importe/resultado/faltante; insuficiencia enlaza Registrar reserva.
- [x] Sheet parcial con keypad, Liberar todo y saldo previsto; distinguir Sin saldo/Liberada.
- [x] Contratos móviles y recorrido Browser enfocado con sintéticos.

## Oleada 3 — Borrador mensual

Responsable: subagente lógica presupuestaria.
Interfaz: borrador de mes con filas independientes, referencia anterior, copia faltantes, totales y commit validado; firmas concretas se registran en ledger al integrar.
- [x] Pruebas inicialmente fallidas de $200+$50=$250, copia sin sobrescritura/duplicación, multiplicidad y origen manual de copia.
- [x] Mantener IDs/trazabilidad existentes, fila sin subcategoría y cuenta sólo de referencia.
- [x] Guardado atómico con comparación de filas afectadas, conflicto conservador, undo único y fallo sin mutación.

## Oleada 4 — Editor mensual y fechas

Responsables: subagente UI presupuestaria y subagente fechas en archivos separados; coordinador controla archivos compartidos.
- [x] Pantalla completa con selectores propios, categorías, referencia anterior, total y Guardar plan fijos; keypad compartido.
- [x] Abrir desde Planeación/Categorías con foco de categoría; editar fila puntual sin recorrer todo.
- [x] Salir/cambiar mes con borrador: seguir editando o descartar; cero no elimina existentes; borrar explícitamente.
- [x] Unificar fechas visibles a DD/MM/AAAA, calendario propio y corte real sin cambiar almacenamiento/intercambio.
- [x] Pruebas enfocadas y revisión móvil con sintéticos.
- [x] Comprobación sintáctica final: 33 archivos JavaScript, incluido el service worker, pasan.

## Oleada 5 — Verificación independiente (completada localmente)

Responsable: subagente independiente que no implementó. Informe incorporado en docs/verification/2026-10-03-planning-workspace.md; aprobado para entrega local revisable, sin hallazgos abiertos.
- [x] Suite completa fresca 44/44 del coordinador.
- [x] GUI aislada 390 × 844 y escritorio 1280 × 900: provisiones, copia anterior, edición puntual, recarga, foco/scroll/teclado/overlays y protección de borrador.
- [x] Restauración, escritura fallida, deshacer y conflictos mediante pruebas automatizadas; no inyección GUI.
- [x] Worker cache-50 e inventario nuevo; offline real con servidor detenido y vistas nuevas sin errores finales.
- [x] Corregir foco/Tab/Shift+Tab/Escape y re-verificar interacción visual.
- [x] Actualizar documentos con evidencia observada y pendientes separados de teléfono/datos reales/publicación.
- [x] Informe y veredicto independiente final incorporados: aprobado sin hallazgos abiertos.
- [x] Sintaxis de 33 archivos JavaScript, incluido el service worker, y diff final del coordinador sin errores.

## Checkpoints

Cada oleada termina con pruebas enfocadas y evidencia revisable, coordinador registra progreso antes de siguiente dependencia. Paralelizar únicamente tareas sin estado/archivos compartidos. Entrega final local; no dar por cubierta aceptación real por pruebas sintéticas.