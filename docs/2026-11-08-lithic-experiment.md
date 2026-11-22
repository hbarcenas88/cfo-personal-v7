# Experimento Lithic y siguiente etapa de respaldo

## CFO Style · reglas para la implementación

- Usar fondos claros, tarjetas blancas y separadores finos. Reservar el negro con texto blanco para acciones principales, entre ellas Guardar plan, Nueva cuenta y Nuevo registro. Mantener el azul para estados de selección y enlaces. La pestaña activa se identifica con azul y peso tipográfico, sin línea naranja.
- Usar Inter y Phosphor Regular. En listas de navegación y registro, mantener el mismo contenedor de 44 px y un icono de aproximadamente 25 px. Los iconos de acciones conservan su etiqueta accesible.
- Dar a cada cifra su propia línea y separar etiqueta y valor. En el detalle de provisión, Planeación mensual y Meta ocupan dos columnas con espacio y un separador. La barra de consumo tiene 12 px de separación respecto a la fila superior, tanto con la categoría abierta como cerrada.
- Aplicar estas reglas a los componentes compartidos, incluidos menús, formularios, selectores, hojas y confirmaciones. Antes de publicar, verificar también las pantallas secundarias y sus estados. Para Importar datos, recorrer selección de CSV, validación, revisión y resolución, confirmación habilitada o bloqueada, resultado y errores. Incluir exportación, plantillas y restauración en el recorrido de Gestión de datos.

La muestra incluye una entrada y una revisión de importación con datos ficticios. Sirven para revisar el tratamiento visual. La verificación del flujo funcional y de sus estados corresponde a la implementación.

## Segunda comparación móvil solicitada

La persona usuaria pide conservar las pantallas y funciones existentes, evitar simplificar u omitir tarjetas, y comparar exclusivamente en formato celular. Añade DESIGN.md de referencia Notion y solicita una propuesta de iconos distinta por estilo. Se crea una galería aislada con 14 vistas por estilo, importando las plantillas actuales del repositorio y aplicando sólo CSS e iconografía sobre datos ficticios. También se ofrece la misma plantilla con estilo Actual como referencia.

Lithic utiliza Tabler Outline de Iconify. Notion utiliza Phosphor Regular: lienzo #f6f5f4, tarjetas blancas, radios12, bordes finos y sin sombras, azul #0075de para acciones. En ambas se mantienen las tarjetas e indicadores de Balances y Resumen, los campos de Registro y los gestores de planeación/datos. El bloque Reserva acumulada se dispone a ancho completo sobre Asignado/Sin asignar para impedir cortes del importe, conservando las tres cifras.

Artefacto: mobile-comparison en visualizaciones de esta sesión, separado de la app y de su almacenamiento. 28 vistas a 390 × 844, sin overflow horizontal de documento ni errores de consola observados. Son pantallas de muestra con controles financieros ilustrativos y sin persistencia. La aprobación del estilo y su implementación siguen pendientes. No se publican cambios de producto en esta etapa.

Estado: propuesta para evaluación visual, no autorización de rediseño en producción. La persona usuaria confirma el funcionamiento satisfactorio de la entrega anterior en el teléfono el 08/11/2026.

## Referencia aprendida

Referencia: archivo Lithic — Style Reference proporcionado en el chat. Predomina una superficie crema #f6f3ee, estructura negra, naranja #ff6600 para acciones, violeta #5c2999 y panel lavanda #f6f1fe como acento secundario, menta #ebfef6 de apoyo. Una familia grotesca, pesos 400/500 y tracking -0.02em; radios de 24 px y espaciado en múltiplos de 8.

Traducción a CFO: balance disponible como bloque oscuro compacto, cuentas como lista sobre crema, presupuesto por categorías desplegables, reservas en panel lavanda y tipografía numérica tabular. No se reproduce una landing de marketing: se conserva la navegación financiera y la prioridad móvil. Arcos de contorno discretos sólo como decoración de la superficie oscura.

Adaptaciones propuestas: Inter de Google Fonts como sustituto abierto de Monument Grotesk; texto oscuro sobre naranja para contraste; texto secundario #68635c en vez del #888888 de la referencia; verde financiero oscuro #17654a para ingresos. El verde brillante de marca no se usa como indicador financiero. Padding móvil de 20–24 px, frente a 40 px de escritorio; la tipografía de importes se reduce según pantalla. Estas adaptaciones se muestran en el mockup y no son cambios de reglas financieras.

Iconos: una familia Lucide mediante Better Icons/Iconify, almacenados localmente y sin ejecución de SVG externos. Se retiraron rellenos introducidos en las rutas para conservar iconografía de contorno consistente; no se agregaron scripts ni referencias remotas. Tipografía local, sin consultas externas al abrir el prototipo.

## Prototipo

Artefacto fuera del producto y del repositorio: carpeta lithic-mockup en visualizaciones de esta sesión. Datos totalmente ficticios; no lee IndexedDB, respaldos ni API financiera. Balances, presupuesto y Auditoría son la muestra principal; Resumen y sistema visual son vistas auxiliares simplificadas. Botones fuera del recorrido de muestra avisan que son ilustrativos. No constituye implementación funcional de la app.

Permite abrir/cerrar categorías, editar dos importes de muestra y volver a Balances. Evaluación esperada: cercanía al estilo deseado, legibilidad de cifras, peso del bloque negro, sensación de las tarjetas, uso del naranja y densidad móvil. La decisión siguiente pertenece a la persona usuaria: aceptar dirección, pedir ajustes o sustituir estilo.

Impeccable: guías leídas y aplicadas; su cargador no pudo instalar el motor por permisos, por lo que se utilizó el contexto existente de PRODUCT_SPEC.md y DESIGN_SYSTEM.md. Las reglas originales del producto permanecen como autoridad. UI/UX Pro Max se consultó como apoyo; la referencia del usuario gobierna la dirección estética.

## Orden de trabajo

1. Evaluar el prototipo; ajustar o cambiar de referencia.
2. Con aprobación, especificar tokens, tipografía, iconos y adaptación de cada pantalla y estado. Inventariar formularios, menús, selectores, teclado, vacíos, errores y accesibilidad.
3. Implementar en entorno aislado por oleadas: sistema visual y navegación; pantallas de consulta/planeación; Registro y componentes restantes. No alterar reglas financieras ni almacenamiento.
4. Verificar regresiones, tamaños móviles/escritorio, fechas y flujo offline. Publicar sólo la versión aprobada y comprobada; obtener aceptación del usuario en el teléfono.
5. Iniciar descubrimiento de respaldo automático: seleccionar proveedor, acceso privado, retención/versionado, restauración, estado del último respaldo y comportamiento offline. La sincronización entre dispositivos requiere una decisión específica de conflictos.
6. Implementar respaldo incrementalmente: autenticación y aislamiento por usuario; carga inicial verificada; guardados automáticos reintentables; historial recuperable; restauración con vista previa y prueba desde un entorno vacío. Conservar recuperación independiente ante borrado o corrupción propagados. No subir datos reales hasta que el flujo esté concreto y autorizado.

## Supabase: evaluación inicial, 08/11/2026

Supabase ofrece PostgreSQL, que encaja con relaciones entre cuentas, movimientos, presupuestos y eventos. Firestore ofrece un modelo documental diferente; la selección se hará por requisitos, no por una superioridad universal de una plataforma.

Free: 500 MB de base de datos y pausa tras una semana de inactividad. No incluye respaldos diarios automáticos del proveedor. Pro anuncia desde USD25/mes y respaldos diarios con retención de siete días. El guardado remoto de la app y las copias de seguridad del proveedor son capas distintas; se diseñarán versiones recuperables y recuperación probada antes de retirar la dependencia operativa del JSON manual. Límites, tamaño real y costes se revalidarán antes de implementación.

Fuentes oficiales consultadas: https://supabase.com/pricing ; https://supabase.com/kb/faqs/platform/free-plan-backups ; https://firebase.google.com/docs/firestore/data-model .
