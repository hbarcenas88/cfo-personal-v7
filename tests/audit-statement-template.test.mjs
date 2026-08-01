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
