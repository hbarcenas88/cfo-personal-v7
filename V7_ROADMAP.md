# CFO Personal V7 Roadmap

## Decisiones de alcance

- V7 es la única aplicación operativa de este repositorio y vive en su raíz.
- La base de datos es nueva (`cfo_personal_v7`) y arranca vacía.
- No hay cuentas, categorías, subcategorías, presupuestos, provisiones, recurrencias ni registros por defecto.
- La primera experiencia es un onboarding opcional para crear datos base o importar CSV.
- V7 es una PWA mobile-first con almacenamiento local y funcionamiento offline.

## Backlog posterior

- Conciliación mensual.
- Auditoría contra estado de cuenta PDF.
- Alertas financieras configurables.
- Comparativos de periodos.
- Sincronización cloud real.
- Conversión avanzada de JSON a Excel.

## Último horizonte

- Temas y apariencias configurables.
- Endurecimiento de seguridad y privacidad local.
- Sincronización cloud real, sólo después de definir arquitectura, cifrado, recuperación y modelo de privacidad.

## Prioridad 0 aprobada — períodos y densidad móvil

- Implementar selector reutilizable con borrador confirmado para el período global y período independiente de Auditoría.
- Habilitar comparación automática con período anterior equivalente sólo en Auditoría y Categorías, sin cambiar reglas financieras.
- Corregir densidad de selector, filtros y calculadora de ingresos; verificar a 390 × 844 con datos reales respaldados.
- Este bloque precede a la Etapa 2 y está documentado en `docs/superpowers/specs/2026-07-18-period-scope-and-mobile-density-design.md`.

## Armonización UX gradual

### Etapa 1 — Resumen y Categorías (en validación)

- Resumen con Salud presupuestaria y Capacidad de pago explicable.
- Configuración explícita de liquidez, deuda, cuentas excluidas y provisiones reservadas.
- Gráficas de gasto operativo y ritmo presupuestario; análisis en sheet y extraordinarios manuales.
- Categorías simplificada: detalle por categoría sin el bloque financiero global.
- Selector de período con calendario y navegación de Resumen con tendencia.

### Etapa 2 — Balances y Auditoría

- Aplicar jerarquía de tarjetas, iconografía, estados y densidad del sistema aprobado.
- Añadir marcado masivo de extraordinarios desde Auditoría.
- Revisar saldo disponible, provisiones y mensajes de salud con datos reales.

### Etapa 3 — Registro, menú, planeación y ajustes

- Unificar sheets, formularios, selectores, estados vacíos y acciones de configuración.
- Conservar reglas financieras existentes mientras se mejora la expresión visual.
