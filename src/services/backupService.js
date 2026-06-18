import { datedName, downloadText } from './importExportService.js';
import { restoreSnapshot, showToast } from '../state.js';

export function createBackup(state) {
  const payload = {
    app: 'CFO Personal',
    version: state.version || '7.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      accounts: state.accounts,
      categories: state.categories,
      transactions: state.transactions,
      budgets: state.budgets,
      provisions: state.provisions,
      recurring: state.recurring,
      recurringDone: state.recurringDone,
      rules: state.rules,
      period: state.period,
      filters: state.filters,
      healthDismissed: state.healthDismissed
    }
  };
  const filename = downloadText(datedName('respaldo_cfo_personal', 'json'), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  showToast(`Respaldo JSON creado: ${filename}`);
  return filename;
}

export async function restoreBackupFile(file) {
  if (!file) return false;
  const text = await file.text();
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  await restoreSnapshot(data);
  return true;
}
