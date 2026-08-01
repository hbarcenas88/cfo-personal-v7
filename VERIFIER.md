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
- [x] En la ejecución de 2026-07-19, la regresión de `mobile-ui-contract.test.mjs` confirmó que la carcasa PWA usaba `cfo-personal-v7-cache-37`, incluía `./src/services/periodService.js`, hacía el fetch same-origin de la carcasa con `cache: 'no-store'`, sólo cacheaba respuestas válidas completas y conservaba una respuesta de red utilizable si fallaba `cache.put`.
- Observación sintética no adjunta (narrativa, no evidencia de entrega): la comprobación local anterior con `cfo-personal-v7-cache-34` no prueba la versión actual. `main` y GitHub Pages se publicaron con `cfo-personal-v7-cache-40` el 2026-07-28; la evidencia de dispositivo/PWA del código actual permanece pendiente.
- [x] Ejecutado `git diff --check` sin errores de espacios.

### Lógica y persistencia

- [ ] Confirmar que presets, calendario y campos sólo cambian el borrador; `Aplicar` confirma y `Cancelar`, Escape, cerrar o tocar fuera lo descartan.
- [ ] Probar flechas en mes, año y rango personalizado; cada modo debe preservar su semántica y duración.
- [ ] Confirmar que Auditoría abre en Todo el historial, guarda su período y filtros al recargar y no cambia cuando se modifica el dashboard.
- [ ] Confirmar que `Copiar período del dashboard` genera una instantánea sin vínculo vivo.
- [ ] Confirmar que comparación sólo aparece en Auditoría y Categorías, usa el período anterior equivalente y no muta datos financieros.
- [ ] Probar comparación con filtros de Auditoría, categorías seleccionadas, Solo gasto, Combinado, Solo presupuesto y referencia vacía (`Sin base anterior`).
- Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró la independencia de Auditoría y la comparación de Categorías; no confirma el comportamiento actual sin captura duradera o validación móvil del usuario.
- [x] Respaldo JSON confirmado por la persona usuaria el 2026-07-26 antes de la validación real.
- [ ] Con datos reales, realizar la validación sin crear, editar ni borrar registros reales.

### Revisión visual a 390 × 844

- Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión controlada anterior exploró el selector, los controles de Auditoría/Categorías y el keypad. Sus mediciones no sustituyen la evidencia visual requerida de la versión actual.
- [ ] Adjuntar captura visual duradera o completar validación móvil del usuario antes de tratar esta revisión como evidencia de entrega.
- [ ] Revisar selector de período: secuencia vertical, Desde/Hasta, comparación contextual y pie Cancelar/Aplicar sin solapes ni controles apretados.
- [ ] Revisar Auditoría: búsqueda a ancho completo, disparador compacto Filtros, dropdowns anclados completos, importes visibles y navegación inferior libre.
- [ ] Revisar Categorías con y sin comparación: sello superior y variación secundaria no pueden aumentar overflow ni desplazar importes.
- [ ] Revisar Registro de ingresos: una sola ruta visual para editar fecha, calculadora con monto prioritario y acción de guardado accesible.
- [ ] Confirmar targets de al menos 44 px, ausencia de `<select>` nativos, overflow horizontal, contenido recortado y superposición con safe areas.

## Auditoría guiada por cuenta y fecha — implementación local, evidencia operativa pendiente

### Integridad y persistencia

- [x] Ejecutadas con código 0 las comprobaciones sintácticas de `main.js`, `state.js`, `guidedAuditService.js`, `statementFileService.js`, `auditClose.js` y `service-worker.js`, junto con `storage-scope`, `transaction-edit`, `capacity-summary`, `period-scope`, `comparison-analysis`, `guided-audit`, `guided-audit-state` y `mobile-ui-contract`.
- [x] Confirmado por `mobile-ui-contract.test.mjs` que la carcasa PWA usa `cfo-personal-v7-cache-41`, precarga `guidedAuditService.js`, `statementFileService.js`, `auditClose.js`, `searchableOptions.js` y el parser local `xlsx.full.min.js`, y ejecuta el build oficial SheetJS 0.20.3 en una lectura XLSX sintética.
- [x] `guided-audit-state.test.mjs` cubre directamente crear, rechazar duplicado, persistir, guardar decisión, recargar y eliminar un cierre sin mutar cuentas, movimientos, presupuestos, provisiones ni reglas financieras.
- [x] Respaldo JSON confirmado por la persona usuaria el 2026-07-26 antes de la validación de una cuenta real.
- [ ] Confirmar que un cierre guarda cuenta, fecha de corte, saldo real, rango declarado, filas normalizadas y validaciones sin guardar el archivo CSV/XLSX original.
- [ ] Confirmar que confirmar, descartar o dejar pendiente una coincidencia no altera movimientos, saldos, presupuesto, transferencias ni trazabilidad financiera.
- [ ] Confirmar que los cierres se pueden reabrir y que un delta no explicado se conserva como `Delta detectado: revisar`.
- [ ] Cubrir coincidencia exacta, advertencia de fecha de hasta ±2 días, candidato lejano, ambigüedad del mismo importe y diferencias solo en la app/solo en el banco.
- [ ] Confirmar importación con importe firmado y con débito/crédito separados; rechazar archivos sin fecha, descripción o una forma válida de importe, fuera del rango declarado o repetidos sin duplicar evidencia.

### Revisión visual y datos reales

- [ ] A 390 × 844, revisar el flujo cuenta/rango/saldo/importación/revisión/resultado sin overflow, safe-area conflict ni `<select>` nativo.
- Evidencia sintética parcial — 2026-07-26: en origen aislado `http://127.0.0.1:8797/`, Chrome a 390 × 844 cargó seis movimientos ficticios, abrió Auditoría y Nuevo cierre, seleccionó la cuenta sintética, completó rango/corte/saldo y alcanzó Importar sin errores ni advertencias de consola. El selector de archivo quedó bloqueado en la automatización y la ejecución fue interrumpida; por tanto Mapear → Revisar → decisiones → Resultado → reapertura → eliminación no cuenta como E2E observado. Esas etapas conservan prueba determinista de DOM, lógica y persistencia, pero la casilla visual permanece sin marcar.
- [ ] Con respaldo JSON confirmado, validar una cuenta real sin crear, editar ni borrar registros financieros; confirmar después que el cierre puede reabrirse.

## Estabilidad móvil de Registro — automatizada, QA renderizado pendiente

- [x] Ejecutados con código 0 los `node --check` de `keypad.js`, `searchableOptions.js`, `recordFlow.js`, `audit.js`, `categories.js`, `main.js` y `service-worker.js`; también `keypad`, `record-flow`, `searchable-options`, `storage-scope`, `transaction-edit`, `capacity-summary`, `period-scope`, `comparison-analysis`, `guided-audit`, `guided-audit-state` y `mobile-ui-contract`.
- [x] `mobile-ui-contract.test.mjs` confirma keypad clásico compartido sin acción `confirm`, acción `back`, selector buscable bajo apertura intencional, ausencia de `autofocus` en Auditoría y carcasa PWA `cfo-personal-v7-cache-41` que precarga `searchableOptions.js`.
- [ ] QA renderizado a 390 × 844 pendiente: Browser no pudo adquirir un navegador local durante esta ejecución; no se observó el recorrido de Registro, teclado/cursor, overlays, safe areas ni overflow.
- [ ] En un dispositivo real y sin crear ni modificar datos financieros, recorrer Registro extraordinario, notas/descripción, calculadoras, selectores de lista y validación de guardado; confirmar ausencia de `<select>` nativo, overflow y colisión con safe areas.


## Plantilla de estado de cuenta para auditoría — verificación parcial

- `main` y GitHub Pages se publicaron con `cfo-personal-v7-cache-40` el 2026-07-28; el código actual usa `cfo-personal-v7-cache-41`.
- Observado en Browser a 390 × 844: la fila independiente, la ayuda expandible con `aria-expanded`/`aria-controls` y la nota asociada no produjeron overflow horizontal ni errores de consola. No constituye aceptación de dispositivo/PWA ni auditoría real.
- El evento de descarga de Browser agotó 10 s tras activar la fila; la descarga CSV permanece pendiente de evidencia renderizada, aunque la prueba automatizada cubre los tres encabezados.
- [ ] Descargar `Auditoría — estado de cuenta` desde Ajustes → Descargar templates y confirmar el CSV con `Fecha,Descripción,Monto`.
- [ ] Abrir y cerrar la ayuda `?`; verificar `aria-expanded`, la nota asociada y que ambos controles permanezcan alcanzables sin solape a 390 × 844.
- [ ] En el cierre de Auditoría, confirmar que sólo aparece la carga `Importar archivo CSV/XLSX`, sin una segunda plantilla ni ayuda duplicada.
- [ ] Confirmar en una auditoría real no destructiva que descargar, abrir la ayuda o cargar el template no muta movimientos, saldos, presupuesto ni transferencias.
- [ ] Obtener evidencia de dispositivo/PWA antes de aceptar este flujo fuera de Browser.
