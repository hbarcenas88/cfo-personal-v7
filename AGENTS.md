# CFO Personal V7

## Línea operativa

Este repositorio contiene únicamente la PWA activa V7. La aplicación vive en la raíz: `index.html`, `src/`, `styles/`, `assets/`, `manifest.webmanifest` y `service-worker.js`. Las versiones V3–V6 se conservan fuera de este repositorio como archivo histórico.

## Desarrollo y verificación

Desde la raíz, usar un servidor local:

```powershell
python -m http.server 8787
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/mobile-ui-contract.test.mjs
```

Abrir `http://127.0.0.1:8787/`; no usar `file://`. Cada cambio JavaScript requiere comprobación sintáctica, pruebas enfocadas y revisión móvil a 390×844. Si cambian assets, aumentar la versión en `service-worker.js`.

## Convenciones y datos

- ES modules nativos; dos espacios, punto y coma, comillas simples y camelCase.
- Pantallas en `src/screens/`, controles en `src/components/`, lógica pura en `src/services/` o `src/utils/`.
- No usar `<select>` nativos en flujos móviles; usar controles propios compactos.
- Preservar trazabilidad financiera: transferencias vinculadas no afectan ingresos, gastos ni presupuesto.
- No versionar datos personales, CSV bancarios, backups, capturas privadas ni secretos.

## Documentación operativa

- `PROGRESS.md`: estado y siguiente bloque de trabajo.
- `VERIFIER.md`: evidencia requerida antes de publicar.
- `BACKLOG.md`: mejoras diferidas.
- `PRODUCT_SPEC.md`: propósito, alcance, reglas financieras y flujos de producto.
- `DESIGN_SYSTEM.md`: criterios visuales, componentes y reglas de interacción.
- `PROJECT_NOTES.md` y `V7_ROADMAP.md`: principios resumidos y prioridades de producto.
