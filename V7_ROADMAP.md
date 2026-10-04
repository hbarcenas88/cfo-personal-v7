# CFO Personal V7 Roadmap

## Ampliación aprobada — presupuesto y retiro de Auditoría guiada (04/10/2026)

Se retira el módulo de Auditoría guiada completo: entrada de Nuevo cierre, lista de cierres, importación CSV/XLSX de estados de cuenta, revisiones de coincidencias, pantallas, rutas y plantilla de estado de cuenta. Auditoría de registros, filtros, comparación por período, edición y acceso por cuenta desde Balances permanecen activos. Los auditClosures históricos se conservan compatibles con almacenamiento y respaldos; retirar la función no purga datos financieros.

Presupuesto base es una plantilla independiente en state.budgetTemplate, sin mes; no es la fila mensual sin subcategoría. Cargar base o copiar anterior completa sólo grupos faltantes, sin sobrescribir ni duplicar. La fila sin subcategoría conserva identidad e importe propios. Crear categorías dentro del editor las mantiene en borrador hasta guardarlas atómicamente con el plan; no se ofrece creación de subcategorías nuevas en esta interfaz.

Ampliación implementada localmente: versión 7.0.7/cache-51. Evidencia nueva del 04/10/2026: 46/46 archivos de pruebas pasan, sintaxis de 30 archivos JavaScript y diff limpios. Revisión GUI independiente a 390 × 844 y 999 × 914; informe en docs/verification/2026-10-04-planning-refinements.md. Offline independiente confirmado con servidor detenido y recarga. Veredicto final: entrega local aprobada sin hallazgos pendientes; últimos ajustes visuales revalidados. Teléfono, datos reales y publicación siguen separados.


## Planeación mensual y provisiones — entrega local completada

Al 03/10/2026: oleadas 0–5 completadas localmente en versión 7.0.6/cache-50. Suite fresca 44/44 y recorrido independiente móvil 390 × 844/escritorio 1280 × 900 confirmados. Editor mensual, copia de faltantes, acumulados, edición puntual, aplicación mensual de planeación, liberación parcial y fechas DD/MM/AAAA están disponibles. Informe independiente incorporado en docs/verification/2026-10-03-planning-workspace.md: entrega local aprobada sin hallazgos abiertos. Sintaxis de 33 archivos JavaScript y diff final aprobados.

Plan: docs/superpowers/plans/2026-10-03-planning-workspace.md. El pedido precede al resto de mejoras funcionales diferidas; hallazgos generales permanecen en BACKLOG.md. Teléfono/PWA, datos reales y publicación se mantienen como gates separados.

La importación asistida histórica fue incorporada en a2c92ec (25/08/2026) y corregida en 79928f2 (30/08/2026). Publicación externa actual no verificada. Los apartados siguientes conservan horizonte y evidencia histórica; sus caches no representan la entrega local nueva.

## Decisiones de alcance

- V7 es la única aplicación operativa de este repositorio y vive en su raíz.
- La base de datos es nueva (`cfo_personal_v7`) y arranca vacía.
- No hay cuentas, categorías, subcategorías, presupuestos, provisiones, recurrencias ni registros por defecto.
- La primera experiencia es un onboarding opcional para crear datos base o importar CSV.
- V7 es una PWA mobile-first con almacenamiento local y funcionamiento offline.

## Backlog posterior

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

## Auditoría guiada — retirada del alcance operativo

El diseño del 19/07/2026 y su implementación se conservan como historia documental, no como trabajo pendiente ni función a reactivar. Por decisión del 04/10/2026 se retiran módulo, plantilla y dependencias exclusivas. No se elimina el historial auditClosures. Cualquier futura conciliación bancaria o lectura de estados de cuenta requiere una iniciativa nueva aprobada.

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
