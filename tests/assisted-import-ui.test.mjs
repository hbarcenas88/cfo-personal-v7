import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles/screens.css', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/services/assistedImportService.js', import.meta.url), 'utf8');

function run(name, assertion) {
  assertion();
  console.log(`PASS ${name}`);
}

run('assisted import renders grouped decisions and equivalent count', () => {
  assert.match(main, /renderAssistedImportReview/);
  assert.match(main, /data-import-group-resolve/);
  assert.match(main, /Aplicar a \$\{group\.count\} equivalentes/);
  assert.match(main, /data-import-choose-existing/);
  assert.match(main, /data-import-choose-create/);
});

run('assisted import exposes row exceptions, duplicate approval and discard', () => {
  assert.match(main, /data-import-row-discard/);
  assert.match(main, /data-import-duplicate-approve/);
  assert.match(main, /data-import-apply-one/);
  assert.match(main, /Transferencia.*no se puede importar/i);
});

run('assisted import confirms a plan and offers one immediate undo', () => {
  assert.match(main, /data-import-confirm-review/);
  assert.match(main, /applyAssistedImportPlan/);
  assert.match(main, /undoAssistedImportBatch/);
  assert.match(main, /Importaci[oó]n CSV deshecha/);
});

run('legacy catalog importer remains available and no native select is introduced', () => {
  assert.match(main, /importCatalog\(draft\.kind, rows\)/);
  assert.doesNotMatch(main, /<select\b/i);
});

run('movements entry targets its own assisted overlay while catalogs keep the legacy overlay', () => {
  assert.match(main, /if \(action === 'import-transactions'\)[\s\S]*openSheet\('import-transactions'\)/);
  assert.match(main, /const catalog = \['accounts', 'categories', 'provisions', 'recurring'\]\.includes\(defaultKind\)/);
  assert.match(main, /const kinds = catalog\s*\?/);
  assert.match(main, /Importar cat/);
  assert.match(main, /if \(!catalog && draft\.rows\) return renderAssistedImportReview\(draft\)/);
});

run('assisted import separates summary confirmation from the irreversible apply', () => {
  assert.match(main, /data-import-confirm-review/);
  assert.match(main, /data-import-final-confirm/);
  assert.match(main, /state\.ui\.importConfirmation/);
  assert.match(main, /confirmAssistedImportDraft\(\)/);
});

run('assisted import preserves the active row and sheet scroll after decisions', () => {
  assert.match(main, /captureInteractionState\(sheetRoot/);
  assert.match(main, /restoreInteractionState\(interactionSnapshot/);
  assert.match(main, /data-import-source-row/);
});

run('assisted import uses a contextual catalog picker for existing values', () => {
  assert.match(main, /data-import-existing-picker/);
  assert.match(main, /openAssistedImportCatalogPicker/);
  assert.match(main, /state\.ui\.optionPicker/);
  assert.match(main, /assistedImportReturnInteraction = captureInteractionState/);
  assert.match(main, /renderAssistedImportPreservingInteraction\(interactionSnapshot\)/);
  assert.match(main, /returnSheet === 'import-transactions'/);
});

run('assisted import row actions target the exact source row', () => {
  assert.match(main, /data-import-row-resolve="match" data-import-row-id="\$\{row\.sourceRow\}"/);
  assert.match(main, /resolveImportGroup\(draft, group\.id, \{ action: create \? 'create' : 'match', value, sourceRow \}, false\)/);
});

run('assisted import account creation exposes type and zero opening balance', () => {
  assert.match(main, /data-import-account-type/);
  assert.match(main, /saldo inicial.*\$0/i);
  assert.match(service, /catalogCreates\(rows, state\)/);
  assert.match(main, /typeName|accountType/);
  assert.match(service, /openingBalance:\s*0/);
});

run('mobile assisted import controls have touch-safe geometry', () => {
  assert.match(styles, /\.assisted-import-group[\s\S]*min-height:\s*44px/);
  assert.match(styles, /\.assisted-import-row-action[\s\S]*min-height:\s*44px/);
  assert.match(styles, /\.assisted-import-review[\s\S]*overflow-wrap:\s*anywhere/);
});
