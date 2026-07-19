# CFO Personal V7 — Períodos por contexto y densidad móvil

Estado: diseño aprobado por la persona usuaria el 2026-07-18. Pendiente de revisión escrita, plan técnico e implementación.

## Propósito

Corregir la semántica y la interacción del selector de período antes de continuar la armonización de V7. El resultado debe separar claramente el período global de la investigación local de Auditoría, habilitar comparaciones útiles sólo donde aportan valor y eliminar densidad móvil que hoy interrumpe la lectura y la acción.

## Límites de alcance

Incluido:

- Período global de Balances, Resumen y Categorías.
- Período independiente de Auditoría, sus filtros y su comparación analítica.
- Comparación dentro de Auditoría y Categorías solamente.
- Correcciones estructurales de densidad en selector, filtros de Auditoría, filtros de Categorías y registro de ingresos.
- Pruebas, evidencia móvil y documentación operativa asociadas.

Excluido:

- Rediseño integral de Balances, superficies de Auditoría o navegación; pertenecen a Etapa 2 y 3.
- Comparaciones personalizadas, comparaciones en Resumen o Balances y comparativos anuales avanzados; quedan en backlog posterior.
- Cualquier cambio a cuentas, movimientos, presupuestos, provisiones, transferencias, balances o trazabilidad financiera.

## Modelo de períodos

### Período global

- Sirve a Balances, Resumen y Categorías.
- Tiene tres modos confirmados: mes, año y rango personalizado.
- El selector abre un borrador. Elegir un preset, cambiar fechas o usar calendario sólo cambia ese borrador.
- `Aplicar` confirma el borrador y actualiza las pantallas globales. `Cancelar`, cerrar, Escape o tocar fuera descarta el borrador sin cambiar período, datos ni encabezado.
- Las flechas del encabezado preservan el modo: mes anterior/siguiente, año anterior/siguiente o rango de igual duración desplazado completo hacia atrás/adelante.

### Período de Auditoría

- Es independiente, persistente y abre por defecto en `Todo el historial`.
- Se puede reducir con presets, rango manual o `Copiar período del dashboard`.
- Copiar crea una instantánea del período global confirmado; no establece vínculo vivo.
- El contexto se expresa con un sello discreto, por ejemplo: `Todo el historial · Auditoría no sigue Jun 2026 · Cambiar`.
- El período, filtros y opción de comparación de Auditoría permanecen hasta que la persona los cambie o restablezca.

## Comparación analítica

- Sólo existe dentro del selector de fecha cuando la pantalla activa es Auditoría o Categorías. El selector global no la muestra desde Balances o Resumen.
- Se activa mediante `Comparar con período anterior`. El período de referencia es siempre el inmediatamente anterior y de igual duración; no hay segundo rango manual en esta fase.
- `Todo el historial` no se compara. La interfaz explica que se debe elegir un período acotado.
- La comparación no altera período, filtros, movimientos, presupuestos, cuentas, balances ni trazabilidad. Sólo agrega resultados analíticos.

### Auditoría

- Los filtros activos de texto, cuenta, tipo, categoría y subcategoría se aplican por igual al período actual y al de referencia.
- La lista conserva exclusivamente los registros del período actual. La comparación aparece arriba como total actual, total anterior, diferencia y porcentaje cuando exista base.
- Si el período de referencia no contiene registros, se muestra el monto actual y `Sin base anterior`; nunca se inventa porcentaje.

### Categorías

- Categorías continúa usando el período global; su estado de comparación es exclusivo de esa pantalla y no afecta Balances ni Resumen.
- Respeta las categorías seleccionadas, la búsqueda y la vista de Categorías.
- Compara gasto ejecutado sólo en las vistas `Combinado` y `Solo gasto`. Al elegir `Solo presupuesto`, se oculta la variación y se explica que comparar analiza gasto ejecutado.
- Mientras comparar está activo, se muestra un sello superior de resultado y una línea compacta en cada tarjeta: valor del período anterior, diferencia y porcentaje. Con comparar apagado, las tarjetas mantienen el patrón actual sin densidad adicional.

## Diseño de interacción y densidad móvil

### Selector de período

- El sheet usa una secuencia vertical a 390 × 844: accesos rápidos, Desde, Hasta, comparación si corresponde y pie fijo con `Cancelar` y `Aplicar`.
- Se elimina la pestaña actual `Comparar`, ya que sólo informa y no configura un resultado real.
- Los campos de fecha y las acciones nunca se solapan, se agrupan sin espacios ambiguos y mantienen objetivos táctiles de al menos 44 px.

### Auditoría y Categorías

- Auditoría muestra búsqueda a ancho completo, resumen de filtros activos y un único disparador compacto `Filtros`. Sus selectores propios siguen siendo anclados, buscables cuando corresponde y sin controles nativos.
- Categorías mantiene búsqueda, selector compacto de categorías y vista Combinado/Presupuesto/Gasto, con jerarquía y espacios consistentes.
- Los dropdowns y sheets deben mantener título, opciones, cierre y `Listo` dentro del viewport, sin tapar o quedar detrás de navegación inferior.

### Registro de ingresos

- El monto es el foco de la calculadora.
- La fecha se modifica desde su campo de formulario; se retira la duplicidad visual del calendario dentro de la calculadora.
- Teclado, campos y acción de guardado se ordenan para que ninguna acción secundaria compita con guardar.

## Arquitectura propuesta

- Implementar un controlador reutilizable de período con estado de borrador y confirmación, configurado por ámbito (`global` o `audit`).
- Mantener cálculo de navegación, rango equivalente y comparación como funciones puras reutilizables.
- Separar estado confirmado, borrador efímero de UI y estado analítico de cada pantalla. Ningún handler de una opción temporal debe mutar un período confirmado.
- Extender los servicios de datos para recibir un ámbito/período y filtros explícitos al calcular el período actual y el comparativo. Las funciones no deben escribir datos.

## Casos límite

- Un rango con fechas invertidas no se puede aplicar; se explica el error y se conserva el borrador corregible.
- Un rango de un día se compara con el día anterior.
- Cambiar entre mes, año y rango no convierte silenciosamente el modo de navegación.
- Activar comparación y luego elegir `Todo el historial` la desactiva de forma explícita.
- Si no hay categorías, movimientos o resultados filtrados, se conserva el estado vacío entendible y no se muestran cifras falsas.
- Los nombres largos, importes grandes y múltiples filtros activos no desplazan importe, acciones ni navegación inferior.

## Verificación requerida

- Pruebas unitarias de borrador, aplicar, cancelar, navegación por mes/año/rango y rango anterior equivalente.
- Pruebas de independencia y persistencia del período de Auditoría, de copia puntual del dashboard y de comparación con filtros.
- Pruebas de referencia vacía, de vistas de Categorías y de no mutación de datos financieros.
- Mantener pruebas existentes de almacenamiento, edición y transferencias vinculadas.
- Recorrido a 390 × 844 con datos reales respaldados y con datos largos: sin overflow, controles nativos, superposición, targets menores de 44 px ni pie de acción inaccesible.
- Registrar evidencia de lógica, persistencia y visual en `VERIFIER.md` antes de publicar.

## Documentación afectada

- `DESIGN_SYSTEM.md`: patrones de ámbito, selector, comparación y densidad.
- `PRODUCT_SPEC.md`: comportamiento de períodos y comparación analítica.
- `VERIFIER.md`: criterios y evidencia de entrega.
- `BACKLOG.md`, `PROGRESS.md` y `V7_ROADMAP.md`: prioridad, estado y secuencia.
