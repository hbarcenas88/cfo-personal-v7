# Oleada 2 — Planeación administrable: diseño

## Objetivo

Convertir Planeación en el único lugar para administrar presupuestos, provisiones conceptuales y recurrentes; hacer que cada presupuesto y provisión guardados sea localizable, editable o eliminable con consecuencias claras.

## Decisiones de producto aprobadas

- Las provisiones permanecen exclusivamente conceptuales. No se agrega un selector `real/conceptual`, no se mueve dinero entre cuentas y no se modifica ningún saldo bancario.
- Liberar una provisión con saldo `X` deja su saldo en `0`, reduce la reserva conceptual acumulada en `X` y deja de restarla de la capacidad de pago y la liquidez utilizable.
- La liberación conserva trazabilidad mediante un evento conceptual ligado a la provisión: fecha, importe liberado y saldo resultante. El evento no afecta cuenta, ingreso, gasto, presupuesto ni auditoría bancaria.
- Una provisión sólo se puede eliminar cuando su saldo es `0`; con saldo pendiente, la interfaz explica que primero debe liberarse o ajustarse.
- La edición manual de una provisión es un ajuste conceptual explícito. Cambia sus indicadores de planeación/capacidad, no las cuentas, y se puede deshacer.
- Los presupuestos no afectan saldos de cuenta ni movimientos reales. Editarlos o eliminarlos cambia exclusivamente sus lecturas analíticas del período.
- Provisiones deja de aparecer como menú externo. Balances conserva el acceso contextual `Administrar`, que abre Planeación en su sección Provisiones.
- Una futura variante de provisión real queda fuera de esta oleada y no introduce campos ni interfaz sin uso presente.

## Experiencia

`Ajustes → Planeación` muestra tres secciones compactas: Presupuestos, Provisiones y Recurrentes. Cada sección presenta su resumen, lista administrable y acción de creación. No hay rutas paralelas de Provisiones en Catálogos ni en el drawer.

Cada provisión muestra saldo conceptual, planeación mensual y las metas opcionales que existan: monto objetivo y fecha de liberación. Sus estados son `Sin meta`, `En planeación`, `Lista para liberar`, `Vencida` y `Liberada`; los estados son informativos y no cambian dinero. Abrir una provisión ofrece Editar, Liberar y Eliminar cuando corresponde. La confirmación de liberación nombra el importe y comunica: `No modifica ninguna cuenta`.

El gestor de presupuestos permite filtrar por período, editar o eliminar un presupuesto guardado y muestra el impacto analítico que se modificará antes de confirmar.

## Arquitectura y consistencia

La fuente de verdad de una provisión administrada es su catálogo: `balance`, `monthlyAmount`, `targetAmount`, `releaseDate` y fechas de creación/actualización. La historia conceptual se conserva aparte en `provisionEvents`, incluso si se elimina una provisión ya liberada. Cada evento de liberación contiene `provisionId`, `kind: 'release'`, `amount`, `date` y no se serializa como un movimiento bancario.

Un servicio puro de planeación normaliza provisiones históricas y calcula: saldo agregado administrado, estados, liberaciones acumuladas y el delta de una liberación. Los movimientos de Registro de tipo Provisión existentes continúan siendo conceptuales, no se reinterpretan ni se vinculan retrospectivamente. La reserva acumulada de Balances conserva esos movimientos, pero descuenta las liberaciones conceptuales registradas y nunca baja de cero. Capacidad continúa leyendo los saldos positivos actuales de las provisiones seleccionadas. Así, liberar una provisión sincroniza ambas lecturas sin convertirla en una salida o entrada bancaria. Eliminar una provisión liberada no borra ni reactiva su evento histórico.

## Seguridad de datos y compatibilidad

Las provisiones existentes reciben valores por defecto para los nuevos campos, sin migración destructiva. La liberación y los cambios usan la infraestructura actual de mutación con deshacer y persistencia local. Exportación/respaldo conserva los campos nuevos; las importaciones existentes siguen siendo válidas y se normalizan.

## Validación

- Pruebas puras: normalización, estados, reserva agregada, liberación, edición y validaciones de eliminación.
- Pruebas de estado: la liberación no modifica cuentas, transacciones, presupuesto, ingresos ni gastos; sí deja la provisión en cero y libera capacidad.
- Pruebas de interfaz: Planeación contiene los tres gestores, no quedan rutas duplicadas y Balances abre Provisiones.
- Browser a 390 × 844: creación/edición/liberación de provisión y edición/eliminación de presupuesto, sin overflow, foco perdido ni errores de consola.
- Revisión independiente timeboxed (máximo 40 minutos) contra este diseño, el plan y los criterios de aceptación.
