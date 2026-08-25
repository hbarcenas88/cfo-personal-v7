import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import { runInNewContext } from 'node:vm';

const projectRoot = new URL('../', import.meta.url);

async function applicationFiles(directory, extension) {
  const root = new URL(`${directory}/`, projectRoot);
  const files = [];

  async function visit(current, relative = '') {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(new URL(`${entry.name}/`, current), nextRelative);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(`./${posix.join(directory, nextRelative)}`);
      }
    }
  }

  await visit(root);
  return files.sort();
}

const workerSource = await readFile(new URL('service-worker.js', projectRoot), 'utf8');
const workerContract = runInNewContext(`${workerSource}\n({ cacheName: CACHE_NAME, appShell: APP_SHELL })`, {
  URL,
  Promise,
  self: {
    location: { href: 'https://app.test/' },
    addEventListener: () => {},
    skipWaiting: () => {},
    clients: { claim: () => {} }
  },
  caches: {},
  fetch: () => {}
});

assert.equal(
  workerContract.cacheName,
  'cfo-personal-v7-cache-48',
  'Wave 4 must activate cache-48 before its PWA shell can be released'
);

const actualShell = workerContract.appShell.map(asset => {
  const path = new URL(asset).pathname;
  return path === '/' ? './' : `.${path}`;
});
const expectedShell = [
  './',
  './index.html',
  './ui-kit.html',
  './manifest.webmanifest',
  ...await applicationFiles('styles', '.css'),
  ...await applicationFiles('src', '.js'),
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './assets/vendor/xlsx.full.min.js'
];

const counts = new Map();
for (const asset of actualShell) counts.set(asset, (counts.get(asset) || 0) + 1);
const duplicates = [...counts.entries()]
  .filter(([, count]) => count !== 1)
  .map(([asset]) => asset)
  .sort();

assert.deepEqual(duplicates, [], 'APP_SHELL must list every application asset exactly once');
assert.deepEqual(
  [...actualShell].sort(),
  [...expectedShell].sort(),
  'APP_SHELL must match the complete production application inventory'
);
assert.equal(
  actualShell.some(asset => /(?:^|\/)(?:tests|docs|\.superdesign|\.superpowers)(?:\/|$)|\.(?:md|csv|xlsx|jsonl?|png)$/i.test(asset)),
  false,
  'APP_SHELL must not include tests, documentation, tool artifacts, data files or captures'
);

console.log('pwa-cache-parity.test.mjs passed');
