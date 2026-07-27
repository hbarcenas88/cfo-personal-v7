# Estabilidad móvil de Registro — Diseño aprobado

**Fecha:** 2026-07-26

**Estado:** Diseño aprobado; pendiente de revisión de esta especificación y de plan técnico.
**Alcance:** Todos los campos editables y controles reutilizables de V7, con prioridad en Registro y Auditoría. No modifica reglas financieras.

## Propósito

Eliminar las interrupciones al escribir y unificar la interacción móvil de formularios, selectores y calculadoras. La experiencia objetivo en 390 × 844 permite completar un movimiento normal sin desplazamiento manual, sin teclado inesperado y sin controles ocultos bajo el borde inferior.

## Decisiones de producto

### Escritura y foco

- Al escribir en cualquier campo editable, el cursor, selección y teclado permanecen estables.
- La modificación de un campo actualiza sólo su borrador; no reconstruye el formulario completo.
- La pantalla sólo se vuelve a renderizar por una transición estructural: abrir/cerrar un sheet, guardar, cancelar o confirmar una selección.
- Cuando el teclado del sistema está visible, el campo activo debe permanecer visible por ajuste automático. No se exige desplazamiento manual en el recorrido normal.

### Campos con lista de opciones

- V7 conserva controles propios; no se introducen `<select>` nativos.
- Un toque abre primero la lista, sin teclado.
- La primera opción del selector es `Buscar o escribir`; sólo tocar ese campo activa teclado y filtrado.
- La regla se concentra en el control reutilizable y se aplica a todos los campos que combinan texto y opciones.

### Calculadora única

- Gasto, ingreso, presupuesto y provisión comparten una calculadora clásica y una definición de teclas.
- Orden numérico: `7 8 9 / 4 5 6 / 1 2 3 / , 0 .`.
- Incluye borrado, `÷`, `×`, `−`, `+` y una presentación clara del importe.
- La coma es separador de miles; el punto es el único separador decimal. El almacenamiento conserva el importe numérico existente.
- No existe `00` ni una acción `Confirmar monto`: la calculadora modifica el importe del borrador y permanece visible.
- Una operación incompleta o inválida se explica junto al importe y nunca se convierte en un valor ambiguo.

### Guardado y diseño del sheet

- La palomita de cabecera es la única acción para guardar el movimiento completo.
- Si faltan datos requeridos, permanece utilizable: explica qué falta, lleva el foco al primer campo pendiente y conserva todo el borrador.
- A 390 × 844, los campos relevantes, el control de extraordinario, la calculadora y la acción de guardar caben sin desplazamiento manual, sin reducir objetivos táctiles por debajo de 44 px ni invadir safe areas o navegación.
- Los campos no esenciales se compactan mediante jerarquía y agrupación; no se eliminan ni se altera su significado.

## Arquitectura propuesta

1. **Controlador de borrador de formulario.** Centraliza actualizaciones locales, errores de validación y restauración de foco. El DOM del campo activo no se sustituye durante `input`.
2. **Selector buscable propio.** Expone de forma explícita apertura de lista, activación de búsqueda, filtrado y confirmación/cancelación; depende del controlador de borrador, no de re-renderes globales.
3. **Motor de calculadora.** Define la secuencia de teclas, el formato de miles/decimales, evaluación segura y errores. Todas las pantallas consumidoras sólo aportan contexto visual, no su propia grilla o interpretación de importe.
4. **Composición de Registro.** Ordena la cabecera de guardado, campos compactos, extraordinario y calculadora dentro de un viewport móvil seguro. No cambia la validación financiera existente ni los modelos de movimiento.

## Flujo de datos y errores

`interacción local → borrador estable → validación local → render parcial necesario → guardado explícito`.

- El borrador no persiste ni crea un movimiento hasta tocar la palomita.
- Un selector cerrado conserva su valor previo; cancelar no introduce cambios.
- Al guardar con faltantes, se muestra el primer error accionable sin borrar texto ni valor numérico.
- Errores de cálculo mantienen la expresión visible y bloquean únicamente el importe inválido, no el resto del formulario.
- Ningún caso crea, edita o borra saldos, presupuestos, transferencias o movimientos sin el guardado explícito ya existente.

## Verificación requerida

- Pruebas de escritura continua, cursor y foco para notas, descripción y los demás campos editables de V7, con cobertura prioritaria de Registro y Auditoría.
- Pruebas de selector: apertura sin teclado, búsqueda bajo intención explícita, cancelación y aplicación.
- Pruebas del motor de calculadora: orden, borrado, operaciones, coma de miles, punto decimal y expresiones inválidas.
- Pruebas de guardado: palomita con datos completos, explicación/foco con datos incompletos y preservación del borrador.
- Regresión de trazabilidad financiera, almacenamiento y controles propios sin `<select>` nativo.
- Revisión renderizada a 390 × 844: sin overflow, contenido oculto, superposición con navegación/safe area ni scroll manual requerido para el flujo normal.
- Usar `build-web-apps:frontend-testing-debugging` para reproducción y QA renderizado cuando se ejecute el plan, y `frontend-design` para futuras decisiones visuales sustantivas. Son herramientas de entorno, no dependencias de la PWA.

## Fuera de alcance

- Cambios a saldos, presupuesto, transferencias, movimientos, capacidad de pago o trazabilidad financiera.
- Diseño e implementación de metas o fechas de liberación de provisiones: se trabajará como iniciativa independiente después de este bloque.
- PDF, importación bancaria, nube, temas o seguridad.
