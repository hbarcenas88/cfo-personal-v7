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

