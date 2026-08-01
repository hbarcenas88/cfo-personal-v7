# Template de estado de cuenta para Auditoría guiada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Descargar desde Ajustes un único template de estado de cuenta compatible con Auditoría guiada, explicarlo bajo intención y publicar la entrega verificada.

**Architecture:** El catálogo central en src/services/importExportService.js conserva encabezados, nombre y explicación. Ajustes recibe estado transitorio para expandir la ayuda dentro del mismo sheet; Auditoría conserva intactos su importador CSV/XLSX y mapeo flexible. El cache PWA sube a cache-41 porque cambian recursos precacheados.

**Tech Stack:** ES modules nativos, CSV BOM mediante downloadText, HTML/CSS existente, node:assert/strict, GitHub Pages.

## Global Constraints

- V7 es la única línea operativa; trabajar en el worktree aislado actual y no recuperar worktrees históricos.
- No usar select nativo; conservar controles propios y objetivos táctiles mínimos de 44 px.
- El formato canónico es exactamente Fecha,Descripción,Monto: fecha AAAA-MM-DD, descripción obligatoria, monto firmado sin moneda ni miles (negativo débito/gasto, positivo crédito/ingreso).
- Cuenta, saldo real, rango y fecha de corte pertenecen al cierre guiado: el template no los incluye.
- La descarga o ayuda no crea cierres, no importa filas ni modifica saldos, movimientos, presupuesto, transferencias, provisiones, capacidad de pago ni trazabilidad.
- Auditoría mantiene el importador CSV/XLSX y mapeo flexible existentes; no se añade template ni ayuda en su paso de importación.
- Si cambia un recurso precacheado, elevar service-worker.js a cfo-personal-v7-cache-41 y actualizar el contrato PWA.
- Antes de publicar, alinear BACKLOG.md, PROGRESS.md, VERIFIER.md, PRODUCT_SPEC.md, DESIGN_SYSTEM.md y V7_ROADMAP.md con evidencia observada.
- No versionar PDFs, CSV/XLSX bancarios, capturas privadas, JSON de respaldo ni datos personales.

---

## File structure

| Archivo | Responsabilidad |
| --- | --- |
| src/services/importExportService.js | Metadatos y descarga del CSV canónico. |
| src/screens/settings.js | Fila legible de template y ayuda bajo intención. |
| src/main.js | Eventos de descarga y toggle de ayuda transitoria. |
| styles/screens.css | Fila/ayuda sin overflow y con acciones de 44 px. |
| tests/audit-statement-template.test.mjs | Contrato del catálogo, descarga y markup. |
| service-worker.js | Cache-41. |
| tests/mobile-ui-contract.test.mjs | Contrato PWA/template. |
| Seis fuentes operativas | Estado publicado y evidencia pendiente. |

### Task 1: Catálogo y descarga del template canónico

**Files:**
- Modify: src/services/importExportService.js
- Create: tests/audit-statement-template.test.mjs

**Interfaces:**
- Produces AUDIT_STATEMENT_TEMPLATE_KIND = 'audit_statement', templateHeaders.audit_statement, templateMeta(kind), downloadTemplate(kind).
- templateMeta('audit_statement') returns title Auditoría — estado de cuenta, description Formato para comparar un estado de cuenta con una cuenta elegida., fields Fecha, Descripción, Monto, and help Fecha AAAA-MM-DD. Monto negativo = débito/gasto; positivo = crédito/ingreso. Puedes cargar CSV o XLSX.

- [ ] **Step 1: Write the failing test**

~~~js
import assert from 'node:assert/strict';
import {
  AUDIT_STATEMENT_TEMPLATE_KIND,
  templateHeaders,
  templateMeta,
  toCSV
} from '../src/services/importExportService.js';

assert.equal(AUDIT_STATEMENT_TEMPLATE_KIND, 'audit_statement');
assert.deepEqual(templateHeaders.audit_statement, ['Fecha', 'Descripción', 'Monto']);
assert.deepEqual(templateMeta(AUDIT_STATEMENT_TEMPLATE_KIND), {
  title: 'Auditoría — estado de cuenta',
  description: 'Formato para comparar un estado de cuenta con una cuenta elegida.',
  fields: 'Fecha, Descripción, Monto',
  help: 'Fecha AAAA-MM-DD. Monto negativo = débito/gasto; positivo = crédito/ingreso. Puedes cargar CSV o XLSX.'
});
assert.equal(toCSV(templateHeaders.audit_statement, []), 'Fecha,Descripción,Monto');
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: node tests/audit-statement-template.test.mjs

Expected: FAIL because the audit template kind and templateMeta do not exist.

- [ ] **Step 3: Implement the smallest catalog entry**

~~~js
export const AUDIT_STATEMENT_TEMPLATE_KIND = 'audit_statement';

export const templateHeaders = {
  // existing entries unchanged
  [AUDIT_STATEMENT_TEMPLATE_KIND]: ['Fecha', 'Descripción', 'Monto']
};

export function templateMeta(kind) {
  if (kind === AUDIT_STATEMENT_TEMPLATE_KIND) {
    return {
      title: 'Auditoría — estado de cuenta',
      description: 'Formato para comparar un estado de cuenta con una cuenta elegida.',
      fields: 'Fecha, Descripción, Monto',
      help: 'Fecha AAAA-MM-DD. Monto negativo = débito/gasto; positivo = crédito/ingreso. Puedes cargar CSV o XLSX.'
    };
  }
  return {
    title: kind,
    description: explainTemplate(kind),
    fields: (templateHeaders[kind] || []).join(', '),
    help: ''
  };
}
~~~

Keep downloadTemplate generic, but use templateMeta(kind).title in its toast. The payload must be exactly Fecha,Descripción,Monto plus CRLF and BOM supplied by the existing downloadText. Do not add sample rows or change import behavior.

- [ ] **Step 4: Run focused verification**

Run: node --check src/services/importExportService.js; node tests/audit-statement-template.test.mjs; node tests/guided-audit.test.mjs

Expected: all exit 0; Guided Audit accepts the canonical headers through existing mapping.

- [ ] **Step 5: Commit**

~~~powershell
git add src/services/importExportService.js tests/audit-statement-template.test.mjs
git commit -m "feat: add audit statement template"
~~~

### Task 2: Template visible en Ajustes con ayuda bajo intención

**Files:**
- Modify: src/screens/settings.js
- Modify: src/main.js
- Modify: styles/screens.css
- Modify: tests/audit-statement-template.test.mjs

**Interfaces:**
- Consumes templateMeta(kind), templateHeaders and AUDIT_STATEMENT_TEMPLATE_KIND.
- Produces renderTemplateSheet(state) and data-template, data-template-info, data-template-info-panel.
- state.ui.templateInfoKind is transient UI state only, default '' and never persisted.

- [ ] **Step 1: Extend the failing render test**

~~~js
import { renderTemplateSheet } from '../src/screens/settings.js';

const closed = renderTemplateSheet({ ui: { templateInfoKind: '' } });
assert.match(closed, /Auditoría — estado de cuenta/);
assert.match(closed, /data-template="audit_statement"/);
assert.match(closed, /data-template-info="audit_statement"/);
assert.doesNotMatch(closed, /data-template-info-panel/);

const open = renderTemplateSheet({ ui: { templateInfoKind: 'audit_statement' } });
assert.match(open, /data-template-info-panel="audit_statement"/);
assert.match(open, /Fecha AAAA-MM-DD/);
assert.match(open, /Monto negativo = débito\/gasto/);
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: node tests/audit-statement-template.test.mjs

Expected: FAIL because renderTemplateSheet does not accept state and has neither audit row nor help control.

- [ ] **Step 3: Implement a non-nested row and inline help**

Change renderActiveSheet to call renderTemplateSheet(state). In settings.js, render each entry in a template-entry container with sibling buttons: primary download uses data-template; the audit-only info action uses data-template-info and has aria-expanded, aria-controls and aria-label "Cómo preparar el estado de cuenta". Never place a button inside another button.

When state.ui.templateInfoKind equals audit_statement, render a role=note panel with data-template-info-panel="audit_statement" and templateMeta(kind).help. In bindTools, data-template-info toggles only state.ui.templateInfoKind then calls render(); data-template still calls downloadTemplate only.

Add .template-entry, .template-info and .template-info-panel styles. Keep buttons at least 44 px, wrap long copy and avoid horizontal overflow. Do not modify auditClose.js, file-input copy or import behavior.

- [ ] **Step 4: Run focused verification**

Run: node --check src/screens/settings.js; node --check src/main.js; node tests/audit-statement-template.test.mjs; node tests/mobile-ui-contract.test.mjs

Expected: all exit 0. The test must assert auditClose markup does not contain data-template="audit_statement".

- [ ] **Step 5: Commit**

~~~powershell
git add src/screens/settings.js src/main.js styles/screens.css tests/audit-statement-template.test.mjs
git commit -m "feat: explain audit statement template"
~~~

### Task 3: PWA, documentación operativa y evidencia

**Files:**
- Modify: service-worker.js
- Modify: tests/mobile-ui-contract.test.mjs
- Modify: BACKLOG.md, PROGRESS.md, VERIFIER.md, PRODUCT_SPEC.md, DESIGN_SYSTEM.md, V7_ROADMAP.md
- Modify: tests/audit-statement-template.test.mjs

**Interfaces:**
- Produces cfo-personal-v7-cache-41 and sources that separate published facts from unobserved mobile/real-data evidence.

- [ ] **Step 1: Extend the failing PWA/mobile contract**

~~~js
assert.match(worker, /cfo-personal-v7-cache-41/);
assert.match(settings, /data-template="audit_statement"/);
assert.match(settings, /data-template-info="audit_statement"/);
assert.doesNotMatch(auditClose, /data-template="audit_statement"/);
assert.match(importExport, /\['Fecha', 'Descripción', 'Monto'\]/);
~~~

- [ ] **Step 2: Run the contract to verify it fails**

Run: node tests/mobile-ui-contract.test.mjs

Expected: FAIL while cache remains cache-40 and template contract is absent.

- [ ] **Step 3: Update runtime shell and operational sources**

Change only CACHE_NAME to cfo-personal-v7-cache-41; no asset is added to APP_SHELL because the modified scripts are already present. Update the six documents with observed facts:

- main and GitHub Pages were published at cache-40 on 2026-07-28.
- The template is a local download and does not mutate finances.
- QA 390×844, device evidence and a real non-destructive account audit remain unchecked until observed.

PRODUCT_SPEC.md states the three columns and signed amounts. DESIGN_SYSTEM.md states the non-nested row and 44 px info action. VERIFIER.md adds download, help, upload and non-mutation checks. Remove only stale no-merge/no-publication claims; retain real pending-validation checkboxes.

- [ ] **Step 4: Run complete verification**

Run:

~~~powershell
node --check src/services/importExportService.js
node --check src/screens/settings.js
node --check src/main.js
node --check service-worker.js
node tests/audit-statement-template.test.mjs
node tests/storage-scope.test.mjs
node tests/transaction-edit.test.mjs
node tests/capacity-summary.test.mjs
node tests/period-scope.test.mjs
node tests/comparison-analysis.test.mjs
node tests/guided-audit.test.mjs
node tests/guided-audit-state.test.mjs
node tests/keypad.test.mjs
node tests/record-flow.test.mjs
node tests/searchable-options.test.mjs
node tests/mobile-ui-contract.test.mjs
git diff --check
~~~

Expected: every command exits 0.

- [ ] **Step 5: Rendered QA without financial mutation**

Serve with python -m http.server 8787 and use build-web-apps:frontend-testing-debugging with Browser. At 390×844 open Ajustes → Descargar templates. Verify the audit row is separate, primary action downloads the three-header CSV, ? expands/collapses without overlap, both actions are reachable, and Audit import has no duplicate template/help. Check console health, first viewport, overflow and safe area. If Browser cannot acquire a browser, record that blocker and leave device checks unchecked.

- [ ] **Step 6: Commit**

~~~powershell
git add service-worker.js tests/mobile-ui-contract.test.mjs tests/audit-statement-template.test.mjs BACKLOG.md PROGRESS.md VERIFIER.md PRODUCT_SPEC.md DESIGN_SYSTEM.md V7_ROADMAP.md
git commit -m "test: verify audit statement template"
~~~

### Task 4: Review, PR y publicación

**Files:**
- No product files expected. If review finds an issue, change only named files, rerun affected tests and commit a focused fix.

- [ ] **Step 1: Independent review**

Use superpowers:requesting-code-review on origin/main..HEAD. Verify exact headers/copy, no account/balance/range columns, no financial mutation, no nested buttons/native select, no template help in Audit import, cache-41 and only observed documentation claims.

- [ ] **Step 2: Resolve findings and re-verify**

Fix every Critical or Important finding using its focused test plus the complete Task 3 command block. Request scoped re-review. Put only genuine future product work in BACKLOG.md.

- [ ] **Step 3: Push and create PR**

~~~powershell
git status --short
git push -u origin codex/audit-statement-template
gh pr create --base main --head codex/audit-statement-template --title "feat: add audit statement template" --body "## Summary
- Adds Fecha, Descripción, Monto template in Ajustes
- Keeps Auditoría import unchanged and analytical
- Updates cache-41 and operational evidence

## Verification
- Full automated suite and diff check pass
- Rendered 390×844 evidence is observed or explicitly pending"
~~~

- [ ] **Step 4: Merge and publish after checks succeed**

~~~powershell
$prNumber = gh pr view --head codex/audit-statement-template --json number --jq .number
gh pr checks $prNumber --watch
gh pr merge $prNumber --squash --delete-branch
git checkout main
git pull origin main
~~~

Obtain and wait for the Pages run with:

~~~powershell
$runId = gh run list --repo hbarcenas88/cfo-personal-v7 --branch main --workflow pages-build-deployment --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --repo hbarcenas88/cfo-personal-v7 --exit-status
~~~

Verify public service-worker.js returns HTTP 200 and contains cfo-personal-v7-cache-41. Verify public src/services/importExportService.js returns HTTP 200 and contains AUDIT_STATEMENT_TEMPLATE_KIND.

- [ ] **Step 5: Report release state**

Report PR URL, squash commit, Pages URL, cache-41 evidence, suite result and remaining real-device/real-data items. Never claim mobile or real-data QA unless directly observed.

## Plan self-review

- **Spec coverage:** Task 1 creates the one-column signed template; Task 2 puts it only in Ajustes with intent-driven help; Task 3 updates PWA, documents and QA; Task 4 covers review through Pages.
- **Scope:** No template in Audit import, no PDF parsing in app and no financial changes.
- **Consistency:** Template kind, headers and metadata are defined before UI use; cache-41 follows established PWA versioning.
- **Evidence:** Device/390×844 and real-account validation remain pending unless Task 3 directly observes them.
