import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const openAccountAuditSource = extractFunction(main, 'function openAccountAudit');
const state = { filters: { audit: { accounts: ['Anterior'] } } };
const calls = [];
const openAccountAudit = runInNewContext(`${openAccountAuditSource}\nopenAccountAudit;`, {
  persistFiltersSoon: () => calls.push('persist'),
  setView: view => calls.push(`view:${view}`),
  state
});

openAccountAudit('Cuenta principal');
assert.deepEqual([...state.filters.audit.accounts], ['Cuenta principal']);
assert.deepEqual(calls, ['view:audit', 'persist'],
  'the visible account action must preserve the prior filter, navigation and persistence behavior exactly once');

console.log('task4-account-audit-interaction.test.mjs passed');

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must remain available`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${signature} must have a complete body`);
}
