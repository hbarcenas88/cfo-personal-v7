import { parseCSV, rowsToObjects } from './importExportService.js';
import { canon } from '../utils/format.js';

export function validateStatementMapping(headers = [], mapping = {}) {
  const required = ['date', 'description'];
  if (required.some(key => !headers.includes(mapping[key]))) return { ok: false, message: 'Asigna fecha y descripción.' };
  const signed = headers.includes(mapping.amount);
  const split = headers.includes(mapping.debit) && headers.includes(mapping.credit);
  if (!signed && !split) return { ok: false, message: 'Asigna un importe o las columnas de débito y crédito.' };
  const selected = signed ? [...required, 'amount'] : [...required, 'debit', 'credit'];
  if (new Set(selected.map(key => mapping[key])).size !== selected.length) return { ok: false, message: 'Cada campo debe usar una columna distinta.' };
  return { ok: true, message: '' };
}

export async function readStatementFile(file) {
  const extension = file?.name?.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    const text = await file.text();
    const { rows } = parseCSV(text);
    return { headers: rows[0] || [], objects: rowsToObjects(rows), format: 'csv' };
  }
  if (extension === 'xlsx') {
    const workbook = globalThis.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const rows = globalThis.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
    return { headers: rows[0] || [], objects: rowsToObjects(rows), format: 'xlsx' };
  }
  throw new Error('Selecciona un archivo CSV o XLSX.');
}

export function suggestedStatementMapping(headers = []) {
  const find = names => headers.find(header => names.includes(canon(header))) || '';
  return {
    date: find(['fecha', 'date', 'fecha transaccion', 'fecha de transaccion']),
    amount: find(['monto', 'importe', 'amount', 'valor']),
    debit: find(['debito', 'débito', 'debit', 'cargos']),
    credit: find(['credito', 'crédito', 'credit', 'abonos']),
    description: find(['descripcion', 'descripción', 'detalle', 'description', 'concepto'])
  };
}
