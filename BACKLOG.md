# CFO Personal V7 - Backlog priorizado

Estado: esta lista ordena el trabajo pendiente; no autoriza por sí sola cambios de comportamiento. Toda mejora funcional pasa por descubrimiento, diseño aprobado, implementación y verificación móvil.

## Prioridad 0 — Fundamento antes de nueva funcionalidad

1. **Validación integral con datos reales respaldados.** Recorrer Balances, Resumen, Categorías, Auditoría, Registro y Ajustes; validar capacidad de pago, extraordinarios, ritmo presupuestario, edición y persistencia tras recargar.
2. **Períodos por contexto y comparación analítica.** Diseño aprobado: separar período global y Auditoría, confirmar borradores, preservar mes/año/rango en navegación y comparar sólo en Auditoría/Categorías. Pendiente de plan técnico, implementación y validación con datos reales respaldados.
3. **Densidad y ritmo móvil.** Diseño aprobado: corregir selector de período, filtros de Auditoría/Categorías y calculadora de ingreso; verificar tarjetas, espacios, jerarquía y targets con datos reales. No adelanta el rediseño integral de Etapa 2 y 3.

## Prioridad 1 — Siguiente bloque funcional

4. **Etapa 2: Balances y Auditoría.** Armonizar jerarquía, superficies, iconografía, saldo disponible, provisiones y mensajes de salud; añadir marcado masivo de extraordinarios con confirmación y trazabilidad.
5. **Revisión asistida de importaciones masivas.** Cuando una cuenta, categoría, subcategoría o tipo de movimiento sea nuevo o dudoso, permitir corregir el texto manualmente o elegir una opción existente mediante un selector propio. Después de resolver una propuesta, ofrecer aplicar esa misma decisión a los pendientes equivalentes, indicando cantidad, efecto y confirmación explícita. Conservar siempre el valor importado original y la trazabilidad de la decisión; nunca sobrescribir en silencio.
6. **Cobertura de obligaciones y presupuesto planeado.**
7. **Conciliación mensual guiada.**
8. **Auditoría contra estados de cuenta PDF.**
9. **Decisión sobre pagos programados.** Mantenerlos como avisos o retirarlos del Resumen.

## Prioridad 2 — Mejoras posteriores

10. **Alertas PWA configurables.**
11. **Comparativos de períodos ampliados.** Sólo después de definir correctamente el selector de período.
12. **Exportación avanzada para Excel.**
13. **Regresiones UX con datos reales.** Botones sólo-icono, targets táctiles y tarjetas de transferencia con nombres largos.

## Último horizonte

14. **Temas y apariencias configurables.**
15. **Endurecimiento de seguridad y privacidad local.**
16. **Sincronización cloud real.** Requiere una decisión explícita de arquitectura, cifrado, recuperación y modelo de privacidad.
