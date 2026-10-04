# Verificación independiente — ampliación de planeación

Fecha: 04/10/2026. Aplicación local V7.0.7, service worker cache-51.

Verificador nuevo que no implementó esta ampliación. Entrega local aprobada sin hallazgos pendientes. No acredita publicación externa, aceptación en teléfono físico ni validación con datos financieros reales.

## Evidencia automatizada

- Suite completa: 46 archivos de pruebas pasan, ejecución independiente sobre el conjunto integrado.
- Sintaxis: 30 archivos JavaScript, incluido service worker, pasan.
- Diff: sin errores de whitespace; avisos habituales de conversión LF/CRLF.
- Pruebas de dominio cubren presupuesto base independiente, copia por grupos faltantes con multiplicidad, IDs nuevos, catálogo candidato, persistencia, respaldo/restauración, deshacer, conflictos y fallo de almacenamiento.
- Búsqueda en fuente activa, index y service worker sin rutas, controles o dependencias de Auditoría guiada. Los cierres históricos se conservan como datos compatibles de respaldo.

## Recorridos observados

Origen aislado `http://127.0.0.1:8800/`, únicamente escenario sintético; no se modificó el origen del usuario 8799. Navegador a 390 × 844 y escritorio 999 × 914.

1. Presupuesto base: editar Luz de 50 a 70, Guardar de fila incorpora el cambio al borrador y Guardar plan devuelve a Planeación. Tras recarga, cargar la base conserva Agua mensual 210 y añade Luz 70: total 280. Repetir carga mantiene dos filas y total 280.
2. Categoría nueva Viajes QA: permanece pendiente hasta Guardar plan. Cancelar y descartar elimina la categoría del borrador sin crearla en el catálogo; al añadir de nuevo y guardar el conjunto aparece en el editor posterior.
3. Gestor: una categoría Hogar con total 280 abre y cierra dos filas independientes Agua 210 y Luz 70. Ajuste puntual muestra Guardar y preserva el contexto de la fila.
4. Guardar plan desde Categorías regresa a Categorías; desde Planeación regresa a la vista de origen.
5. Provisiones: reserva 150, asignado 50, sin asignar 100, sin donut ni barra. Provisión con saldo cero sigue accesible. Números visibles a 19.5 px en móvil.
6. Auditoría normal muestra movimientos, filtros, fechas y acciones, sin entrada de Auditoría guiada.
7. Editor móvil: viewport y scrollWidth 390, sin overflow horizontal, botones visibles de al menos 44 px y cero select nativos. Consola final sin errores.
8. Offline real: coordinador detuvo el servidor 8800; recarga conservó Balances y datos, se pudo navegar a Categorías, abrir planeación y cargar presupuesto base sin duplicados. Servidor reiniciado después.

## Hallazgo corregido y revisado

P3: el gestor mostraba el identificador técnico Budget en las filas sin cuenta. Se sustituyó por Sin cuenta; revalidado en navegador y pruebas enfocadas de gestor y resumen de provisiones, sin fallo.

## Capturas sintéticas

- `C:/Users/hbarc/.codex/visualizations/2026/10/03/01a10039-5e34-7920-a5b7-db8ecfd1559b/refinements-mobile-independent.png`
- `C:/Users/hbarc/.codex/visualizations/2026/10/03/01a10039-5e34-7920-a5b7-db8ecfd1559b/refinements-desktop-independent.png`

Las pruebas de almacenamiento y restauración son automatizadas con almacenamiento sintético; no se afirma un recorrido manual de respaldo/restauración con datos reales. El coordinador retiró el fixture temporal de navegador al concluir.
