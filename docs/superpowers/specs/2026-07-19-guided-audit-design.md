# Auditoría guiada por cuenta y fecha — Diseño aprobado

**Fecha:** 2026-07-19  
**Estado:** diseño aprobado; pendiente de revisión escrita y plan de implementación  
**Alcance:** iniciativa analítica independiente dentro de Auditoría de CFO Personal V7

## Propósito

Permitir a la persona cerrar una cuenta cuando lo necesite —mensual, quincenal o en otra fecha— comparando el saldo y movimientos registrados en V7 con un estado de cuenta externo preparado como CSV/XLSX. El resultado debe explicar diferencias y conservar la revisión, sin forzar cuentas ni modificar la contabilidad de la app.

## Resultado de producto

Un cierre pertenece a una cuenta y contiene una fecha de corte, saldo real ingresado, rango declarado del estado de cuenta, filas bancarias normalizadas y decisiones de revisión. Al terminar, el cierre queda como `Cuadrado` o `Delta detectado: revisar`; ambos estados pueden reabrirse.

El cierre no es una conciliación bancaria automática ni una escritura financiera. Confirmar una coincidencia crea solo trazabilidad analítica del cierre.

## Alcance de la primera versión

Incluye:

- Cierres flexibles por cuenta y fecha de corte.
- Ingreso manual de saldo real y rango cubierto por el extracto.
- Carga local de CSV/XLSX preparado por la persona y asignación de fecha, descripción y un importe firmado o columnas separadas de débito/crédito.
- Persistencia de filas normalizadas dentro del cierre, sin almacenar el archivo original.
- Detección y revisión de coincidencias, diferencias y delta.
- Confirmar, descartar o dejar pendientes relaciones dentro de un cierre; reabrir cierres anteriores.

No incluye:

- Procesamiento de PDF o imágenes, OCR, conexión bancaria o carga de archivos a un servicio externo.
- Ajustes para cuadrar, creación o edición de movimientos, categorías, saldos, presupuesto o transferencias.
- Conciliación automática, emparejamiento automático ambiguo ni marcado masivo de extraordinarios.

## Recorrido guiado

1. La persona selecciona una cuenta, fecha de corte, saldo real y el rango del extracto.
2. Carga el CSV/XLSX y confirma fecha, descripción y una de estas variantes: importe firmado, o débito y crédito separados. La app normaliza débito como negativo y crédito como positivo, valida que haya filas utilizables y que el rango declarado sea coherente.
3. La app normaliza las filas localmente y calcula el saldo registrado y delta para la misma cuenta y corte.
4. Presenta las diferencias prioritarias y las sugerencias de coincidencia.
5. La persona confirma, descarta o mantiene pendientes las relaciones propuestas.
6. La app conserva el cierre como `Cuadrado` o `Delta detectado: revisar`, con posibilidad de reabrirlo.

## Reglas de comparación

- La comparación se limita a la cuenta y rango declarados.
- Importe normalizado con signo, fecha y descripción similar forman una coincidencia sugerida.
- Importe igual con fecha desplazada hasta ±2 días es una advertencia y requiere revisión humana.
- Importe igual fuera de ese margen es un candidato lejano, no una coincidencia.
- Varios candidatos posibles para una misma fila son ambiguos; V7 no elige por la persona.
- La revisión prioriza `Solo en la app`, `Solo en el banco` y `Advertencia de fecha`.
- Descartar una pareja evita proponer esa misma relación dentro del cierre, pero conserva ambas filas disponibles para otras revisiones.

## Datos y límites de integridad

El dominio de cierres está separado de movimientos, presupuestos, provisiones y transferencias. Un cierre debe persistir sus metadatos, filas normalizadas, huella de importación, relaciones confirmadas, descartes y pendientes. No persiste el binario ni el nombre del archivo fuente.

Una relación de cierre referencia una fila bancaria normalizada y un movimiento existente; no añade campos financieros al movimiento. Borrar un cierre exige confirmación explícita y elimina únicamente su evidencia y decisiones analíticas. La importación repetida, columnas insuficientes, importes o fechas inválidos y filas fuera del rango declarado se rechazan con una explicación recuperable antes de guardar evidencia.

## Diseño móvil

El cierre se integra en Auditoría como un flujo de cinco pasos: datos, importación, análisis, revisión y resultado. La vista de revisión mantiene cuenta, fecha de corte, saldo registrado, saldo real y delta en la cabecera. Las bandejas de `Solo en la app`, `Solo en el banco` y `Advertencia de fecha` tienen prioridad sobre coincidencias confirmadas.

La importación y la asignación de columnas usan sheets y controles propios; no hay `<select>` nativos. Los estados usan texto además del color, acciones de al menos 44 px y no deben crear overflow horizontal a 390 × 844. `Delta detectado: revisar` es un estado de trabajo, no un error financiero.

## Manejo de fallos

- Archivo no legible o columnas requeridas ausentes: exigir fecha, descripción y un importe firmado o débito/crédito; explicar qué dato falta y no crear el cierre.
- Fechas o importes inválidos: mostrar filas rechazadas y permitir corregir la asignación antes de continuar.
- Archivo fuera del rango declarado: advertir y bloquear hasta ajustar el rango o reemplazar el archivo.
- Importación repetida: detectar la misma evidencia normalizada y evitar duplicarla.
- Sin candidato o con varios candidatos: mantener la diferencia visible, sin inferir una respuesta.

## Verificación requerida

- Pruebas puras para normalización de importe firmado y de débito/crédito, huella de importación, coincidencias exactas, ±2 días, candidato lejano y ambigüedad.
- Pruebas de persistencia, reapertura, confirmación, descarte y pendiente sin mutar datos financieros.
- Pruebas de rechazo de importación inválida, fuera de rango o repetida.
- Prueba de regresión que transferencias vinculadas, saldos, presupuesto y trazabilidad financiera permanecen intactos.
- Revisión a 390 × 844 con controles propios, sin `<select>` nativos, sin overflow ni interferencia con la navegación inferior.
- Validación manual con un respaldo JSON confirmado y datos reales, sin crear, editar ni borrar registros financieros reales.

## Documentos operativos afectados

- `BACKLOG.md`: prioriza la iniciativa antes de la conciliación mensual y PDF.
- `PROGRESS.md`: registra diseño aprobado, límites y siguiente puerta.
- `VERIFIER.md`: define evidencia futura de integridad, importación y móvil.
- `PRODUCT_SPEC.md`: fija el flujo y las reglas de no mutación.
- `DESIGN_SYSTEM.md`: fija jerarquía, estados y controles móviles.
- `V7_ROADMAP.md`: sitúa la iniciativa como analítica independiente de Prioridad 0.
