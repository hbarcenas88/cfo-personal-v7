import assert from 'node:assert/strict';
import { templateHeaders, templateMeta, toCSV } from '../src/services/importExportService.js';
import { renderTemplateSheet } from '../src/screens/settings.js';

assert.equal(Object.hasOwn(templateHeaders, 'audit_statement'), false, 'guided-audit statement template is retired');
assert.deepEqual(Object.keys(templateHeaders).sort(), ['accounts', 'budgets', 'categories', 'provisions', 'recurring', 'transactions']);
assert.equal(toCSV(templateHeaders.transactions, []), 'cuenta,movimiento,monto,categoria,subcategoria,descripcion,fecha');
for (const info of ['', 'audit_statement']) {
  const markup = renderTemplateSheet({ ui: { templateInfoKind: info } });
  assert.doesNotMatch(markup, /audit_statement|Auditoría — estado de cuenta|Cómo preparar el estado de cuenta/);
  for (const kind of Object.keys(templateHeaders)) assert.ok(markup.includes('data-template="' + kind + '"'));
}
assert.notEqual(templateMeta('audit_statement').title, 'Auditoría — estado de cuenta');
console.log('audit-statement-template.test.mjs passed');
