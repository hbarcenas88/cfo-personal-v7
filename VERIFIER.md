# CFO Personal V7 - Verificador de entrega

## Consolidación V7 - 2026-07-17

- [x] Ejecutados `storage-scope.test.mjs` y `transaction-edit.test.mjs`.
- [x] Ejecutado `node --check` en `src/` y `service-worker.js`.
- [x] Revisado localhost a 390×844 sin overflow, selects nativos ni errores de consola.
- [x] Confirmada la ausencia de CSV bancarios, adjuntos privados y datos personales en el repositorio operativo.
- [x] Verificados manifest, service worker y GitHub Pages desde `main`.
- [ ] Confirmar con datos reales respaldados la persistencia de edición tras recargar.

## Entrega de UX y lógica financiera - 2026-07-18

### Lógica y persistencia

- [x] Ejecutados `node tests/storage-scope.test.mjs`, `node tests/transaction-edit.test.mjs`, `node tests/capacity-summary.test.mjs` y `node tests/mobile-ui-contract.test.mjs`.
- [x] Confirmados en prueba determinista liquidez, provisiones seleccionadas, deuda, presupuesto por ejecutar y saldo proyectado.
- [x] Confirmado por regresión que un extraordinario sólo cambia las vistas operativas; balances, presupuesto y trazabilidad mantienen su lógica.
- [ ] Con datos reales respaldados, crear y editar un gasto extraordinario; recargar y confirmar que persiste.

### Revisión visual obligatoria a 390 × 844

- [ ] Recorrer Balances, Resumen, Categorías, Auditoría, Registro y Ajustes con datos reales; no basta revisar la pantalla modificada.
- [x] Revisado localmente con datos de prueba a 390 × 844: Resumen, Categorías y Auditoría sin overflow horizontal ni errores de consola.
- [ ] Confirmar ausencia de overflow horizontal, contenido recortado, tarjetas desproporcionadas y superposición con navegación inferior o safe areas.
- [ ] Abrir cada selector de Auditoría (Cuenta, Tipo, Categoría y Subcategoría): sus cuatro bordes, encabezado, opciones y `Listo` deben quedar dentro del viewport.
- [ ] Confirmar búsqueda de Auditoría y acción de limpiar: alturas coherentes, acción de 44 px, etiqueta accesible y sin competir con el campo.
- [ ] Confirmar que no hay `<select>` nativos en flujos móviles; los pickers y sheets se cierran por botón, Escape y toque fuera.
- [ ] En Gasto operativo, confirmar que monto, porcentaje y ancho de barra corresponden al mismo total filtrado; que no hay texto dentro de barras y que los nombres largos no desplazan el monto ni el porcentaje.
- [ ] Revisar iconos, textos truncados, targets táctiles y estados vacíos con el contenido real más largo disponible.
- [ ] Capturar evidencia visual antes de publicar y registrar cualquier excepción en `PROGRESS.md`.

## Períodos por contexto y densidad móvil — implementado, pendiente de evidencia visual y datos reales

### Evidencia automatizada — 2026-07-19

- [x] Ejecutados con código 0 los `node --check` de `periodService.js`, `state.js`, `periodPicker.js`, `ui.js`, `keypad.js`, `financeService.js`, `audit.js`, `categories.js`, `recordFlow.js`, `main.js` y `service-worker.js`.
- [x] Ejecutados con código 0 `storage-scope.test.mjs`, `transaction-edit.test.mjs`, `capacity-summary.test.mjs`, `period-scope.test.mjs`, `comparison-analysis.test.mjs` y `mobile-ui-contract.test.mjs`.
- [x] Confirmado por la regresión de `mobile-ui-contract.test.mjs` que la carcasa PWA usa `cfo-personal-v7-cache-34`, incluye `./src/services/periodService.js` y hace el fetch same-origin de la carcasa con `cache: 'no-store'`.
- [x] Confirmado en la entrega local que, después de refrescar/recargar el service worker, los activos fuente actualizados se sirven en lugar de la respuesta HTTP anterior.
- [x] Ejecutado `git diff --check` sin errores de espacios.

### Lógica y persistencia

- [ ] Confirmar que presets, calendario y campos sólo cambian el borrador; `Aplicar` confirma y `Cancelar`, Escape, cerrar o tocar fuera lo descartan.
- [ ] Probar flechas en mes, año y rango personalizado; cada modo debe preservar su semántica y duración.
- [ ] Confirmar que Auditoría abre en Todo el historial, guarda su período y filtros al recargar y no cambia cuando se modifica el dashboard.
- [ ] Confirmar que `Copiar período del dashboard` genera una instantánea sin vínculo vivo.
- [ ] Confirmar que comparación sólo aparece en Auditoría y Categorías, usa el período anterior equivalente y no muta datos financieros.
- [ ] Probar comparación con filtros de Auditoría, categorías seleccionadas, Solo gasto, Combinado, Solo presupuesto y referencia vacía (`Sin base anterior`).
- [x] Con datos de prueba a 390 × 844, Auditoría conservó julio de 2026 al mover el dashboard a junio de 2025 y su comparación respetó una categoría seleccionada.
- [x] Con datos de prueba a 390 × 844, Categorías mostró período previo y `Sin base anterior`; en Solo presupuesto informó correctamente que la comparación no está disponible.
- [ ] Con datos reales, confirmar primero que existe un respaldo JSON y realizar la validación sin crear, editar ni borrar registros reales.

### Revisión visual a 390 × 844

- [x] Capturada evidencia aislada a 390 × 844 de los flujos nuevos; la revisión visual complementa, sin sustituir, la batería automatizada.
- [x] Selector de período: el cuerpo es realmente desplazable por encima del pie fijo y el toggle de comparación queda alcanzable.
- [x] Auditoría y Categorías: sus controles no presentan overflow horizontal y ninguno de los targets medidos es menor de 44 px.
- [x] Registro de ingreso: el keypad no muestra botón de calendario.
- [ ] Revisar selector de período: secuencia vertical, Desde/Hasta, comparación contextual y pie Cancelar/Aplicar sin solapes ni controles apretados.
- [ ] Revisar Auditoría: búsqueda a ancho completo, disparador compacto Filtros, dropdowns anclados completos, importes visibles y navegación inferior libre.
- [ ] Revisar Categorías con y sin comparación: sello superior y variación secundaria no pueden aumentar overflow ni desplazar importes.
- [ ] Revisar Registro de ingresos: una sola ruta visual para editar fecha, calculadora con monto prioritario y acción de guardado accesible.
- [ ] Confirmar targets de al menos 44 px, ausencia de `<select>` nativos, overflow horizontal, contenido recortado y superposición con safe areas.
