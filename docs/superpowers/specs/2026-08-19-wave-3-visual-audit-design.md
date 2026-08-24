# Oleada 3 — Auditoría visual, interacción y Planeación compacta

**Fecha:** 2026-08-19  
**Fuente de verdad:** plan general aprobado, feedback visual de la usuaria y estado publicado de la Oleada 2 (`922f395`).

## Resultado esperado

CFO Personal debe sentirse como un producto móvil terminado: superficies simétricas, iconos contenidos, controles alcanzables, filtros comprensibles y navegación sin apilar gestores completos. Esta oleada corrige patrones transversales, no sólo los ejemplos señalados en Auditoría y Categorías.

No cambia reglas financieras, cálculos, persistencia ni semántica de presupuestos, provisiones o recurrentes. Cualquier cambio visible en esos dominios es de navegación, presentación o accesibilidad.

## Alcance funcional confirmado

### 1. Fundamentos visuales y de interacción

- Todos los SVG funcionales tienen dimensiones explícitas. Una X o chevrón nunca toma el tamaño intrínseco del contenedor.
- Los botones sólo-icono conservan un objetivo táctil mínimo de 44 × 44 px, con SVG de 16–20 px y nombre accesible.
- Las acciones equivalentes dentro de una misma fila usan alturas, radios, gaps y jerarquías equivalentes. Las acciones destructivas usan una variante destructiva real, nunca texto rojo sobre botón azul.
- Sheets y dropdowns comparten cierre visible, Escape, toque exterior, foco inicial y retorno de foco. La restauración de scroll se limita al mismo overlay; no se transfiere entre sheets diferentes.
- Texto normal y estados de control cumplen contraste 4.5:1; componentes gráficos y bordes significativos cumplen 3:1.
- Texto persistido o importado se escapa en la frontera de render. Los colores inline se validan contra formatos/valores aceptados.

### 2. Planeación compacta

La entrada de Planeación muestra únicamente un hub compacto con tres opciones:

- Presupuestos
- Provisiones
- Recurrentes

Al elegir una opción se abre una subvista propia, no los tres gestores apilados. Cada subvista ofrece dos decisiones claras:

- `Ver lo planeado`
- `Crear nuevo` o su equivalente gramatical (`Nueva provisión`, `Nuevo recurrente`)

`Ver lo planeado` abre el gestor correspondiente y conserva una acción visible para crear. Presupuestos mantiene su filtro mensual. Provisiones usa filtros semánticos `Activas`, `Liberadas` y `Todas`, sin inventar un filtro mensual. Recurrentes separa vigentes y completos si ese estado existe en los datos actuales. Volver regresa un solo nivel y conserva la selección de sesión.

La fila de provisión sólo presenta meta y fecha cuando existen; las fechas se muestran en formato humano. Planeación no usa `<select>` nativos ni modifica ninguna regla de negocio.

### 3. Auditoría

- La X junto al buscador limpia sólo la búsqueda y sólo aparece cuando hay texto.
- `Limpiar todos` vive junto al resumen de filtros y sólo aparece cuando hay filtros activos.
- El buscador tiene nombre accesible persistente; las opciones y disparadores comunican selección, expansión y relación.
- Los cuatro disparadores de filtro llenan su columna y forman pares geométricamente iguales.
- Buscar dentro de un dropdown, seleccionar varias opciones y continuar conserva consulta, lista filtrada, foco y scroll interno.
- Las tarjetas escapan descripción, categoría, subcategoría y cuenta. Nombres largos e importes grandes no se solapan.
- El cierre guiado unifica alturas de decisiones, separa las acciones de confirmación destructiva y muestra foco visible en el selector de archivo.

### 4. Categorías

- En móvil, la búsqueda usa ancho completo y el selector de categorías ocupa una segunda fila deliberada; ambos controles mantienen alturas coherentes.
- `Limpiar filtros` sólo aparece cuando hay búsqueda o categorías seleccionadas.
- El selector `Todas las categorías` no se comprime artificialmente y su chevrón queda contenido.
- El segmentado usa tres superficies simétricas, con etiquetas breves `Combinado`, `Presupuesto` y `Gasto`, sin wrapping accidental y con una señal seleccionada que no depende sólo del color.
- Seleccionar filtros o expandir una categoría conserva foco y posición. Cada tarjeta expandible expone `aria-expanded` y una relación accesible.
- Los estados vacíos distinguen ausencia de datos de ausencia de coincidencias y ofrecen limpiar filtros cuando corresponde.

### 5. Resto de superficies

La auditoría corrige, como mínimo, los defectos sistémicos confirmados:

- Chevrons finales contenidos en drawer, Ajustes, Registro y acciones de creación.
- Targets táctiles menores de 44 px en chips de subcategoría, flechas de orden, acciones de Resumen, segmentados y cierre guiado.
- Estado seleccionado y semántica de `Completo` en recurrentes.
- Gráfico de provisiones sin gradiente multicolor cuando no hay datos.
- Montos de Resumen legibles sin elipsis destructiva y eliminación de entradas visuales duplicadas comprobadas.
- Acción explícita y descubrible para auditar un saldo desde Balances; no se depende de un doble toque oculto.
- Ajustes distingue acciones normales, avanzadas, futuras y destructivas; las futuras no parecen activas y el borrado total conserva confirmación inequívoca.
- Copia visible usa español consistente y acentos correctos.

## Fuera de alcance

- Cambiar fórmulas financieras o recalcular saldos.
- Crear provisiones reales, movimientos bancarios o nuevos tipos de datos.
- Redefinir `Comparar con período anterior` de Auditoría.
- Rediseñar la identidad visual o sustituir la paleta por una marca nueva.
- Publicar sin autorización textual fresca para el SHA final.

## Criterios de aceptación

### Geometría y diseño

- A 390 × 844 no existe overflow horizontal, contenido bajo la navegación inferior ni controles interactivos menores de 44 px.
- X visible de 18–20 px dentro de target 44 × 44; chevrons de 16–20 px dentro de una columna estable.
- Pares y segmentados tienen delta máximo de 1 px entre alturas equivalentes.
- Planeación inicial no renderiza simultáneamente los tres gestores ni requiere recorrerlos con scroll.
- Las vistas de Planeación conservan una ruta inequívoca `hub → tipo → ver/crear → detalle`.

### Interacción y accesibilidad

- Todo overlay afectado cierra por control visible, Escape y exterior; el foco vuelve al disparador exacto.
- Auditoría conserva búsqueda, foco y scroll al seleccionar múltiples opciones.
- Categorías conserva scroll y foco al filtrar, cambiar vista o expandir.
- Los estados seleccionados/expandidos tienen semántica accesible y señal no dependiente sólo del color.
- Pruebas con `Casa "A"`, `Comida <especial>` y `A&B` muestran texto literal y ningún nodo inesperado.

### Regresión y PWA

- Las 21 pruebas actuales continúan pasando y se añaden contratos dirigidos para los nuevos comportamientos.
- Todo JavaScript modificado pasa comprobación sintáctica.
- `service-worker.js` sube a `cfo-personal-v7-cache-47`; la lista `APP_SHELL` mantiene paridad con los assets modificados/nuevos.
- QA renderizado cubre 390 × 844 y escritorio con datos sintéticos, consola sin errores/advertencias y versión servida verificada.
- Reviewer independiente, máximo 40 minutos, contrasta especificación, código, pruebas y pantalla real; sólo se corrigen hallazgos reproducibles Critical/Important.

## Evidencia y cierre

`VERIFIER.md` registra automatización, Browser/Playwright, revisión independiente y límites de evidencia. La comprobación en teléfono/PWA y con datos reales sigue siendo una aceptación separada de la usuaria. La oleada termina en un único commit local reversible y se detiene antes de `push`.
