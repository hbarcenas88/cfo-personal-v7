# Planeación mensual y provisiones — diseño aprobado

Estado: aprobado por la persona usuaria el 03/10/2026; implementación autorizada por oleadas y subagentes. Base: 79928f2. No constituye evidencia de implementación.

## Objetivo y experiencia

Reducir fricción de asignar/reservar, liberar parcialmente y planear presupuestos completos. Editor mensual en pantalla completa, categorías desplegables, referencia anterior, totales y guardado conjunto. Edición puntual de una fila disponible sin recorrer el editor. Balance abre gestor y detalle de provisión directamente. Sheets se reservan para asignación/liberación breve; detalle de provisión en pantalla completa.

Referencias visuales aprobadas: Actual Budget (https://actualbudget.org/docs/tour/budget/), YNAB (https://support.ynab.com/en_us/auto-assign-a-guide-r1gBNbBJo), Monarch (https://help.monarch.com/hc/en-us/articles/360048883631-Creating-Your-Budget-in-Monarch). Adaptar al sistema visual local, no copiar su modelo financiero.
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
## Integración y límites

Reutilizar keypad, calendario, selectores, gestor y sistema de overlays. No alterar transferencias vinculadas, ingresos, gastos, presupuesto por cuenta ni importaciones existentes. Evitar refactor amplio del controlador principal. Reserva insuficiente se resuelve mediante acceso al flujo existente Registrar reserva. Identificar saldos conceptuales como vigentes; reconstrucción histórica completa es otra iniciativa.

## Aceptación

Balances accesible sin menús intermedios; planeación corriente explícita; historial íntegro; provisional sin saldo sigue visible. Controles táctiles ≥44 px y cero select nativo. Formato visible 03/10/2026. Budget $200+$50=$250; ajuste puntual $50→$70 suma $20 únicamente. Guardado/cancelación/error/undo sin pérdida de identidad. Publicación, teléfono y datos reales se validan aparte.