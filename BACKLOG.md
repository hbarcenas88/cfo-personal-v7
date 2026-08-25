# CFO Personal V7 - Backlog priorizado

Estado: esta lista ordena el trabajo pendiente. Toda mejora funcional pasa por descubrimiento, diseño aprobado, implementación y verificación móvil.

## Oleada 4

La revisión asistida de importaciones masivas está implementada localmente y pendiente de cierre/publicación y validación con datos reales. XLSX, PDF, OCR y transferencias importadas permanecen diferidos.

## Prioridad 0 — Fundamento antes de nueva funcionalidad

1. **Validación integral con datos reales respaldados.** La Oleada 3 corrigió con datos sintéticos la jerarquía de Planeación, filtros, targets, overlays, importes extremos, estados vacíos, acceso `Auditar saldo` y Ajustes. Falta recorrer Balances, Resumen, Categorías, Auditoría, Registro y Ajustes con el respaldo real; validar capacidad de pago, extraordinarios, ritmo presupuestario, edición y persistencia tras recargar.
2. **Validación con datos reales respaldados — períodos por contexto y comparación analítica.** La separación global/Auditoría, borradores confirmados, navegación por modo y comparación local en Auditoría/Categorías están implementadas y cubiertas por pruebas automatizadas. Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró el scope de Auditoría y la comparación, pero aún requiere captura duradera o validación móvil del usuario. El respaldo JSON fue confirmado el 2026-07-26; falta la validación no destructiva real.
3. **Validación con datos reales respaldados — densidad, ritmo móvil y auditoría guiada.** Las correcciones de selector, filtros de Auditoría/Categorías y calculadora de ingreso, así como la primera versión local de auditoría guiada, están implementadas y cubiertas por pruebas automatizadas. La plantilla `Auditoría — estado de cuenta` se descarga localmente desde Ajustes y no muta finanzas. El template se observó en Browser a 390 × 844; siguen pendientes la evidencia de dispositivo/PWA y la validación no destructiva de un cierre real con el respaldo JSON ya confirmado.
4. **Urgente — validación de Registro en dispositivo/PWA instalada.** La continuidad de escritura, selector buscable sin teclado automático, calculadora clásica y calendario propio están implementados y cubiertos por pruebas automatizadas y QA Browser a 390 × 844. Falta la validación en teléfono real sin crear ni modificar datos financieros.

## Prioridad 1 — Siguiente bloque funcional

7. **Marcado masivo de extraordinarios.** La Oleada 3 ya armonizó los defectos visuales confirmados de Balances y Auditoría. Permanece como función separada el marcado masivo, con confirmación y trazabilidad.
8. **Revisión asistida de importaciones masivas.** Cuando una cuenta, categoría, subcategoría o tipo de movimiento sea nuevo o dudoso, permitir corregir el texto manualmente o elegir una opción existente mediante un selector propio. Después de resolver una propuesta, ofrecer aplicar esa misma decisión a los pendientes equivalentes, indicando cantidad, efecto y confirmación explícita. Conservar siempre el valor importado original y la trazabilidad de la decisión; nunca sobrescribir en silencio.
9. **Cobertura de obligaciones y presupuesto planeado.**
10. **Clarificar `Comparar con período anterior`.** Revisar con la persona usuaria qué lectura aporta en Auditoría y Categorías, su microcopy y si debe conservarse; no cambiar la lógica hasta una decisión de producto explícita.
11. **Auditoría contra estados de cuenta PDF.** Conversión o extracción asistida posterior; la primera versión de auditoría guiada ya recibe CSV/XLSX y la conciliación flexible incluye cierres mensuales, quincenales o por cualquier rango declarado. PDF e imágenes quedan fuera de esta primera versión.
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
