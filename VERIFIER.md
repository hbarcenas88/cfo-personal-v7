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
