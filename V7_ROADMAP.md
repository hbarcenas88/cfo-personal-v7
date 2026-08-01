# CFO Personal V7 Roadmap

## Decisiones de alcance

- V7 es la única aplicación operativa de este repositorio y vive en su raíz.
- La base de datos es nueva (`cfo_personal_v7`) y arranca vacía.
- No hay cuentas, categorías, subcategorías, presupuestos, provisiones, recurrencias ni registros por defecto.
- La primera experiencia es un onboarding opcional para crear datos base o importar CSV.
- V7 es una PWA mobile-first con almacenamiento local y funcionamiento offline.

## Backlog posterior

- Auditoría guiada por cuenta y fecha: primera versión local implementada; la plantilla `Auditoría — estado de cuenta` se descarga localmente desde Ajustes sin mutar finanzas. Se observó el template en Browser a 390 × 844; siguen pendientes evidencia de dispositivo/PWA y validación no destructiva con datos reales.
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
- Densidad de selector, filtros y calculadora de ingresos: implementada y cubierta por la batería automatizada. Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró el sheet, los controles y el keypad; no confirma la versión actual sin captura duradera o validación móvil del usuario.
- Alcance analítico: la implementación mantiene el período independiente de Auditoría y la comparación de Categorías. Observación sintética no adjunta (narrativa, no evidencia de entrega): una sesión anterior exploró esos flujos, pero no sustituye la captura duradera o validación móvil del usuario.
- Entrega PWA: `main` y GitHub Pages se publicaron con `cfo-personal-v7-cache-40` el 2026-07-28. El código actual usa `cfo-personal-v7-cache-41`, cubierto por regresión de precache y runtime sin HTTP cache; incluye `searchableOptions.js`, sólo cachea respuestas válidas completas y preserva la respuesta de red cuando falla una escritura de caché. Sigue pendiente evidencia de dispositivo/PWA.
- Pendiente antes de considerarlo completado: evidencia de dispositivo/PWA y validación no destructiva con datos reales. El respaldo JSON fue confirmado el 2026-07-26.
- Este bloque precede a la Etapa 2 y está documentado en `docs/superpowers/specs/2026-07-18-period-scope-and-mobile-density-design.md`.

## Iniciativa analítica independiente — Auditoría guiada

- Diseño aprobado el 2026-07-19 e implementación local terminada, con evidencia operativa pendiente, documentados en `docs/superpowers/specs/2026-07-19-guided-audit-design.md` y `docs/superpowers/plans/2026-07-19-guided-audit-implementation.md`.
- Cierre flexible por cuenta y fecha: saldo real, rango declarado, CSV/XLSX normalizado, diferencias y delta persistente.
- Coincidencias exactas y candidatas requieren decisión humana; un descarte excluye sólo esa relación y una confirmación reserva sus filas.
- El lector XLSX usa SheetJS 0.20.3 vendorizado localmente, con licencia y procedencia verificables, dentro de `cfo-personal-v7-cache-41`.
- Comparación analítica y validaciones de revisión separadas de movimientos, saldos, presupuesto y transferencias.
- No bloqueó su diseño ni implementación; el respaldo JSON ya fue confirmado y falta una validación no destructiva con una cuenta real.
- PDF/imágenes, conexión bancaria, ajustes para cuadrar y conciliación automática quedan fuera de esta primera versión.

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

- Registro: entrada estable, selector buscable por intención y keypad clásico compartido implementados y cubiertos por pruebas automatizadas. Falta QA renderizado 390 × 844 y dispositivo real sin mutar datos; Browser no pudo adquirir un navegador local durante la comprobación del 2026-07-27.
- Unificar sheets, formularios, selectores, estados vacíos y acciones de configuración.
- Conservar reglas financieras existentes mientras se mejora la expresión visual.
