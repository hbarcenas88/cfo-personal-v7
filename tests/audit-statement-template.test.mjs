import assert from 'node:assert/strict';
import {
  AUDIT_STATEMENT_TEMPLATE_KIND,
  templateHeaders,
  templateMeta,
  toCSV
} from '../src/services/importExportService.js';
import { renderTemplateSheet } from '../src/screens/settings.js';
import { renderAuditCloseSheet } from '../src/screens/auditClose.js';

assert.equal(AUDIT_STATEMENT_TEMPLATE_KIND, 'audit_statement');
assert.deepEqual(templateHeaders.audit_statement, ['Fecha', 'Descripción', 'Monto']);
assert.deepEqual(templateMeta(AUDIT_STATEMENT_TEMPLATE_KIND), {
  title: 'Auditoría — estado de cuenta',
  description: 'Formato para comparar un estado de cuenta con una cuenta elegida.',
  fields: 'Fecha, Descripción, Monto',
  help: 'Fecha AAAA-MM-DD. Monto negativo = débito/gasto; positivo = crédito/ingreso. Puedes cargar CSV o XLSX.'
});
assert.equal(toCSV(templateHeaders.audit_statement, []), 'Fecha,Descripción,Monto');

const closedTemplateSheet = renderTemplateSheet({ ui: { templateInfoKind: '' } });
assert.match(closedTemplateSheet, /Auditoría — estado de cuenta/);
assert.match(closedTemplateSheet, /data-template="audit_statement"/);
assert.match(closedTemplateSheet, /data-template-info="audit_statement"/);
assert.match(closedTemplateSheet, /data-template-info="audit_statement" aria-expanded="false" aria-controls="template-info-audit_statement"/);
assert.doesNotMatch(closedTemplateSheet, /data-template-info-panel/);

const openTemplateSheet = renderTemplateSheet({ ui: { templateInfoKind: 'audit_statement' } });
assert.match(openTemplateSheet, /<div class="template-entry">\s*<button class="settings-row template-row" data-template="audit_statement"[\s\S]*?<\/button>\s*<button class="template-info" data-template-info="audit_statement" aria-expanded="true" aria-controls="template-info-audit_statement"[\s\S]*?<\/button>\s*<div class="template-info-panel" id="template-info-audit_statement" role="note" data-template-info-panel="audit_statement">/);
assert.match(openTemplateSheet, /Fecha AAAA-MM-DD/);
assert.match(openTemplateSheet, /Monto negativo = débito\/gasto/);

const auditCloseSheet = renderAuditCloseSheet({ ui: {}, auditClosures: [], accounts: [] });
assert.doesNotMatch(auditCloseSheet, /data-template="audit_statement"/);
