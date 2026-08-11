# CFO Personal V7 - Verificador de entrega

## Oleada 1 — sistema de períodos — automatización, QA y revisión aprobados

### Evidencia automatizada — 2026-08-10

- [x] TDD de contratos: `period-scope.test.mjs` falló primero por ausencia de `periodPresetState`; después confirmó estado seleccionado/copiado, igualdad por campos relevantes, ausencia de mutación y markup real con `aria-pressed`, `.selected` y `Seleccionado`.
- [x] TDD de carcasa: `mobile-ui-contract.test.mjs` falló primero porque Auditoría mostraba el período global; después confirmó etiqueta y alcance contextual, microcopy `Sólo afecta Auditoría` y eventos de apertura/desplazamiento con `detail.scope`.
- [x] TDD de interacción: `period-interaction.test.mjs` falló primero por ausencia de desplazamiento persistido por alcance; después confirmó borrador → cancelar/aplicar, copia puntual del dashboard, independencia posterior y datos financieros intactos.
- [x] TDD visual/CSS: el contrato falló contra el sheet sin altura estable; después confirmó fallback `vh`, `dvh`, `overflow: hidden`, único scroll en `.period-sheet-content`, footer fuera del scroll, targets de 44 px y selección con tokens azules existentes.
- [x] TDD PWA: el contrato falló con `cfo-personal-v7-cache-42`; después confirmó `cfo-personal-v7-cache-43` y paridad de precache de `renderCoordinator.js`.
- [x] Ronda de corrección 1: el contrato integral falló porque `Usar período del dashboard` devolvía `selected: true`; después confirmó que la copia es una acción sin `aria-pressed`, `.selected` ni `Seleccionado`, y que existe exactamente una representación del borrador —opción activa o resumen `Selección actual`, nunca ambas— para año actual, mes actual, mes arbitrario y rango personalizado al abrir, copiar y alternar rango/año.
- [x] Ejecutados con código 0 `node --check` para los diez archivos JS modificados, la suite serial de 14 archivos, `git diff --check` y la revisión textual de privacidad; el estado final conserva únicamente cambios de la Oleada 1, su plan fuente y este reporte, sin datos privados.

### QA Browser — 2026-08-10

- [x] Browser disponible, origen local aislado y datos sintéticos/vacíos. Página `CFO Personal V7`, contenido significativo, sin overlay y sin errores ni advertencias de consola relevantes.
- [x] A 390 × 844, el sheet midió 390 × 760 px (top 84, bottom 844); el footer midió 68.67 px y terminó en 843.33, visible sin desplazarlo. `document.body.scrollWidth` permaneció en 390.
- [x] El preset confirmado se mostró con superficie azul, `aria-pressed` y `Seleccionado`. Elegir `Mes pasado` cambió sólo el borrador; `Cancelar` conservó exactamente `Ago 2026` y los 523 caracteres del contenido visible.
- [x] `Desde` y `Hasta` estuvieron ausentes para mes/año y aparecieron únicamente en `Personalizado`. Rango personalizado y año conservaron exactamente 760 px de altura exterior (delta 0); el footer siguió visible.
- [x] Seleccionar 2026 y `Aplicar` actualizó la pastilla global a `2026`. En Auditoría, la pastilla mostró `Todo el historial`, alcance `audit` y `Sólo afecta Auditoría`; `.audit-period-seal` tuvo 0 ocurrencias.
- [x] En Auditoría, `Usar período del dashboard` cambió sólo el borrador; `Cancelar` conservó rótulo y resultados. Tras aplicar la copia, desplazar el global de 2026 a 2027 dejó Auditoría en 2026, confirmando independencia.
- [x] Smoke test de escritorio con ancho efectivo de 1280 px: contenido no vacío, sin overflow horizontal ni consola relevante; el sheet quedó centrado a 640 px con footer visible.
- [x] Re-revisión independiente de la ronda 1 en Browser a 390 × 844: global 2027 → rango mostró un solo resumen `Selección actual: 2027`, sin opción presionada; copiar el dashboard en Auditoría dejó un solo año presionado y la acción de copia sin `aria-pressed`, `.selected` ni `Seleccionado`. Sheet 390 × 760, footer bottom 843.33, ancho 390/390 y consola limpia. Veredicto final: `SPEC PASS` y `QUALITY APPROVED`.

### Revisión y entrega pendientes

- [x] Revisión independiente completada; los dos hallazgos Important se corrigieron en una ronda TDD y la re-revisión final quedó aprobada.
- [ ] La evidencia de Browser no sustituye validación posterior en teléfono, aceptación PWA ni datos reales respaldados.

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
- [x] La verificación registrada para la entrega de Auditoría guiada confirmó que su carcasa PWA usaba `cfo-personal-v7-cache-41`, precargaba `guidedAuditService.js`, `statementFileService.js`, `auditClose.js`, `searchableOptions.js` y el parser local `xlsx.full.min.js`, y ejecutaba el build oficial SheetJS 0.20.3 en una lectura XLSX sintética. La Oleada 0 eleva el worker actual a `cfo-personal-v7-cache-42`.
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

## Oleada 0 — tarjeta móvil de cierres guardados — automatizada y observada en Browser

- [x] Observado el ciclo TDD: `guided-audit.test.mjs` falló primero por ausencia del bloque semántico de contenido y `mobile-ui-contract.test.mjs` falló por ausencia del grid de fila; ambos pasaron después de la implementación.
- [x] `guided-audit.test.mjs` cubre un cierre con nombre largo y estado `Delta detectado: revisar`, y confirma clases separadas para nombre, fecha, estado, monto y chevrón.
- [x] `mobile-ui-contract.test.mjs` exige fila `minmax(0, 1fr) auto`, contenido con `min-width: 0`, metadatos en columnas separadas, apilado a 420 px, texto largo con wrap y SVG dentro de un contenedor `var(--control-md)` de 44 × 44 px. El botón completo conserva `min-height: var(--control-md)`.
- [x] Ejecutados con código 0 `node --check` para `auditClose.js`, `guided-audit.test.mjs` y `mobile-ui-contract.test.mjs`; las dos pruebas enfocadas y la batería serial de 13 archivos también pasaron. `git diff --check` terminó con código 0 y sólo mostró advertencias informativas LF → CRLF.
- [x] Paridad PWA de la Oleada 0 cubierta por TDD: el contrato enfocado falló con `cache-41` y `renderCoordinatorPrecached: false`; después confirmó `cfo-personal-v7-cache-42` y `./src/utils/renderCoordinator.js` dentro del `APP_SHELL` evaluado.
- [x] QA Browser a 390 × 844 con origen local aislado y datos sintéticos: recorrido Cuenta → rango/corte/saldo → CSV → mapeo → revisión → cierre guardado. La tarjeta `Delta detectado: revisar` se observó sin recorte ni solape; midió 321 × 86 px dentro de un documento de 390 px, con chevrón 44 × 44 px y SVG 16 × 16 px. Toda la fila conservó semántica de botón. La variante `Cuadrado` y el nombre largo quedan cubiertos por contratos automatizados deterministas.
- [x] QA Browser de estabilidad: se abrieron y cerraron el menú y el selector independiente de Auditoría, se cambió de `Por rango` a `Por año`, y se abrió Registro para conservar el texto `Borrador sintético de estabilidad` durante la interacción, sin mutar datos financieros.
- [x] Ronda de corrección 1: `.period-sheet-content` se desplazó por interacción a `scrollTop` 286; al seleccionar `Personalizado` y reconstruir el sheet quedó en 285. El revisor integral confirmó `SPEC PASS` y `QUALITY APPROVED`, sin hallazgos pendientes.
- [x] Recarga fresca del origen local: título `CFO Personal V7`, contenido no vacío, sin overlay de error, evento `pageerror`, errores ni advertencias de consola durante la recarga observada; sí se registraron mensajes informativos esperados de carga de estado, registro del service worker y clics.
- La evidencia automatizada y renderizada en Browser no sustituye dispositivo físico, aceptación PWA ni validación con datos reales.

## Estabilidad móvil de Registro — automatizada, QA renderizado pendiente

- [x] Ejecutados con código 0 los `node --check` de `keypad.js`, `searchableOptions.js`, `recordFlow.js`, `audit.js`, `categories.js`, `main.js` y `service-worker.js`; también `keypad`, `record-flow`, `searchable-options`, `storage-scope`, `transaction-edit`, `capacity-summary`, `period-scope`, `comparison-analysis`, `guided-audit`, `guided-audit-state` y `mobile-ui-contract`.
- [x] En la entrega de Estabilidad móvil de Registro, `mobile-ui-contract.test.mjs` confirmó keypad clásico compartido sin acción `confirm`, acción `back`, selector buscable bajo apertura intencional, ausencia de `autofocus` en Auditoría y la carcasa PWA entonces vigente, `cfo-personal-v7-cache-41`, que precargaba `searchableOptions.js`. La carcasa actual de la Oleada 0 usa `cfo-personal-v7-cache-42`.
- [ ] QA renderizado a 390 × 844 pendiente: Browser no pudo adquirir un navegador local durante esta ejecución; no se observó el recorrido de Registro, teclado/cursor, overlays, safe areas ni overflow.
- [ ] En un dispositivo real y sin crear ni modificar datos financieros, recorrer Registro extraordinario, notas/descripción, calculadoras, selectores de lista y validación de guardado; confirmar ausencia de `<select>` nativo, overflow y colisión con safe areas.


## Plantilla de estado de cuenta para auditoría — verificación parcial

- `main` y GitHub Pages se publicaron con `cfo-personal-v7-cache-40` el 2026-07-28; el código actual usa `cfo-personal-v7-cache-42`.
- Observado en Browser a 390 × 844: la fila independiente, la ayuda expandible con `aria-expanded`/`aria-controls` y la nota asociada no produjeron overflow horizontal ni errores de consola. No constituye aceptación de dispositivo/PWA ni auditoría real.
- El evento de descarga de Browser agotó 10 s tras activar la fila; la descarga CSV permanece pendiente de evidencia renderizada, aunque la prueba automatizada cubre los tres encabezados.
- [ ] Descargar `Auditoría — estado de cuenta` desde Ajustes → Descargar templates y confirmar el CSV con `Fecha,Descripción,Monto`.
- [ ] Abrir y cerrar la ayuda `?`; verificar `aria-expanded`, la nota asociada y que ambos controles permanezcan alcanzables sin solape a 390 × 844.
- [ ] En el cierre de Auditoría, confirmar que sólo aparece la carga `Importar archivo CSV/XLSX`, sin una segunda plantilla ni ayuda duplicada.
- [ ] Confirmar en una auditoría real no destructiva que descargar, abrir la ayuda o cargar el template no muta movimientos, saldos, presupuesto ni transferencias.
- [ ] Obtener evidencia de dispositivo/PWA antes de aceptar este flujo fuera de Browser.
