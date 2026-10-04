# CFO Personal V7 - Especificación de producto

## Importación asistida (Oleada 4)

La importación asistida de Movimientos y Presupuestos acepta exclusivamente CSV y presenta primero un borrador revisable. Las cuentas, categorías y subcategorías nuevas o ambiguas deben coincidir, resolverse, crearse o descartarse; nunca se guardan como texto libre. Sólo `Ingreso` y `Gasto` son movimientos importables: transferencias, provisiones, tipos desconocidos y filas inválidas quedan bloqueados hasta resolución o descarte. Las decisiones equivalentes indican su cantidad y requieren una acción explícita. La confirmación aplica un lote atómico con un deshacer inmediato único; cada fila conserva `importMeta` con el valor original, la decisión y el lote. Los lotes se respaldan en JSON mediante `importBatches`. XLSX, PDF, OCR, conexión bancaria y mapeo genérico de columnas permanecen fuera de alcance.

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

La búsqueda y los filtros tienen responsabilidades separadas: la X limpia sólo el texto y `Limpiar todos` limpia sólo Cuenta, Tipo, Categoría y Subcategoría. Los cuatro filtros admiten selección múltiple y conservan consulta, foco y desplazamiento interno al elegir más de una opción. Categorías aplica el mismo principio de actualización localizada: cambiar búsqueda, selección, segmento o expansión no debe devolver la página al inicio. Sus estados vacíos distinguen entre ausencia de datos y ausencia de coincidencias.

Balances ofrece en cada cuenta una acción visible `Auditar saldo`. Esta acción abre Auditoría con la cuenta correspondiente ya filtrada; no crea movimientos, ajustes ni una segunda ruta de cálculo.

### Períodos y comparación analítica

Balances, Resumen y Categorías comparten un período global confirmado por la persona usuaria. Su selector trabaja con un borrador hasta `Aplicar`; `Cancelar`, Escape o tocar fuera descartan ese borrador sin alterar el período confirmado ni los datos visibles. `Desde` y `Hasta` sólo aparecen al elegir `Personalizado`. La navegación anterior/siguiente preserva el modo elegido: mes, año o rango de igual duración.

Auditoría abre en Todo el historial y guarda un período independiente junto con sus filtros. Al entrar en esa pantalla, el control superior muestra y desplaza el período de Auditoría y añade `Sólo afecta Auditoría`; fuera de ella vuelve a representar el período global. `Usar período del dashboard` copia una instantánea al borrador de Auditoría como acción, no como una segunda selección, y nunca crea un vínculo con cambios posteriores del dashboard. Las opciones representables comunican el borrador con superficie/borde azul, check no textual y `aria-pressed`; no hay texto visible `Seleccionado` ni `Selección actual`. Si la pestaña abierta no puede representar el borrador, este permanece intacto y `Aplicar` queda deshabilitado con su estado accesible. Una opción visible o la copia puntual habilita `Aplicar`; un nuevo cambio de pestaña vuelve a evaluar el gate.

El selector global de Balances, Resumen y Categorías usa una superficie compacta de 640 px máximos (`vh` y `dvh`), un scroll interno y footer siempre visible. Auditoría conserva 760 px por sus controles adicionales. Los ocho años son 2 × 4 en móvil y 4 × 2 en escritorio, con tarjetas simétricas; la simetría general fuera de las superficies tocadas queda diferida.

Auditoría y Categorías pueden comparar un período acotado con el período anterior equivalente. Auditoría aplica simétricamente los filtros de texto, cuenta, tipo, categoría y subcategoría. Categorías respeta la selección de categorías y compara gasto ejecutado en las vistas Combinado y Solo gasto. La comparación sólo cambia lecturas analíticas; no modifica movimientos, presupuestos, balances, ingresos, gastos, transferencias ni trazabilidad. Si no existe base de comparación, la app indica `Sin base anterior` en lugar de presentar un porcentaje engañoso.

### Auditoría de registros y datos históricos de cierres

Auditoría guiada se retira del alcance operativo el 04/10/2026: no se crean/revisan/importan cierres ni se ofrece plantilla de estado de cuenta. Auditoría de registros conserva sus filtros por cuenta/tipo/categoría/subcategoría, edición, comparación y acceso por cuenta desde Balances. Los cierres auditClosures históricos siguen siendo datos compatibles en respaldo/restauración; no se borran por retirar interfaces.

### Planeación y provisiones administrables

Planeación concentra presupuestos, provisiones y recurrentes; Balances ofrece accesos directos al mismo gestor y detalle. Los presupuestos se consultan con un filtro propio por mes: la lista sólo muestra el período elegido y no usa `<select>` nativo. Una provisión puede guardar planeación mensual y, de forma opcional, monto objetivo y fecha de liberación. Esa fecha acepta únicamente `AAAA-MM-DD`; una fecha importada inválida se señala y se normaliza como vacía. Los CSV históricos que no contienen objetivo o fecha siguen siendo válidos. Las exportaciones de provisiones incluyen `monto_objetivo` y `fecha_liberacion`; el respaldo JSON conserva el catálogo y sus `provisionEvents` conceptuales.

La entrada de Planeación es un hub compacto con Presupuestos, Provisiones y Recurrentes; no apila los tres gestores. Cada tipo abre una subvista con una decisión para consultar lo planeado y otra para crear. El gestor conserva siempre una acción de creación visible. Presupuestos mantiene el filtro mensual; Provisiones separa `Activas`, `Liberadas` y `Todas`; Recurrentes separa `Vigentes` y `Completos` cuando existe ese estado. Esta navegación vive en estado de sesión y no modifica la persistencia ni las reglas financieras de los registros.

Liberar una provisión acepta importe parcial positivo hasta el saldo vigente; Liberar todo usa ese saldo. Reduce saldo y reserva acumulada por el importe, con evento de ID único, importe y fecha. La reserva acumulada de un período sólo descuenta liberaciones ocurridas en o antes de su fecha de corte; los eventos históricos sin fecha reconocible continúan descontándose para no reactivar reservas legacy. Borrar el catálogo después de liberar conserva el evento y tampoco reactiva la reserva. La liberación reduce el importe reservado y libera capacidad utilizable según la configuración vigente, pero no toca cuentas, movimientos, ingresos, gastos, presupuestos, transferencias ni auditoría bancaria. Una futura provisión real continúa fuera de alcance y requiere una decisión de producto separada.

### Jerarquía de Ajustes

Ajustes separa acciones normales, avanzadas y destructivas. Las capacidades futuras permanecen deshabilitadas y no aparentan ser navegables. `Borrar todos los datos` conserva tratamiento de peligro y confirmación explícita; una revisión visual nunca autoriza ejecutar esa acción.

### Proteger los datos

La app explica que los datos viven en el navegador y facilita exportar un respaldo JSON antes de acciones de riesgo o cambios de dispositivo. El respaldo incluye el historial conceptual de liberaciones, pero nunca debe añadirse al repositorio junto con datos personales o financieros reales.

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

## Planeación mensual y provisiones — contrato aprobado 03/10/2026

- Aplicar planeación asigna reserva existente una vez por ID de provisión y mes calendario actual, visible e independiente del período histórico del dashboard. Requiere importe positivo y reserva sin asignar suficiente. Reserva $150/asignado $50 + planeación $50 resulta reserva $150/asignado $100/sin asignar $50. No aumenta reserva total ni crea movimientos.
- El evento conserva ID único, provisión, nombre, mes, importe y fecha. Respaldo/restauración conserva el bloqueo mensual; cambiar planeación no lo reabre. Deshacer revierte evento y saldo conjuntamente.
- Liberación parcial: importe positivo hasta saldo vigente, validado en centavos. Reduce saldo y reserva acumulada exactamente por ese importe; varias liberaciones del mismo día tienen IDs diferentes. Auditoría bancaria permanece neutral; asignaciones sólo aparecen en historial de provisión.
- Persistir estado candidato antes de sustituir estado activo. Un fallo de escritura conserva datos previos. Revalidar al guardar y bloquear dobles pulsaciones.
- Borrador presupuestario de un único mes: filas separadas mantienen ID, origen y trazabilidad aunque compartan nombres. Cabeceras suman filas; Sin subcategoría es una fila propia. Cuenta es referencia y no cambia comparación vigente de gastos.
- Copiar mes anterior completa grupos faltantes por categoría/subcategoría/cuenta, preserva multiplicidad y existentes. Nuevas copias reciben IDs nuevos, origen manual y ningún importMeta heredado. Repetir copia no duplica.
- Guardar plan hace una escritura atómica y una acción de deshacer. Conflictos con filas afectadas conservan borrador y exigen revisión. Edición puntual guarda sólo la fila elegida. Cero no elimina existentes: eliminación explícita; nuevos campos vacíos no crean filas.
- Navegar/copiar/editar no guarda hasta confirmación. Salir o cambiar de mes con cambios pendientes ofrece seguir editando o descartar.
- Fechas visibles DD/MM/AAAA, año de cuatro dígitos; períodos mensuales como Octubre 2026. Almacenamiento y formatos de intercambio conservan compatibilidad. Mostrar corte real del rango.

## Presupuesto — ampliación implementada 04/10/2026

Presupuesto base es una plantilla independiente persistida en state.budgetTemplate, sin mes. Guardar la plantilla no asigna presupuesto a un período ni altera movimientos; cargarla en un mes completa grupos faltantes y requiere guardar ese plan mensual. Copiar anterior conserva la misma regla de faltantes, multiplicidad e idempotencia.

La fila sin subcategoría de un presupuesto mensual conserva identidad e importe propios y no representa la plantilla base. El total de categoría suma filas y nunca se guarda como otra asignación.

Crear una categoría durante planeación la mantiene en draft.newCategories hasta guardar. Guardar valida y persiste plan y nuevas categorías conjuntamente antes de sustituir el estado activo. Cancelar, conflicto o fallo de almacenamiento no deja categorías huérfanas ni presupuestos parciales. No existe creación de subcategorías nuevas en esta interfaz. Cuentas siguen siendo referencia; identidad y trazabilidad de filas existentes se preservan.
