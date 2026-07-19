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

## Prioridad 0 — implementada, en validación con datos reales

- Selector reutilizable con borrador confirmado para el período global y el período independiente de Auditoría: implementado.
- Comparación automática con período anterior equivalente sólo en Auditoría y Categorías, sin cambiar reglas financieras: implementada.
- Densidad de selector, filtros y calculadora de ingresos: implementada y cubierta por la batería automatizada. Una sesión sintética controlada a 390 × 844 observó cuerpo desplazable sobre pie fijo, toggle alcanzable, controles medidos sin overflow ni targets menores de 44 px y keypad sin calendario; sigue pendiente captura duradera o validación móvil del usuario.
- Alcance analítico observado en la sesión sintética a 390 × 844: Auditoría conserva su período cuando cambia el dashboard y la comparación respeta la categoría; Categorías muestra período previo, `Sin base anterior` y la limitación explícita de Solo presupuesto. Sigue pendiente captura duradera o validación móvil del usuario.
- Entrega PWA: la comprobación local anterior con `cfo-personal-v7-cache-34` observó activos fuente actualizados tras refrescar/recargar el service worker. El worker actual `cfo-personal-v7-cache-35` está cubierto por regresión de precache sin HTTP cache, pero sigue pendiente captura duradera o validación móvil del usuario.
- Pendiente antes de considerarlo completado: captura duradera o validación móvil del usuario, y validación no destructiva con datos reales después de confirmar un respaldo JSON existente. Esta evidencia no autoriza publicación ni merge.
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
