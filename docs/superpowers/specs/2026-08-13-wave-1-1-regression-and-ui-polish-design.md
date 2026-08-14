# Oleada 1.1 — Recuperación de Registro y pulido de selectores

**Estado:** Diseño aprobado para formalización el 2026-08-13. Pendiente de revisión del documento antes de escribir el plan ejecutable.

## Propósito

Insertar una oleada correctiva autocontenida entre las Oleadas 1 y 2 para:

1. reparar la regresión introducida en la Oleada 0 que impide que la calculadora de Registro actualice el monto de inmediato;
2. pulir el calendario de Registro para uso natural con el pulgar;
3. simplificar y equilibrar visualmente el selector de períodos entregado en la Oleada 1.

La oleada no modifica reglas financieras, persistencia de movimientos, saldos, presupuestos, transferencias, provisiones ni la independencia entre `period` y `auditPeriod`.

## Evidencia y causa raíz

La regresión de la calculadora fue reproducida en la aplicación publicada y en el código actual servido a 390 × 844. Al pulsar un dígito, el valor se guarda en `state.ui.recordFlow`, pero el monto y el botón de borrar no se actualizan. Un render posterior provocado por Cuenta o Categoría revela el valor acumulado.

La causa está en el enlace de eventos creado por la Oleada 0:

- el render se divide entre `screen`, `record` y `sheet`;
- cada raíz llama a `bindRecordEvents(root)`;
- mientras Registro está en el formulario, cada llamada crea un controlador y sobrescribe la variable global `keypad`;
- los botones del Registro consultan después esa variable global, que termina apuntando al controlador creado para `sheet-root`;
- el controlador modifica el borrador correcto, pero intenta actualizar monto, error y borrar dentro de una raíz que no contiene esos elementos.

Los 14 tests actuales pasan porque verifican por separado la lógica pura del keypad, el formulario y el coordinador de render. No existe una prueba que reproduzca el enlace sucesivo `screen → record → sheet`.

## Alcance funcional

### 1. Controlador local de la calculadora

El controlador del keypad pertenecerá exclusivamente al formulario renderizado dentro de `#record-root`.

- No existirá una referencia global que pueda ser sobrescrita por otra raíz.
- El enlace saldrá sin hacer nada cuando la raíz no contenga un keypad de Registro.
- Cada listener capturará el controlador local creado para ese formulario.
- El callback actualizará el borrador y buscará monto, error y borrar únicamente dentro de la misma raíz.
- Abrir o reconstruir un sheet no podrá cambiar el controlador activo de Registro.

La solución se aislará en `src/components/recordKeypad.js`, en vez de añadir más responsabilidad a `src/main.js`. La interfaz `bindRecordKeypad(root, flow, { clearValidation })` consumirá una raíz DOM y el borrador de Registro, enlazará los botones existentes y devolverá el controlador local o `null` cuando la raíz no aplique.

La corrección conservará la cuadrícula clásica de cuatro columnas, el borrado existente y el guardado financiero como única confirmación del movimiento.

### 2. Calendario de Registro al alcance del pulgar

El calendario de Registro tendrá este orden visual:

1. tirador y título;
2. cuadrícula del calendario;
3. navegación mensual `anterior — mes visible — siguiente`;
4. atajos `Hoy`, `Ayer` e `Inicio de mes`;
5. botón `Listo`.

Reglas:

- La navegación mensual y los atajos quedan debajo de la cuadrícula, dentro de la zona inferior de interacción.
- Se elimina la tarjeta visible `Fecha seleccionada`; el día activo se distingue mediante superficie circular azul, ring visible y peso tipográfico, sin texto redundante.
- Cada día es un botón con `aria-pressed="true|false"` y un `aria-label` que contiene la fecha completa; el día de hoy añade `aria-current="date"`.
- Los botones de cambio de mes tienen nombres accesibles explícitos.
- Se elimina el atajo `Personalizado`, actualmente inerte. Elegir cualquier día ya cubre esa intención.
- `Listo` permanece visible sin desplazar el sheet a 390 × 844, incluso cuando el mes ocupa seis semanas.
- `Hoy`, `Ayer` e `Inicio de mes` actualizan tanto la fecha seleccionada como el mes visible antes de confirmar.

`renderCalendarSheet()` recibirá una variante explícita `context: 'record' | 'period'`. La nueva composición y la eliminación de `Personalizado` se aplican sólo a `context: 'record'`, que corresponde a `calendarTarget === 'record-date'`. Los calendarios abiertos desde `Desde` o `Hasta` conservan su composición actual en esta oleada. Ninguna variante cambia la semántica del borrador: la fecha sólo se confirma al pulsar `Listo`; cerrar el sheet conserva el valor anterior.

### 3. Estado visual del selector de períodos

Se eliminan del componente compartido los textos visibles `Seleccionado` y `Selección actual`, incluidos los contextos global y de Auditoría.

- Una opción representable en la pestaña actual usa superficie y borde azul, clase `.selected`, `aria-pressed="true"` y un check discreto sin texto. El check introduce una diferencia de forma y no depende de distinguir el color.
- Una opción no activa no aparenta confirmación.
- `Usar período del dashboard` sigue siendo una acción de copia puntual y nunca una opción presionada.
- No se introducen nuevos colores; se reutilizan `--blue` y `--blue-soft`.

#### Borrador sin representación en la pestaña actual

La regla aprobada es:

- cambiar de pestaña no modifica el borrador;
- si la pestaña abierta no contiene una opción equivalente al borrador, no se muestra un resumen alternativo ni una falsa selección;
- `Aplicar` queda deshabilitado y accesiblemente marcado como no disponible;
- elegir una opción visible vuelve a habilitar `Aplicar`;
- `Usar período del dashboard` cuenta como una acción explícita y habilita `Aplicar` para esa copia puntual, aunque el período copiado no coincida con un preset; cambiar después de pestaña vuelve a evaluar la regla anterior;
- volver a la pestaña anterior recupera la representación azul del borrador intacto.

Así se evita confirmar un estado invisible, cambiar el período silenciosamente o reintroducir texto redundante.

### 4. Cuadrícula simétrica de años

En móvil, los ocho años se distribuyen en dos columnas y cuatro filas completas.

- Todas las tarjetas tienen el mismo ancho, alto, radio y separación.
- La altura mínima táctil es 52 px.
- Las cuatro filas usan `minmax(52px, 1fr)` para crecer uniformemente y aprovechar el espacio disponible.
- Hasta 640 px de viewport se usan dos columnas por cuatro filas; por encima de ese ancho se usan cuatro columnas por dos filas, siempre completas y simétricas.

El conjunto deja de usar la distribución móvil actual de cinco elementos en la primera fila y tres en la segunda.

### 5. Altura estable y compacta del selector global

Balances, Resumen y Categorías comparten una variante global compacta del sheet:

- altura exterior exacta: primero `min(640px, calc(100vh - 24px))` como fallback y después `min(640px, calc(100dvh - 24px))`;
- mismo alto exacto para `Por rango` y `Por año`;
- un único scroll dentro de `.period-sheet-content`;
- footer fuera del scroll y siempre visible;
- targets de `Cancelar` y `Aplicar` de al menos 44 px;
- sin overflow horizontal ni colisión con safe areas.

Auditoría conserva su variante alta porque contiene `Todo el historial`, copia del dashboard y comparación. En esta oleada no se compacta ni se rediseña esa densidad adicional.

## Simetría

La Oleada 1.1 aplica simetría como criterio obligatorio a todas las superficies que toca:

- años;
- navegación mensual;
- atajos de calendario;
- footer y botones de acción;
- radios, alturas, anchos y gaps de las variantes modificadas.

La auditoría completa de asimetrías de tarjetas, botones, rectángulos y separaciones del resto de la aplicación permanece asignada a la Oleada 3.

## Pruebas y QA

### Calculadora

La nueva prueba integrada debe fallar contra el código actual y demostrar que:

- enlazar sucesivamente una raíz de pantalla, `record-root` y `sheet-root` no reemplaza el controlador del Registro;
- pulsar un dígito actualiza inmediatamente el borrador, el texto visible y el estado de borrar;
- borrar actualiza inmediatamente los tres;
- un render posterior conserva el mismo valor, sin ser necesario para mostrarlo.

La matriz funcional incluye:

- dígitos `0–9`, cero inicial y pulsaciones rápidas;
- decimal único y separador de miles;
- `+`, `−`, `×`, `÷`, reemplazo de operador y precedencia;
- cálculo incompleto, división por cero y resultado negativo;
- borrado carácter por carácter hasta vacío y estado disabled;
- continuidad tras Cuenta, Categoría, Fecha y Descripción;
- gasto, ingreso, transferencia, presupuesto, provisión y edición;
- validación y guardado sin alterar reglas financieras.

### Calendario

- Día elegido con superficie circular, ring, peso tipográfico, `aria-pressed="true"` y nombre accesible de fecha completa.
- En `context: 'record'`, ausencia de `Fecha seleccionada` y del atajo inerte `Personalizado`.
- Navegación y tres atajos debajo de la cuadrícula.
- `Listo` visible sin scroll a 390 × 844 con un mes de seis semanas.
- Cancelar o cerrar no confirma el borrador.
- El calendario de `Desde`/`Hasta` conserva su composición y comportamiento actuales.

### Selector de períodos

- Ausencia de texto visible `Seleccionado` y `Selección actual`.
- Máximo una opción seleccionada en la pestaña visible, identificable por superficie/borde y check aun sin distinguir color.
- Estado accesible mediante `aria-pressed` y nombres correctos.
- `Aplicar` deshabilitado cuando el borrador no tiene representación en la pestaña abierta y habilitado tras elegir una opción visible.
- Volver de pestaña recupera el borrador sin mutarlo.
- Ocho años en cuadrícula móvil 2 × 4, con dimensiones y gaps iguales.
- Delta de altura exterior de 0 px entre rango y año.
- Footer visible, un solo scroll interno y sin overflow a 390 × 844.
- Independencia entre `period` y `auditPeriod` intacta.

### Distribución de la evidencia

- `tests/keypad.test.mjs`: dígitos, cero inicial, decimal, agrupación, operadores, precedencia y errores matemáticos.
- Nueva prueba de integración de Registro: enlace sucesivo `screen → record → sheet`, actualización inmediata de monto/borrar/error y persistencia tras reconstrucción.
- `tests/record-flow.test.mjs` y pruebas financieras existentes: payload y validación de gasto, ingreso, transferencia, presupuesto, provisión y edición sin mutación colateral.
- Browser a 390 × 844: smoke de gasto y edición; continuidad al abrir Cuenta, Categoría y Fecha; escritura en Descripción; borrado, feedback inmediato y botón Guardar accesible. Se usarán datos sintéticos y no se guardará un movimiento real de la usuaria.
- Browser a 390 × 844: calendario de Registro, ambos tabs del selector global y comprobación separada de que el calendario de `Desde`/`Hasta` no cambió.

### Documentación de producto y evidencia

- `DESIGN_SYSTEM.md` dejará de exigir las palabras visibles `Seleccionado` y `Selección actual`; documentará el check, el estado accesible y la regla de `Aplicar` deshabilitado.
- `PRODUCT_SPEC.md` documentará la misma regla sin cambiar la independencia de Auditoría.
- `PROGRESS.md` registrará la regresión corregida y el alcance exacto de la Oleada 1.1.
- `VERIFIER.md` contendrá la evidencia automatizada, Browser y revisión independiente; dejará publicación y validación telefónica explícitamente pendientes al crear el commit. La verificación externa posterior al push se reportará en la conversación sin falsear el contenido del SHA publicado.

### Gate integral

- Comprobación sintáctica de cada JavaScript modificado.
- Pruebas enfocadas y batería serial completa.
- QA renderizado a 390 × 844 usando código actual verificado, no un servidor o service worker obsoleto.
- Smoke test de escritorio.
- Consola sin errores ni advertencias relevantes.
- Revisión independiente con máximo 40 minutos y dos rondas de corrección.
- Revisión de privacidad y `git diff --check`.
- `src/components/recordKeypad.js` añadido explícitamente a `APP_SHELL`, prueba de paridad del precache y actualización de `service-worker.js` a `cfo-personal-v7-cache-44`.
- Un único commit local de la Oleada 1.1. Antes de cualquier push se solicita autorización textual fresca para el SHA y el destino externo exactos.
- Publicación sólo autorizada cuando calculadora, calendario y selector formen una entrega completa; después se verifica GitHub Pages y se solicita validación telefónica.

## Fuera de alcance y trabajo diferido

- No se cambia el significado ni la lógica de `Comparar con período anterior`; queda para una revisión funcional posterior de Auditoría.
- No se compacta el sheet de Auditoría.
- No se realiza todavía la auditoría visual completa de la aplicación; permanece en la Oleada 3.
- No se modifican provisiones, presupuestos, importación, cuentas, categorías ni el alcance previsto para la Oleada 2.
- No se añaden tooltips o manual general en esta oleada.

## Resultado esperado

La persona puede introducir, corregir y calcular un monto con feedback inmediato; seleccionar una fecha con los controles principales al alcance del pulgar; y elegir un período en un sheet compacto, estable y simétrico sin textos que repitan lo que ya comunica el estado azul.
