# CFO Personal V7 - Backlog priorizado

Estado: esta lista ordena el trabajo pendiente; no autoriza por sí sola cambios de comportamiento, publicación ni merge. Toda mejora funcional pasa por descubrimiento, diseño aprobado, implementación y verificación móvil.

## Prioridad 0 — Fundamento antes de nueva funcionalidad

1. **Validación integral con datos reales respaldados.** Recorrer Balances, Resumen, Categorías, Auditoría, Registro y Ajustes; validar capacidad de pago, extraordinarios, ritmo presupuestario, edición y persistencia tras recargar.
2. **Validación con datos reales respaldados — períodos por contexto y comparación analítica.** La separación global/Auditoría, borradores confirmados, navegación por modo y comparación local en Auditoría/Categorías están implementadas y cubiertas por pruebas automatizadas. Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró el scope de Auditoría y la comparación, pero aún requiere captura duradera o validación móvil del usuario. El respaldo JSON fue confirmado el 2026-07-26; falta la validación no destructiva real y no autoriza publicación ni merge.
3. **Validación con datos reales respaldados — densidad, ritmo móvil y auditoría guiada.** Las correcciones de selector, filtros de Auditoría/Categorías y calculadora de ingreso, así como la primera versión local de auditoría guiada, están implementadas y cubiertas por pruebas automatizadas. Falta revisión visual duradera a 390 × 844 y validación no destructiva de un cierre real con el respaldo JSON ya confirmado. No adelanta el rediseño integral de Etapa 2 y 3 ni autoriza publicación ni merge.
4. **Urgente — validación móvil de Registro.** La continuidad de escritura, selector buscable sin teclado automático y calculadora clásica compartida están implementados y cubiertos por pruebas automatizadas. Falta QA renderizado a 390 × 844 y validación en dispositivo real sin crear ni modificar datos financieros; Browser no pudo adquirir un navegador local durante la comprobación del 2026-07-27. No autoriza publicación ni merge.

## Prioridad 1 — Siguiente bloque funcional

7. **Etapa 2: Balances y Auditoría.** Armonizar jerarquía, superficies, iconografía, saldo disponible, provisiones y mensajes de salud; añadir marcado masivo de extraordinarios con confirmación y trazabilidad.
8. **Revisión asistida de importaciones masivas.** Cuando una cuenta, categoría, subcategoría o tipo de movimiento sea nuevo o dudoso, permitir corregir el texto manualmente o elegir una opción existente mediante un selector propio. Después de resolver una propuesta, ofrecer aplicar esa misma decisión a los pendientes equivalentes, indicando cantidad, efecto y confirmación explícita. Conservar siempre el valor importado original y la trazabilidad de la decisión; nunca sobrescribir en silencio.
9. **Cobertura de obligaciones y presupuesto planeado.**
10. **Auditoría contra estados de cuenta PDF.** Conversión o extracción asistida posterior; la primera versión de auditoría guiada ya recibe CSV/XLSX y la conciliación flexible incluye cierres mensuales, quincenales o por cualquier rango declarado. PDF e imágenes quedan fuera de esta primera versión.
11. **Decisión sobre pagos programados.** Mantenerlos como avisos o retirarlos del Resumen.
12. **Provisiones con objetivo y liberación opcionales.** Por cada provisión, permitir activar meta monetaria, fecha de liberación o ambas, sin alterar por defecto su naturaleza conceptual ni la capacidad de pago; requiere diseño de estados, indicadores y reglas de vencimiento.

## Prioridad 2 — Mejoras posteriores

12. **Alertas PWA configurables.**
13. **Comparativos de períodos ampliados.** Sólo después de definir correctamente el selector de período.
14. **Exportación avanzada para Excel.**
15. **Regresiones UX con datos reales.** Botones sólo-icono, targets táctiles y tarjetas de transferencia con nombres largos.

## Último horizonte

16. **Temas y apariencias configurables.**
17. **Endurecimiento de seguridad y privacidad local.**
18. **Sincronización cloud real.** Requiere una decisión explícita de arquitectura, cifrado, recuperación y modelo de privacidad.
