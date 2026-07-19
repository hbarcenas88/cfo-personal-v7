# Diseño: gráfico de gasto operativo

**Estado:** aprobado conceptualmente; pendiente de revisión de esta especificación y planificación técnica.

## Objetivo

Convertir el bloque `Gasto operativo por categoría` de Resumen en una lectura móvil clara y serena. Debe revelar la distribución del gasto cotidiano sin competir visualmente con Salud presupuestaria, Capacidad de pago ni Ritmo presupuestario.

## Alcance

- Sustituir el patrón actual de texto dentro de la barra y porcentaje como columna dominante.
- Conservar el máximo de cinco categorías, el sheet `Análisis` y el acceso a Categorías.
- Conservar la exclusión analítica de extraordinarios y categorías; no cambiar reglas financieras, presupuestos, cuentas, totales ni trazabilidad.
- Aplicar el patrón sólo a la tarjeta de gasto operativo en esta iteración.

## Patrón visual aprobado

La tarjeta contiene:

1. Encabezado existente: icono suave, título `Gasto operativo`, estado analítico y acción `Análisis`.
2. Total analizado del período en una superficie suave y compacta.
3. Hasta cinco filas ordenadas por gasto. Cada fila muestra:
   - marcador cuadrado pequeño en el color de la categoría;
   - nombre de la categoría a la izquierda;
   - monto alineado a la derecha, con cifras tabulares;
   - barra fina en una segunda línea;
   - porcentaje pequeño y secundario a la derecha de la barra.
4. Acciones existentes `Análisis` y `Ver categorías` al final.

No se escribe texto dentro del relleno de una barra. El porcentaje y el monto se conservan, pero no compiten por la misma línea visual.

## Semántica de datos

- El total corresponde a la suma de categorías operativas incluidas por `Análisis` dentro del período.
- El monto de la fila corresponde a su gasto operativo incluido.
- El porcentaje es `gasto de categoría / total operativo incluido`.
- El ancho de la barra usa exactamente ese mismo porcentaje. Por tanto, el número y la longitud expresan el mismo universo; no se escala contra la mayor categoría.
- Los filtros de `Análisis` siguen afectando las gráficas operativas según las reglas actuales: extraordinarios y categorías excluidos salen tanto de la lectura operativa como del ritmo presupuestario correspondiente.
- Una categoría sin gasto no ocupa una fila. Si no hay datos, se conserva el estado vacío existente.

## Interacción y accesibilidad

- La tarjeta no requiere interacción por fila en esta fase; las acciones explícitas llevan a Análisis o Categorías.
- El nombre puede truncarse con el monto siempre visible; el porcentaje no se recorta.
- Barras de al menos 8 px de alto, contraste suficiente y color acompañado siempre por texto y cifra.
- La barra representa información, no una acción táctil; no se añadirá un target táctil ambiguo.

## Responsabilidades técnicas

- `financeService`: exponer o reutilizar un total operativo que use el mismo conjunto filtrado que las filas.
- `summary.js`: calcular porcentaje, emitir estructura semántica por fila y conservar el orden actual.
- `screens.css`: reemplazar el layout de la barra para separar encabezado de fila, pista y metadato porcentual.
- `DESIGN_SYSTEM.md`: registrar el patrón como acuerdo vigente de Resumen una vez implementado.
- Pruebas: cubrir que los porcentajes y barras usan el total operativo filtrado, y revisar el layout a 390 × 844.

## No objetivos

- No rediseñar Ritmo presupuestario ni las tarjetas de capacidad/salud.
- No introducir gráficos circulares, chips de categoría ni un selector adicional.
- No cambiar la lógica de presupuestos o los datos personales.

## Criterios de aceptación

- El monto y porcentaje son visibles para cada fila mostrada.
- No hay texto dentro de las barras ni una columna de porcentaje dominante.
- El ancho de cada barra coincide con el porcentaje mostrado, calculado sobre el mismo total operativo filtrado.
- La tarjeta no genera overflow ni recortes a 390 × 844.
- Extraordinarios y categorías excluidas continúan siendo sólo analíticos.
