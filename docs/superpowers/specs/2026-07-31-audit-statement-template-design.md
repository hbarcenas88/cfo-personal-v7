# Template de estado de cuenta para Auditoría guiada — Diseño

**Fecha:** 2026-07-31  
**Estado:** diseño aprobado; pendiente de plan técnico y ejecución.

## Objetivo

Dar a la persona un formato único, descargable y fácil de preparar fuera de la app para iniciar Auditoría guiada con un estado de cuenta convertido a CSV/XLSX, sin cambiar movimientos ni reglas financieras.

## Formato canónico

El template contiene una sola hoja/archivo y exactamente estas columnas, en este orden:

```csv
Fecha,Descripción,Monto
2026-07-01,Ejemplo de gasto,-45.90
2026-07-03,Ejemplo de ingreso,1200.00
```

- **Fecha:** obligatoria, formato ISO `AAAA-MM-DD`.
- **Descripción:** obligatoria; conservar el texto bancario útil para revisión humana.
- **Monto:** obligatorio y firmado; negativo representa débito/gasto, positivo representa crédito/ingreso. El punto es el separador decimal; no se usan símbolos monetarios ni separadores de miles.
- Un PDF con fechas `DD/MM/AAAA` se convierte a `AAAA-MM-DD` antes de generar el archivo.
- El CSV abre en Excel y puede guardarse como XLSX; la app acepta ambos formatos.

## Experiencia de uso

1. En **Ajustes → Descargar templates**, la persona ve una opción separada: **Auditoría — estado de cuenta**.
2. Al tocarla se descarga el CSV canónico vacío con las tres cabeceras.
3. Un icono discreto `?` junto a esa opción abre una explicación compacta del formato, las reglas de fecha y signo, y la compatibilidad CSV/XLSX.
4. En Auditoría guiada, el paso de importación sigue enfocado sólo en **Importar archivo CSV/XLSX** y el mapeo existente; no se duplica el template ni la ayuda allí.

## Límites e integridad

- El template no incluye cuenta: la cuenta se elige antes, al abrir el cierre.
- No incluye saldo real, rango ni fecha de corte: esos datos pertenecen al cierre guiado, no al extracto.
- La descarga no crea cierres, no importa filas y no modifica saldos, movimientos, presupuesto, transferencias, provisiones ni trazabilidad.
- La importación existente mantiene su mapeo flexible para extractos bancarios diferentes del formato canónico.

## Prompt de conversión externa

La entrega incluirá un prompt reutilizable para convertir un PDF a una tabla/archivo compatible. El prompt exigirá: extraer sólo movimientos, transformar `DD/MM/AAAA` a ISO, normalizar débito/crédito en un único `Monto` firmado, preservar descripción, excluir saldos/resúmenes/cabeceras y listar por separado filas dudosas sin inventar datos.

## Documentación operativa

La implementación corregirá los textos operativos que aún dicen que el bloque no autoriza merge/publicación. Deben reflejar el estado publicado de `main`/GitHub Pages con `cache-40`, manteniendo como pendientes reales sólo QA visual 390×844, dispositivo real y validación no destructiva con datos respaldados.

## Verificación

- Prueba pura del contenido y nombre del template descargado.
- Prueba de contrato de la fila de Ajustes, botón de información y ausencia de duplicación en el flujo de Auditoría.
- Regresión de importación canónica CSV y XLSX, incluida fecha ISO, monto negativo/positivo y descripción.
- Regresiones financieras existentes y revisión móvil a 390×844.
- Antes de publicar, actualizar `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md` y `V7_ROADMAP.md` sólo con evidencia observada.
