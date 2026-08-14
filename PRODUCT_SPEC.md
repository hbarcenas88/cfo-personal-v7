# CFO Personal V7 - Especificación de producto

Estado: referencia canónica de producto para V7. Actualizar cuando cambie el alcance, una regla financiera o un flujo principal.

## Propósito

CFO Personal ayuda a una persona a registrar, entender y auditar sus finanzas personales desde una PWA móvil. Debe privilegiar claridad financiera, trazabilidad y control local por encima de la cantidad de funciones.

## Usuario y resultado esperado

La persona usuaria administra sus propias cuentas, categorías, gastos, ingresos, presupuestos y provisiones. Al terminar una sesión debe poder responder, sin cálculos manuales: cuánto tiene, qué ocurrió en el periodo, qué compromisos existen y qué movimientos requieren revisión.

## Alcance V7

- Catálogos propios de cuentas, categorías y subcategorías.
- Registros de gasto, ingreso, provisión y transferencia.
- Presupuestos, provisiones y movimientos recurrentes.
- Resumen, balances, categorías, auditoría, búsqueda y salud de datos.
- Importación y exportación CSV; respaldo y restauración JSON.
- PWA instalable y utilizable sin conexión una vez cargada.

## Fuera de alcance

- Sincronización cloud, usuarios múltiples, enlace bancario o captura automática de estados de cuenta.
- Contabilidad fiscal, asesoría financiera, cálculos de impuestos o promesas de seguridad más allá del almacenamiento local del navegador.
- Datos de ejemplo, cuentas o movimientos creados automáticamente.

## Reglas financieras no negociables

- Cada instalación inicia vacía. La base local de V7 es independiente de versiones anteriores.
- Un gasto e ingreso afectan los indicadores que les correspondan según sus reglas de movimiento.
- Una provisión representa una reserva conceptual; no debe alterar el saldo bancario como si fuera una salida real.
- Una transferencia siempre es un par vinculado: una salida y un ingreso entre cuentas distintas, con el mismo vínculo. Afecta balances, pero no ingresos, gastos ni presupuesto.
- La edición de una transferencia actualiza el par completo. Las transferencias incompletas no se editan ni se duplican como un movimiento aislado.
- Editar preserva identidad, origen y fecha de creación del registro. La trazabilidad no se reemplaza por conveniencia visual.

## Flujos críticos

### Inicio y carga de datos

El onboarding ofrece crear datos base o importar información. La persona puede omitirlo y explorar una app vacía.

### Registrar un movimiento

La persona abre el flujo de registro, elige tipo, fecha, cuentas, monto y detalle relevante. La validación debe impedir guardar información incompleta o financieramente incoherente.

La escritura de notas y descripción conserva el borrador y el foco durante la entrada; la validación de campos requeridos ocurre al guardar. Los catálogos se abren como listas propias sin activar el teclado hasta que la persona elige `Buscar o escribir`; no se usan `<select>` nativos. Las calculadoras comparten una cuadrícula clásica de cuatro columnas, con borrado disponible y sin una confirmación que reemplace el guardado validado. En Registro, cada pulsación actualiza inmediatamente monto, error y estado de borrado dentro del formulario activo; abrir otro sheet no puede desviar ese feedback.

La fecha de Registro se edita en un calendario propio: cuadrícula, navegación mensual, `Hoy`/`Ayer`/`Inicio de mes` y `Listo`, en ese orden. El día seleccionado se identifica sin texto redundante mediante forma, ring, `aria-pressed` y nombre accesible de fecha completa. Esta variante no cambia los calendarios de período `Desde` y `Hasta`, y la fecha sólo se confirma con `Listo`.

### Auditar y editar

Auditoría permite buscar, combinar filtros y abrir acciones de un movimiento. La edición debe persistir al recargar y conservar las reglas de cada tipo de movimiento.

### Períodos y comparación analítica

Balances, Resumen y Categorías comparten un período global confirmado por la persona usuaria. Su selector trabaja con un borrador hasta `Aplicar`; `Cancelar`, Escape o tocar fuera descartan ese borrador sin alterar el período confirmado ni los datos visibles. `Desde` y `Hasta` sólo aparecen al elegir `Personalizado`. La navegación anterior/siguiente preserva el modo elegido: mes, año o rango de igual duración.

Auditoría abre en Todo el historial y guarda un período independiente junto con sus filtros. Al entrar en esa pantalla, el control superior muestra y desplaza el período de Auditoría y añade `Sólo afecta Auditoría`; fuera de ella vuelve a representar el período global. `Usar período del dashboard` copia una instantánea al borrador de Auditoría como acción, no como una segunda selección, y nunca crea un vínculo con cambios posteriores del dashboard. Las opciones representables comunican el borrador con superficie/borde azul, check no textual y `aria-pressed`; no hay texto visible `Seleccionado` ni `Selección actual`. Si la pestaña abierta no puede representar el borrador, este permanece intacto y `Aplicar` queda deshabilitado con su estado accesible. Una opción visible o la copia puntual habilita `Aplicar`; un nuevo cambio de pestaña vuelve a evaluar el gate.

El selector global de Balances, Resumen y Categorías usa una superficie compacta de 640 px máximos (`vh` y `dvh`), un scroll interno y footer siempre visible. Auditoría conserva 760 px por sus controles adicionales. Los ocho años son 2 × 4 en móvil y 4 × 2 en escritorio, con tarjetas simétricas; la simetría general fuera de las superficies tocadas queda diferida.

Auditoría y Categorías pueden comparar un período acotado con el período anterior equivalente. Auditoría aplica simétricamente los filtros de texto, cuenta, tipo, categoría y subcategoría. Categorías respeta la selección de categorías y compara gasto ejecutado en las vistas Combinado y Solo gasto. La comparación sólo cambia lecturas analíticas; no modifica movimientos, presupuestos, balances, ingresos, gastos, transferencias ni trazabilidad. Si no existe base de comparación, la app indica `Sin base anterior` en lugar de presentar un porcentaje engañoso.

### Auditoría guiada por cuenta y fecha

La auditoría guiada permite abrir un cierre flexible para una cuenta y una fecha de corte, no sólo para un mes. La persona indica el saldo real y el rango que cubre su estado de cuenta, importa un CSV/XLSX previamente preparado y confirma fecha, descripción y una de dos formas de importe: una columna firmada o columnas separadas de débito y crédito. La app normaliza débito como negativo y crédito como positivo, y conserva localmente filas normalizadas asociadas al cierre, no el archivo original.

En Ajustes → Descargar templates, `Auditoría — estado de cuenta` descarga localmente el CSV canónico con las tres columnas exactas `Fecha,Descripción,Monto`: fecha en `AAAA-MM-DD`, descripción útil del banco y monto numérico firmado (negativo para débito/gasto y positivo para crédito/ingreso). La descarga y su ayuda no importan archivos ni mutan movimientos, saldos, presupuesto o transferencias.

El análisis compara filas bancarias con movimientos de la cuenta. Una coincidencia sugerida combina importe, fecha y descripción parecida; el mismo importe con una diferencia de hasta ±2 días se muestra como advertencia. Si el importe coincide pero la fecha es más lejana o hay más de un candidato, se conserva como revisión humana, sin emparejamiento automático. La persona puede confirmar, descartar o dejar pendiente una pareja. Las validaciones pertenecen al cierre y pueden reabrirse; no alteran movimientos, balances, presupuesto, transferencias ni trazabilidad financiera. Un cierre termina como `Cuadrado` o `Delta detectado: revisar`.

La primera versión no lee PDF ni imágenes, no conserva archivos bancarios originales, no crea ajustes para cuadrar y no se conecta a bancos. Las importaciones inválidas, fuera del rango declarado o repetidas se explican antes de crear o duplicar evidencia.

### Proteger los datos

La app explica que los datos viven en el navegador y facilita exportar un respaldo JSON antes de acciones de riesgo o cambios de dispositivo.

## Privacidad y persistencia

Los datos financieros se guardan localmente en el navegador mediante IndexedDB y almacenamiento del origen. No se deben versionar CSV bancarios, respaldos reales, capturas privadas, secretos ni datos personales. Cambiar de navegador, limpiar los datos del sitio o cambiar de dispositivo requiere un respaldo/restauración explícita.

## Criterios de aceptación de producto

Un cambio está listo cuando:

- Respeta las reglas financieras anteriores y no crea movimientos huérfanos.
- Tiene un flujo entendible en móvil, sin depender de controles nativos incómodos.
- Explica o previene cualquier acción que pueda alterar datos.
- Conserva la capacidad de respaldo y restauración cuando toca persistencia.
- Se verifica con la evidencia indicada en `VERIFIER.md`.

## Lecturas financieras configurables

Estas lecturas ayudan a decidir y visualizar; no reemplazan los saldos de cuenta, la trazabilidad de movimientos ni las reglas de ingresos, gastos y transferencias.

- **Por ejecutar:** presupuesto total menos gasto realizado dentro del presupuesto de cada categoría. El gasto extraordinario también cuenta aquí, porque sigue siendo un gasto y no se debe ocultar del control presupuestario.
- **Desviación del plan:** suma de gasto sin presupuesto y exceso sobre el presupuesto de una categoría. No se resta nuevamente al calcular `Por ejecutar`, para no duplicar una obligación.
- **Liquidez utilizable:** suma de saldos de cuentas clasificadas como liquidez, menos los saldos conceptuales de provisiones seleccionadas.
- **Deuda neta:** parte negativa de los saldos de cuentas clasificadas explícitamente como deuda. Una cuenta de deuda con saldo positivo no crea liquidez.
- **Saldo proyectado:** `Liquidez utilizable − Por ejecutar − Deuda neta`. Es una lectura conservadora configurable para saber si el dinero alcanza al cerrar el período.

La configuración de capacidad es explícita y auditable: cada cuenta se clasifica como liquidez, deuda o excluida; cada provisión se incluye o excluye. Valores iniciales seguros: cuentas antes marcadas como disponibles pasan a liquidez, las provisiones existentes quedan seleccionadas y ninguna cuenta se infiere como deuda.

### Extraordinarios

Un movimiento de gasto puede marcarse manualmente como **extraordinario** durante su registro o edición. La marca sólo modifica las vistas analíticas operativas: gasto por categoría y ritmo presupuestario pueden excluirlo para no ocultar patrones cotidianos. El selector de categoría de ese análisis excluye la categoría tanto de su gasto como de la guía presupuestaria del ritmo; nunca modifica saldos, ingresos, gastos, presupuesto, transferencias, reglas financieras, exportación ni trazabilidad. Auditoría masiva de esta marca pertenece a una etapa posterior.

## Relación con otros documentos

- `DESIGN_SYSTEM.md` define cómo se presenta la experiencia.
- `V7_ROADMAP.md` y `BACKLOG.md` priorizan el trabajo futuro; no cambian por sí solos el alcance aprobado aquí.
- `AGENTS.md` define cómo trabajar técnicamente en el repositorio.
