# Oleada 4 — Importación asistida

**Fecha:** 2026-08-24  
**Fuente de verdad:** alcance aprobado de la Oleada 4, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `BACKLOG.md` y el flujo CSV V7 existente.

## Resultado esperado

La persona puede importar Movimientos o Presupuestos desde CSV con rapidez, sin que una cuenta, categoría, subcategoría o tipo ambiguo se guarde como texto libre o se interprete sin su decisión. La revisión ocurre por grupos equivalentes y no muta datos hasta una confirmación final. Al confirmar, el lote se aplica íntegramente o no se aplica; su origen y cada resolución quedan trazables en el respaldo JSON.

## Alcance confirmado

### Tipos de archivo y dominio

- La Oleada 4 cubre los importadores CSV existentes de `Movimientos` y `Presupuestos`.
- Conserva los encabezados, parser CSV, aliases admitidos y exportación CSV actuales. No incorpora XLSX, PDF, OCR, conexión bancaria ni un mapeador genérico de columnas.
- No rediseña los importadores de Cuentas, Categorías, Provisiones o Recurrentes como flujos independientes. Sólo puede crear cuentas, categorías o subcategorías cuando una importación de Movimientos o Presupuestos las necesita y la persona lo confirma.
- El CSV de intercambio conserva sus columnas actuales. El respaldo JSON es el formato que preserva la trazabilidad de importación.

### Estados de revisión

El análisis puro construye un borrador de revisión sin persistencia. Cada campo relevante se clasifica como:

- `matched`: coincide de forma canónica con un valor existente;
- `new`: no existe y requiere una decisión;
- `ambiguous`: no puede interpretarse sin elección humana;
- `invalid`: no cumple el formato requerido;
- `possibleDuplicate`: puede corresponder a un movimiento ya importado o repetido, pero no se elimina automáticamente.

Los campos con revisión asistida son `cuenta`, `categoría`, `subcategoría` y `movimiento`. Fecha, monto y mes continúan siendo validaciones de formato bloqueantes.

### Decisiones de la persona usuaria

Para una cuenta, categoría o subcategoría nueva o dudosa, la interfaz ofrece sólo acciones explícitas:

1. Elegir un valor existente mediante selector móvil propio.
2. Corregir el texto del valor importado.
3. Crear el valor nuevo.
4. Descartar la fila afectada.

Crear cuenta solicita o conserva visible el tipo de cuenta; su saldo inicial es cero y no se crea ajuste inicial. Crear categoría o subcategoría no modifica movimientos existentes. Una subcategoría sólo se elige o crea dentro de la categoría que ya quedó resuelta en el mismo borrador.

Para `movimiento`, los únicos destinos importables en esta oleada son `Ingreso` y `Gasto`. Un tipo faltante, desconocido o ambiguo exige elegir uno de esos dos destinos. No se crea un catálogo de tipos ni se infiere el resultado de forma silenciosa.

### Aplicación por grupo

Cada resolución presenta el valor origen, destino, número de filas afectadas y la acción opcional `Aplicar a N equivalentes`. La aplicación masiva no está marcada por defecto.

- La equivalencia de cuenta, categoría y movimiento se determina por el valor de origen canónico y el tipo de importación.
- La equivalencia de subcategoría requiere además que la categoría resuelta sea la misma.
- La persona puede conservar excepciones editando o descartando filas individuales.
- Toda aplicación masiva conserva una resolución por fila en la trazabilidad final.

### Duplicados y filas no importables

- Reimportar la misma fila de un lote ya confirmado se bloquea antes de crear datos.
- Una colisión semántica —misma fecha, cuenta resuelta, importe, tipo, categoría, subcategoría y descripción canónicas— se presenta como posible duplicado. La persona puede aprobarla o descartarla; no se descarta en automático porque movimientos legítimos pueden ser iguales.
- Las filas inválidas, no resueltas o no aprobadas como posibles duplicados no entran en la confirmación final. La persona debe resolverlas o descartarlas explícitamente.

### Transferencias, provisiones y tipos no soportados

`Transferencia`, `Provisión` y cualquier otro tipo distinto de Ingreso/Gasto quedan bloqueados en esta oleada. No se degradan a ingreso o gasto ni se importan como un único movimiento, porque una transferencia debe conservar su par vinculado y sus reglas financieras. La pantalla explica que esas filas se deben descartar o resolver por su flujo específico en una oleada posterior.

## Recorrido móvil

1. La persona abre Importar datos, elige Movimientos o Presupuesto y carga un CSV.
2. El sistema analiza el archivo localmente y muestra un resumen: leídas, listas, por resolver, posibles duplicados y descartadas.
3. Las incidencias se agrupan por decisión reutilizable. Cada grupo muestra las filas afectadas, su valor original y acciones de resolver.
4. Al resolver, puede aplicar la acción a equivalentes o conservar sólo una excepción. La vista previa se actualiza sin reconstruir el control activo ni perder foco.
5. La confirmación final muestra filas que se crearán, filas descartadas, cuentas/categorías/subcategorías que se crearán y advertencias aprobadas.
6. Confirmar ejecuta un solo lote. El resultado informa totales importados, descartados y catálogos creados. Cancelar o cerrar antes de confirmar no persiste cambios.

El recorrido mantiene controles propios, targets de al menos 44 px, cierre visible, Escape, toque exterior, foco inicial/retorno y ausencia de overflow horizontal a 390 × 844.

## Arquitectura propuesta

### Servicio puro de revisión

`src/services/assistedImportService.js` transforma objetos CSV y estado actual en un `ImportReviewDraft` puro. Expone clasificación, agrupación, aplicación de decisiones, detección de duplicados, resumen y construcción del plan final. No llama a IndexedDB ni modifica `state`.

El borrador mantiene como mínimo:

```js
{
  kind: 'transactions' | 'budgets',
  rows: [{ sourceRow, original, resolved, issues, decisions, status }],
  groups: [],
  discardedRows: [],
  duplicateWarnings: [],
  fingerprint: ''
}
```

`original` conserva todos los valores de los campos que se usan para importar. `resolved` sólo representa valores destinados a persistirse después de la confirmación. Ninguna corrección sustituye `original`.

### Plan inmutable y escritura atómica

Antes de confirmar, el servicio produce un plan validado:

```js
{
  batch: { id, fingerprint, importedAt, kind },
  catalogCreates: { accounts, categories, subcategories },
  transactions: [],
  budgets: [],
  skippedRows: [],
  decisions: [],
  duplicateWarnings: []
}
```

La aplicación vuelve a validar el plan y lo ejecuta mediante una sola `mutate()`. Esta mutación crea catálogos y filas juntas, persiste el lote y permite el único deshacer inmediato existente. Si el preflight falla, no se escribe nada.

No se introduce una acción persistente de “revertir lote”: después de nuevas ediciones, podría borrar catálogos o movimientos utilizados por datos posteriores. El único rollback incluido es el deshacer inmediato del lote recién confirmado.

### Trazabilidad y compatibilidad

Cada movimiento o presupuesto creado incluye:

```js
importMeta: {
  batchId,
  source: 'CSV',
  sourceRow,
  original,
  resolutions,
  importedAt
}
```

El estado añade `importBatches` con información mínima de cada lote, incluido su fingerprint. Las migraciones de estado aceptan datos históricos sin `importMeta` o `importBatches`. `normalizeTransaction`, `normalizeBudget`, backup, restauración y persistencia propagan la metadata de forma explícita.

## Invariantes financieras y de datos

- Nunca se crean movimientos con cuenta no resuelta como texto libre.
- Nunca se infiere un tipo ambiguo al confirmar.
- Transferencias no se convierten en un movimiento aislado.
- Catálogos y filas de un lote se crean juntos o no se crean.
- La importación no modifica movimientos, presupuestos, cuentas o categorías existentes.
- Las correcciones y decisiones masivas son trazables por fila.
- CSV histórico y respaldos JSON sin metadata nueva siguen cargando.
- No se añade información personal, archivos de origen ni backups al repositorio.

## Pruebas y QA

### Automatización

- Servicio puro: clasificación, coincidencia canónica, creación propuesta, subcategoría contextual, tipo ambiguo, decisiones por grupo y conservación de original.
- Preflight: archivos/encabezados inválidos, cero filas importables, cancelación sin escritura y plan inmutable.
- Duplicados: reimportación bloqueada, posible duplicado explícitamente aprobado o descartado, repeticiones legítimas admitidas sólo tras confirmación.
- Atomicidad: catálogo y fila se crean en una mutación; fallo previo no altera estado; deshacer inmediato revierte el lote.
- Integridad financiera: Ingreso/Gasto conservan sus reglas; Transferencia/Provisión no se degradan ni se importan.
- Persistencia: recarga, respaldo y restauración conservan `importMeta` e `importBatches`; estados legacy se migran sin pérdida.
- PWA: assets nuevos precacheados, paridad de `APP_SHELL` y aumento de cache.

### QA renderizado y revisión

- Browser a 390 × 844 con CSV sintético: grupos, excepciones, conteos, confirmación, cancelación, foco, scroll, cierre de overlays, sin `<select>` nativo ni overflow.
- Revisión de escritorio sólo como smoke complementario.
- Consola sin errores o advertencias relevantes.
- Revisión independiente, timebox de 40 minutos, contra esta especificación, criterios de aceptación y el flujo visible.
- Antes de publicar: pruebas completas, sintaxis, privacidad, `git diff --check`, un commit único de oleada y autorización textual fresca para push.

## Fuera de alcance

- XLSX, PDF, OCR, bancos conectados y archivos subidos a servicios externos.
- Mapeo genérico de columnas.
- Importación de transferencias o provisiones.
- Reversión persistente de lotes.
- Exportar trazabilidad completa en CSV.
- Rediseño de importadores de catálogos, recurrentes o provisiones.
- Cambios a fórmulas financieras, capacidad de pago, planeación o auditoría guiada.

## Criterios de aceptación

- Una cuenta, categoría o subcategoría no coincide ni se persiste hasta estar resuelta, creada o descartada explícitamente.
- `Aplicar a N equivalentes` muestra alcance y no afecta excepciones fuera de ese grupo.
- Cerrar o cancelar antes de confirmar deja el estado exactamente igual.
- Confirmar un lote aplica catálogos y filas juntos y permite deshacer inmediato como una unidad.
- La importación conserva valor original, fila fuente y decisiones por fila en JSON.
- Transferencias y tipos no soportados se bloquean de manera comprensible y no alteran saldos.
- Los datos legacy siguen funcionando.
- El flujo móvil es legible, alcanzable y estable a 390 × 844.
