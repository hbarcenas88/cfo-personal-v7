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

### Formularios, keypad y pickers

Los flujos móviles usan campos propios, keypad y pickers/sheets. No usar `<select>` nativos. Etiquetas, valor actual, estado requerido y error deben permanecer visibles o claramente asociados.

### Filtros y selectores

Los filtros de auditoría usan dropdowns propios, compactos y anclados a su disparador. Admiten chips activos, selección múltiple y búsqueda cuando la lista es larga. Sólo puede haber un dropdown abierto; se cierra con el mismo disparador, Escape, toque fuera, cerrar o “Listo”.

### Períodos y comparación por contexto

El selector global sirve a Balances, Resumen y Categorías; Auditoría usa un período propio y persistente. Abrir un selector crea un borrador: presets, calendario y campos no cambian la pantalla hasta `Aplicar`; `Cancelar`, Escape, cerrar y tocar fuera lo descartan. Las flechas preservan el modo activo: mes, año o rango de igual duración desplazado completo.

La comparación es una lectura analítica, nunca una mutación financiera. Sólo aparece dentro del selector mientras la pantalla activa es Auditoría o Categorías y compara automáticamente con el período anterior equivalente. Auditoría muestra un sello de contexto cuando difiere del dashboard; Categorías conserva el período global y no expone la comparación desde Balances ni Resumen.

### Feedback

Usar toast para confirmaciones breves no bloqueantes. Usar un sheet o confirmación explícita para borrar, restaurar, reiniciar o realizar una acción que pueda alterar datos.

## Estados de interfaz

- Vacío: explica qué falta y ofrece una siguiente acción concreta.
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
- A 390 px, el sheet de período se ordena verticalmente: accesos rápidos, Desde, Hasta, comparación contextual y pie fijo con `Cancelar`/`Aplicar`. No usar una pestaña de comparación meramente informativa.
- Auditoría prioriza búsqueda a ancho completo, resumen de filtros activos y un disparador compacto `Filtros`; los selectores propios se abren después sin desplazar ni recortar el contenido.
- Mientras `Comparar` está activo en Categorías, cada tarjeta puede añadir una línea secundaria de variación de gasto; con la opción apagada conserva su densidad normal. La comparación no se expresa en la vista `Solo presupuesto`.
- En Registro, la fecha se edita desde su campo de formulario. La calculadora no duplica el affordance de calendario y el monto mantiene la jerarquía principal.

### Matriz de adopción

| Flujo | Patrón vigente | Próxima acción |
| --- | --- | --- |
| Resumen | Tarjetas de decisión, gráficos operativos, análisis en sheet | Validar con datos reales y densidad mensual |
| Categorías | Detalle por categoría sin bloque global | Revisar filtros y lógica de presupuesto por categoría |
| Auditoría | Filtros anclados compactos y tarjetas de movimiento | Marcas masivas de extraordinarios en etapa 2 |
| Balances | Patrón V7 previo | Adoptar jerarquía y superficies de Resumen en etapa 2 |
| Registro y ajustes | Flujos V7 previos | Unificar sheets, formularios y estados en etapa 3 |
