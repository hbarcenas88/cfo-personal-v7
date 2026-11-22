# Acuerdo de diseño CFO Style

Aprobado el 22/11/2026 después de las muestras Lithic, Notion y CFO Style. Este acuerdo describe la interfaz de CFO Personal y amplía [el sistema de diseño](../DESIGN_SYSTEM.md).

| Rol | Tratamiento |
|---|---|
| Lienzo y tarjetas | Gris claro `#F7F8FA`, tarjetas blancas, borde fino `#E0E4EA`, radio de 16 px y ritmo de 8/16/24 px. |
| Tinta y acciones | Negro `#171717`. Balance total y Disponible comparten una superficie negra con cifras blancas. Guardar, Nueva cuenta y Nuevo registro usan negro y blanco. |
| Navegación | Pestaña activa en gris perla `#EDEEF0` con icono y texto negros. Todas las pestañas mantienen la misma altura, de 60–64 px, con aire alrededor del conjunto icono y etiqueta. |
| Selección y cuentas | Azul `#2254A3` y apoyo claro `#EBF3FF`. Los selectores segmentados llenan la celda activa hasta el borde. |
| Estados financieros | Verde `#17654A` y rojo `#A33737` acompañados por el signo, valor o etiqueta correspondiente. Las acciones destructivas tienen un tratamiento propio visible. |

Inter con pesos 400/500/600/700, texto habitual de 15–16 px, títulos de 22–24 px y cifras tabulares. Phosphor Regular en controles y navegación. Iconos predominantes de 25 px en contenedores de 44 px en las listas de Registro, Configuración y Planeación. El botón central usa un signo blanco de 20 px y trazo de 3 px. La navegación prescinde de la raya naranja.

Reserva acumulada y Saldo proyectado se enfatizan con tipografía, aire y bordes finos sobre blanco. El detalle de provisión muestra Planeación mensual y Meta en dos columnas equivalentes. Categorías deja 12 px entre título y filtros, y entre la fila de importe y la barra de consumo. Los controles segmentados tienen al menos 44 px de altura táctil.

El acuerdo cubre todas las superficies y estados: Balances, Resumen, Categorías, Auditoría, Registro, cuentas, Planeación, provisiones, presupuestos, ajustes, onboarding, menús, selectores, teclado, paneles y Gestión de datos. En importación se aplica el mismo sistema al selector de tipos, selección de CSV, revisión, resolución, confirmación y errores. Se comprueban también plantillas, exportación, respaldo y restauración.

La aplicación conserva sus reglas, campos, datos locales, formatos de fecha y funcionamiento offline. Las próximas mejoras funcionales pueden probarse en una vista previa interactiva antes del despliegue.
