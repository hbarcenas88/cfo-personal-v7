import { datedName, downloadText } from './importExportService.js';
import { restoreSnapshot, showToast } from '../state.js';

export function createBackup(state) {
  const payload = backupPayload(state);
  const filename = downloadText(datedName('respaldo_cfo_personal', 'json'), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  showToast(`Respaldo JSON creado: ${filename}`);
  return filename;
}

export function backupPayload(state) {
  return {
    app: 'CFO Personal',
    version: state.version || '7.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      accounts: structuredClone(state.accounts || []),
      categories: structuredClone(state.categories || []),
      transactions: structuredClone(state.transactions || []),
      budgets: structuredClone(state.budgets || []),
      provisions: structuredClone(state.provisions || []),
      provisionEvents: structuredClone(state.provisionEvents || []),
      importBatches: structuredClone(state.importBatches || []),
      recurring: structuredClone(state.recurring || []),
      recurringDone: structuredClone(state.recurringDone || {}),
      rules: structuredClone(state.rules || {}),
      period: structuredClone(state.period || {}),
      filters: structuredClone(state.filters || {}),
      healthDismissed: structuredClone(state.healthDismissed || {})
    }
  };
}

export async function restoreBackupFile(file) {
  if (!file) return false;
  const text = await file.text();
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  await restoreSnapshot(data);
  return true;
}
