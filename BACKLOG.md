# CFO Personal V7 - Backlog priorizado

## Ampliación aprobada — presupuesto y retiro de Auditoría guiada (04/10/2026)

Se retira el módulo de Auditoría guiada completo: entrada de Nuevo cierre, lista de cierres, importación CSV/XLSX de estados de cuenta, revisiones de coincidencias, pantallas, rutas y plantilla de estado de cuenta. Auditoría de registros, filtros, comparación por período, edición y acceso por cuenta desde Balances permanecen activos. Los auditClosures históricos se conservan compatibles con almacenamiento y respaldos; retirar la función no purga datos financieros.

Presupuesto base es una plantilla independiente en state.budgetTemplate, sin mes; no es la fila mensual sin subcategoría. Cargar base o copiar anterior completa sólo grupos faltantes, sin sobrescribir ni duplicar. La fila sin subcategoría conserva identidad e importe propios. Crear categorías dentro del editor las mantiene en borrador hasta guardarlas atómicamente con el plan; no se ofrece creación de subcategorías nuevas en esta interfaz.

Ampliación implementada localmente: versión 7.0.7/cache-51. Evidencia nueva del 04/10/2026: 46/46 archivos de pruebas pasan, sintaxis de 30 archivos JavaScript y diff limpios. Revisión GUI independiente a 390 × 844 y 999 × 914; informe en docs/verification/2026-10-04-planning-refinements.md. Offline independiente confirmado con servidor detenido y recarga. Veredicto final: entrega local aprobada sin hallazgos pendientes; últimos ajustes visuales revalidados. Teléfono, datos reales y publicación siguen separados.


## Prioridad aprobada — planeación mensual y provisiones (03/10/2026)

La importación asistida de la Oleada 4 histórica está incorporada en a2c92ec (25/08/2026). 79928f2 (30/08/2026) excluye las provisiones conceptuales del subtotal de Auditoría. La base actual usa cache-49. Publicación externa actual no verificada; referencias de caches/publicaciones anteriores son evidencia histórica.

El pedido de planeación mensual y provisiones está implementado y aprobado para entrega local en 7.0.6/cache-50. Diseño: docs/superpowers/specs/2026-10-03-planning-workspace-design.md; ejecución: docs/superpowers/plans/2026-10-03-planning-workspace.md; evidencia independiente: docs/verification/2026-10-03-planning-workspace.md. No se incluyen rediseño general, nube, PDF ni nuevas reglas presupuestarias por cuenta. Teléfono/PWA instalada, datos reales y publicación siguen pendientes por separado.

Estado: esta lista ordena el trabajo pendiente. Toda mejora funcional pasa por descubrimiento, diseño aprobado, implementación y verificación móvil.

## Oleada 4

La revisión asistida está incorporada en a2c92ec y 79928f2. Publicación actual no verificada y validación con datos reales pendiente. XLSX, PDF, OCR y transferencias importadas permanecen diferidos.

## Prioridad 0 — Fundamento antes de nueva funcionalidad

1. **Validación integral con datos reales respaldados.** La Oleada 3 corrigió con datos sintéticos la jerarquía de Planeación, filtros, targets, overlays, importes extremos, estados vacíos, acceso `Auditar saldo` y Ajustes. Falta recorrer Balances, Resumen, Categorías, Auditoría, Registro y Ajustes con el respaldo real; validar capacidad de pago, extraordinarios, ritmo presupuestario, edición y persistencia tras recargar.
2. **Validación con datos reales respaldados — períodos por contexto y comparación analítica.** La separación global/Auditoría, borradores confirmados, navegación por modo y comparación local en Auditoría/Categorías están implementadas y cubiertas por pruebas automatizadas. Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró el scope de Auditoría y la comparación, pero aún requiere captura duradera o validación móvil del usuario. El respaldo JSON fue confirmado el 2026-07-26; falta la validación no destructiva real.
3. **Validación con datos reales respaldados — densidad y ritmo móvil.** Validar selector, filtros de Auditoría/Categorías y calculadora de ingreso. Auditoría guiada está retirada del alcance operativo por decisión del 04/10/2026.
4. **Urgente — validación de Registro en dispositivo/PWA instalada.** La continuidad de escritura, selector buscable sin teclado automático, calculadora clásica y calendario propio están implementados y cubiertos por pruebas automatizadas y QA Browser a 390 × 844. Falta la validación en teléfono real sin crear ni modificar datos financieros.

## Prioridad 1 — Siguiente bloque funcional

7. **Marcado masivo de extraordinarios.** La Oleada 3 ya armonizó los defectos visuales confirmados de Balances y Auditoría. Permanece como función separada el marcado masivo, con confirmación y trazabilidad.
8. **Revisión asistida de importaciones masivas.** Cuando una cuenta, categoría, subcategoría o tipo de movimiento sea nuevo o dudoso, permitir corregir el texto manualmente o elegir una opción existente mediante un selector propio. Después de resolver una propuesta, ofrecer aplicar esa misma decisión a los pendientes equivalentes, indicando cantidad, efecto y confirmación explícita. Conservar siempre el valor importado original y la trazabilidad de la decisión; nunca sobrescribir en silencio.
9. **Cobertura de obligaciones y presupuesto planeado.**
10. **Clarificar `Comparar con período anterior`.** Revisar con la persona usuaria qué lectura aporta en Auditoría y Categorías, su microcopy y si debe conservarse; no cambiar la lógica hasta una decisión de producto explícita.
11. **Lectura de estados de cuenta — retirada del backlog activo.** Auditoría guiada y su lector CSV/XLSX se retiran. PDF/imágenes no quedan como continuación implícita; cualquier nueva conciliación requiere aprobación específica.
12. **Decisión sobre pagos programados.** Mantenerlos como avisos o retirarlos del Resumen.
13. **Provisiones reales (decisión de producto).** La implementación actual usa objetivos, fecha y liberación para provisiones conceptuales. Definir por separado si alguna vez existirá una provisión que represente dinero real, con contabilidad, migración y privacidad explícitas.

## Prioridad 2 — Mejoras posteriores

14. **Alertas PWA configurables.**
15. **Comparativos de períodos ampliados.** Sólo después de resolver el contrato de comparación actual.
16. **Exportación avanzada para Excel.**
17. **Regresiones UX con datos reales.** Botones sólo-icono, targets táctiles y tarjetas de transferencia con nombres largos.

## Último horizonte

18. **Temas y apariencias configurables.**
19. **Endurecimiento de seguridad y privacidad local.**
20. **Sincronización cloud real.** Requiere una decisión explícita de arquitectura, cifrado, recuperación y modelo de privacidad.

## Hallazgos generales diferidos por decisión de la persona usuaria

- Aceptación de recuperación integral con un respaldo real: los cierres de Auditoría, configuración de capacidad, período de Auditoría y tipos personalizados de cuenta ya se incluyen en el JSON y tienen pruebas automatizadas.
- Coherencia histórica completa de provisiones y capacidad; el pedido actual etiqueta los saldos conceptuales como vigentes.
- Sustituir curvas decorativas por datos; distinguir ausencia de datos de buena salud financiera.
- Explicar alcance del saldo proyectado sobre obligaciones e ingresos futuros.
- Escape de texto persistido/importado en Registro y separación gradual del controlador principal por flujo.
- Visibilidad del último respaldo y prueba de recuperación.
- Fecha real de corte y persistencia de eventos nuevos en respaldo/restauración resueltas en la entrega local de planeación.
