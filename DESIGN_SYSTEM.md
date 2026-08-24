# CFO Personal V7 - Sistema de diseño

Estado: referencia canónica de experiencia e interfaz para V7. Actualizar cuando se introduzca un patrón reutilizable, un token visual o una regla de interacción.

## Principios de experiencia

- Mobile-first: la referencia mínima de revisión es 390 × 844.
- Claridad antes que decoración: jerarquía, importe y estado financiero deben leerse de inmediato.
- Calma y confianza: superficies claras, azul como acción principal y colores semánticos consistentes.
- Densidad útil: información financiera rica sin controles apretados ni tarjetas desproporcionadas.
- Una interacción, una consecuencia: las acciones de riesgo se explican y las relaciones financieras se muestran.

## Fundamentos visuales

Los tokens definidos en `styles/base.css` son la fuente de verdad. No introducir colores, sombras, radios o tamaños arbitrarios cuando ya exista un token.

- Tipografía: `Manrope, Inter, system-ui`; texto oscuro sobre superficies claras.
- Color: azul para acciones y enlaces; verde para resultado positivo; rojo para salida o riesgo; ámbar para advertencia; morado sólo como acento secundario.
- Espaciado: usar la escala `--space-*`.
- Forma: tarjetas y controles redondeados usando `--radius-*`; las píldoras sólo para chips y estados compactos.
- Controles: los tamaños estándar son `--control-sm`, `--control-md` y `--control-lg`. Los objetivos táctiles primarios no deben ser menores a 44 px.
- Iconos funcionales: el SVG estándar mide 20 px y vive dentro de un target de al menos 44 × 44 px. Los iconos finales usan una columna estable; nunca heredan el tamaño del contenedor ni alteran la simetría de la fila.

## Layout y navegación

- La app mantiene topbar, contenido desplazable y navegación inferior persistente.
- La acción principal de registro se expresa con el botón central destacado; no competir con múltiples llamadas principales.
- Las acciones secundarias y formularios complejos se abren en sheets inferiores. Deben incluir título, cierre claro y zona de desplazamiento suficiente.
- Respetar safe areas, el alto de navegación y evitar overflow horizontal.

## Componentes y patrones

### Tarjetas y filas

Las tarjetas agrupan información relacionada. Una fila de movimiento debe priorizar icono semántico, descripción, contexto, cuenta, fecha e importe. Los vínculos de transferencia deben ser legibles incluso con nombres largos.

### Botones e iconos

Usar el componente o clase existente antes de crear una variante. Los botones sólo-icono requieren etiqueta accesible y un área táctil completa. El color no puede ser la única señal de significado.

Acciones equivalentes comparten altura, radio, separación y jerarquía. Los importes financieros largos deben envolver o redistribuirse dentro de su tarjeta; no se admite ocultarlos con elipsis, recortarlos ni reducir el target táctil. Los estados como `Completo` combinan texto, semántica presionada e icono/check.

### Formularios, keypad y pickers

Los flujos móviles usan campos propios, keypad y pickers/sheets. No usar `<select>` nativos. Etiquetas, valor actual, estado requerido y error deben permanecer visibles o claramente asociados.

La edición de texto no re-renderiza el formulario completo: conserva cursor y teclado. Todas las calculadoras reutilizan la cuadrícula clásica de cuatro columnas; el keypad de Registro actualiza de inmediato monto, error y estado de `back` dentro de su propio formulario. `back` borra y el guardado validado sigue siendo la única confirmación financiera. Los selectores muestran primero la lista y sólo enfocan `Buscar o escribir` por intención explícita.

El calendario abierto desde la fecha de Registro ordena cuadrícula, navegación mensual, atajos `Hoy`/`Ayer`/`Inicio de mes` y `Listo`, para dejar los controles principales al alcance del pulgar. El día elegido combina superficie circular azul, ring y peso tipográfico con `aria-pressed`; cada día tiene un nombre accesible de fecha completa y sólo hoy usa `aria-current="date"`. No muestra tarjeta de fecha elegida ni atajo `Personalizado`. Esta composición es exclusiva de Registro: los calendarios de `Desde` y `Hasta` conservan su orden y semántica.

### Filtros y selectores

Los filtros de auditoría usan dropdowns propios, compactos y anclados a su disparador. Admiten chips activos, selección múltiple y búsqueda cuando la lista es larga. Sólo puede haber un dropdown abierto; se cierra con el mismo disparador, Escape, toque fuera, cerrar o “Listo”.

La X de búsqueda aparece sólo cuando hay texto y no modifica filtros. La acción `Limpiar todos` aparece sólo cuando existen filtros activos y no modifica la consulta. En Categorías, `Limpiar filtros` aparece únicamente cuando hay búsqueda o selección. Los pares de filtros y los segmentados usan geometría simétrica, nombre accesible y estado que no depende sólo del color. Las actualizaciones de resultados son localizadas: conservan el nodo de búsqueda o dropdown, el foco y el desplazamiento relevante.

Todo texto persistido o importado se escapa en la frontera de render. Un color guardado sólo puede interpolarse después de validarse contra los formatos aceptados; cualquier valor inválido usa un fallback seguro.

### Períodos y comparación por contexto

El selector global sirve a Balances, Resumen y Categorías; Auditoría usa un período propio y persistente. La pastilla superior representa el alcance de la pantalla activa: en Auditoría muestra su período y el microcopy `Sólo afecta Auditoría`; en las demás vistas muestra el global. Abrir el selector crea un borrador: presets, calendario y campos no cambian la pantalla hasta `Aplicar`; `Cancelar`, Escape, cerrar y tocar fuera lo descartan. Las flechas desplazan únicamente el alcance visible y preservan el modo activo: mes, año o rango de igual duración desplazado completo.

Cada opción visible que representa el borrador combina superficie y borde azul, `aria-pressed="true"` y un check discreto sin texto con `aria-hidden="true"`; no se muestra texto visible `Seleccionado` ni `Selección actual`. Las opciones no activas no simulan confirmación. `Usar período del dashboard` es una acción de copia puntual y nunca una segunda opción presionada ni un vínculo vivo. Si la pestaña abierta no contiene una opción equivalente al borrador, este no se muta ni recibe un resumen alternativo: `Aplicar` queda deshabilitado y con estado accesible no disponible. Elegir una opción visible o usar la copia puntual habilita `Aplicar`; cada cambio posterior de pestaña vuelve a evaluar esa regla. `Desde` y `Hasta` sólo se renderizan para `Personalizado`.

En móvil, los ocho años se distribuyen en una cuadrícula simétrica de 2 × 4, con tarjetas de al menos 52 px; en escritorio pasan a 4 × 2. Las superficies tocadas mantienen radios, alturas, anchos y gaps simétricos, incluidos navegación mensual, atajos y footer. Balances, Resumen y Categorías usan un sheet global de `min(640px, calc(100vh - 24px))` con su variante `dvh` posterior, un único scroll interno y footer visible. Auditoría conserva 760 px por su contenido adicional; la auditoría integral de simetría del resto de la app se difiere a la Oleada 3.

La comparación es una lectura analítica, nunca una mutación financiera. Sólo aparece dentro del selector mientras la pantalla activa es Auditoría o Categorías y compara automáticamente con el período anterior equivalente. `Usar período del dashboard` hace una copia puntual en el borrador de Auditoría, no una sincronización viva; Categorías conserva el período global y no expone la comparación desde Balances ni Resumen.

### Auditoría guiada de cierre

El cierre guiado vive dentro de Auditoría y se expresa como un recorrido móvil: cuenta y rango, saldo real, importación, revisión y resultado. La cabecera de revisión mantiene visibles cuenta, fecha de corte, saldo registrado, saldo real y delta. La prioridad visual es la bandeja de diferencias: `Solo en la app`, `Solo en el banco` y `Advertencia de fecha`; las coincidencias confirmadas no compiten con esos pendientes.

Cada diferencia usa texto, icono y color semántico; rojo para solo en la app, azul para solo en el banco y ámbar para advertencias. Confirmar, descartar o dejar pendiente son acciones explícitas y accesibles. La importación, asignación de columnas y eliminación de un cierre usan sheets y controles propios, con resumen de datos antes de confirmar; nunca `<select>` nativos. El estado `Delta detectado: revisar` comunica una tarea pendiente, no un error financiero ni una invitación a crear ajustes.

En Ajustes → Descargar templates, `Auditoría — estado de cuenta` es una fila propia, no anidada en la importación del cierre. La descarga y el botón `?` de ayuda son hermanos; el botón de ayuda conserva un target mínimo de 44 px y expande una nota asociada sin solapar la fila ni desplazar los controles fuera del viewport.

### Planeación administrable

Planeación reúne Presupuestos, Provisiones y Recurrentes; no debe conservar una ruta paralela de Provisiones. Presupuestos usa un filtro propio de períodos en píldoras desplazables, con target mínimo de 44 px, `aria-pressed` y sin `<select>` nativo; sólo las filas del período activo permanecen en la lista. Las filas de provisión priorizan saldo conceptual, planeación y estado compacto; objetivo y fecha sólo aparecen cuando existen, y cualquier texto persistido se escapa al renderizar. Editar, liberar y eliminar se expresan como acciones distinguibles y alcanzables. La confirmación de liberación nombra el importe y el saldo resultante en cero, e incluye siempre `No modifica ninguna cuenta`; al ser una decisión que altera datos conceptuales se resuelve en un sheet explícito, no con un toast.

La pantalla inicial muestra sólo un hub compacto de tres destinos. Cada destino abre una subvista con `Ver lo planeado` y una acción de creación; el gestor correspondiente aparece únicamente después de elegir consultar. Volver retrocede un nivel, mantiene targets de 44 px y devuelve el foco al control exacto sin desplazar la página. Presupuestos, Provisiones y Recurrentes conservan sus filtros semánticos propios; no se inventa un filtro mensual común.

### Overlays, foco y render localizado

Sheets y dropdowns afectados comparten cierre visible, Escape y toque exterior. Al abrir, el foco entra en el título o control designado; al cerrar, vuelve al disparador semántico exacto, incluso cuando el render sustituyó el nodo o existe una sheet hija. El descriptor debe ser único y fallar cerrado ante identidades vacías o ambiguas.

La restauración de foco y scroll pertenece a la identidad del mismo overlay. Nunca se transfiere entre superficies distintas. Cambiar una selección, expansión o filtro actualiza sólo la región necesaria y usa `preventScroll` cuando devuelve foco; un refresh de información no justifica reconstruir toda la pantalla ni mandar a la persona al inicio.

### Jerarquía de Ajustes

Las acciones normales, avanzadas y destructivas viven en grupos visuales distintos. Las funciones futuras se muestran deshabilitadas, con `disabled` y `aria-disabled`, sin chevrón ni apariencia de navegación disponible. Las acciones destructivas usan la variante de peligro y una confirmación inequívoca; no comparten tratamiento con una acción primaria azul.

### Feedback

Usar toast para confirmaciones breves no bloqueantes. Usar un sheet o confirmación explícita para borrar, restaurar, reiniciar o realizar una acción que pueda alterar datos.

## Estados de interfaz

- Vacío: explica qué falta y ofrece una siguiente acción concreta. Una visualización sin datos usa una presentación neutral —por ejemplo, un donut sin gradiente— y no inventa proporciones. Un filtro sin coincidencias se distingue de una colección realmente vacía y ofrece limpiar sólo cuando corresponde.
- Carga: preservar el contexto; no mostrar una pantalla aparentemente rota.
- Error: explicar el problema en lenguaje claro y cómo recuperarse, sin exponer detalles técnicos o datos sensibles.
- Deshabilitado: indicar qué condición falta cuando sea necesario para avanzar.

## Accesibilidad y calidad

- Usar texto, icono o estructura además del color para comunicar estados.
- Mantener contraste, foco visible, etiquetas `aria-label` en iconos y orden de lectura coherente.
- Probar la experiencia en móvil, incluido teclado, Escape y toque fuera de overlays.
- Ninguna pantalla nueva debe introducir scroll horizontal, superposición con la navegación inferior ni controles demasiado pequeños.

## Relación con otros documentos

- `PRODUCT_SPEC.md` define el comportamiento y las reglas de producto; este documento define su expresión en interfaz.
- `ui-kit.html` funciona como muestra visual, no como fuente de reglas.
- `VERIFIER.md` registra la evidencia de revisión antes de publicar.

## Dirección visual aprobada: Resumen y Categorías

La armonización se hace por flujos, no por pantallas aisladas. Resumen y Categorías son el patrón de referencia inicial; Balances y Auditoría lo adoptan en la siguiente etapa; registro, menú, planeación y ajustes cierran el programa. No se debe copiar un layout de forma literal: se reutilizan sus principios de lectura, densidad y superficie.

- El selector de período usa el icono de calendario junto al período activo; el icono comunica que es un control editable, no un título estático.
- La navegación de Resumen usa el icono de tendencia, no barras verticales.
- Los iconos funcionales viven en superficies suaves; el color semántico apoya el significado sin sustituir texto.
- Cada tarjeta responde una pregunta: estado global, presupuesto, análisis operativo o ritmo. No reunir indicadores no relacionados sólo para llenar espacio.
- En móvil, una tarjeta muestra hasta tres métricas hermanas en fila o cuatro en cuadrícula 2×2. Si un importe no cabe, se debe ajustar el patrón, no permitir overflow ni reducir el target táctil.

### Resumen de decisión

- **Capacidad de pago:** tarjeta principal con saldo proyectado y acceso a `Ver cálculo`. La explicación detallada pertenece a un sheet, no se expande por defecto dentro del dashboard.
- **Salud presupuestaria:** Plan, Ejecutado, Por ejecutar y Desviación del plan. La desviación combina gasto sin presupuesto y exceso sobre categorías presupuestadas.
- **Gasto operativo por categoría:** máximo cinco filas ordenadas por gasto. Cada fila usa marcador de color, nombre y monto en la primera línea; una barra fina y su porcentaje secundario en la segunda. El largo de la barra y el porcentaje representan la misma participación sobre el total operativo incluido. No usar texto dentro de la barra ni una nube de chips debajo de la gráfica. Sus filtros se concentran en el sheet `Análisis`.
- **Ritmo presupuestario:** línea acumulada día a día contra una guía lineal del presupuesto. Debe usar datos operativos y explicar de forma visible la guía. Si `Análisis` excluye una categoría, excluye tanto su gasto como su presupuesto de la guía para comparar el mismo universo.
- **Categorías:** conserva presupuesto, gasto y detalle por categoría; no duplica el bloque financiero global de Resumen.

### Selectores, filtros y overlays

- Los dropdowns propios se anclan al contenedor visible del grupo de filtros, no a un chip angosto. Su borde izquierdo y derecho deben permanecer dentro del viewport a 390 px.
- La búsqueda y su acción de limpieza forman una misma fila: alturas coherentes, botón de limpieza de 44 px y sin competir visualmente con el campo.
- Un dropdown abierto puede cubrir contenido posterior, pero nunca quedar recortado, iniciar fuera de pantalla ni ocultar su título, opciones o acción `Listo`.
- Todo sheet o dropdown debe cerrarse con control visible, Escape, toque fuera y, cuando hay selección múltiple, `Listo`.
- A 390 px, el sheet de período se ordena verticalmente: accesos rápidos, fechas sólo para `Personalizado`, comparación contextual y pie fijo con `Cancelar`/`Aplicar`. Su superficie exterior no cambia de altura al alternar rango/año y sólo el contenido central puede desplazarse. No usar una pestaña de comparación meramente informativa.
- Auditoría prioriza búsqueda a ancho completo, resumen de filtros activos y cuatro disparadores simétricos en dos columnas; los selectores propios se abren sin desplazar ni recortar el contenido.
- Mientras `Comparar` está activo en Categorías, cada tarjeta puede añadir una línea secundaria de variación de gasto; con la opción apagada conserva su densidad normal. La comparación no se expresa en la vista `Solo presupuesto`.
- En Registro, la fecha se edita desde su campo de formulario. La calculadora no duplica el affordance de calendario y el monto mantiene la jerarquía principal.

### Matriz de adopción

| Flujo | Patrón vigente | Próxima acción |
| --- | --- | --- |
| Resumen | Tarjetas de decisión, gráficos operativos, análisis en sheet | Validar con datos reales y densidad mensual |
| Categorías | Detalle por categoría sin bloque global | Revisar filtros y lógica de presupuesto por categoría |
| Auditoría | Búsqueda y cuatro filtros localizados; tarjetas con acciones táctiles de 44 px | Marcas masivas de extraordinarios en etapa posterior |
| Balances | Jerarquía V7, provisión vacía neutral, importes extremos contenidos y `Auditar saldo` visible | Validar densidad con datos reales respaldados |
| Registro y ajustes | Keypad estable, sheets compartidos y Ajustes agrupados por normal/avanzado/peligro | Validar en dispositivo/PWA instalado |
