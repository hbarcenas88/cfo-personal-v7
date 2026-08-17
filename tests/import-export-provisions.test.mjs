import assert from 'node:assert/strict';

class MemoryIndexedDB {
  constructor() {
    this.records = new Map();
    this.created = false;
  }

  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = this.database();
      if (!this.created) {
        this.created = true;
        request.onupgradeneeded?.();
      }
      request.onsuccess?.();
    });
    return request;
  }

  database() {
    return {
      objectStoreNames: { contains: () => this.created },
      createObjectStore() {},
      transaction: () => this.transaction()
    };
  }

  transaction() {
    const transaction = {
      objectStore: () => ({
        get: key => {
          const request = {};
          queueMicrotask(() => {
            request.result = structuredClone(this.records.get(key));
            request.onsuccess?.();
          });
          return request;
        },
        put: record => {
          this.records.set(record.key, structuredClone(record));
          queueMicrotask(() => transaction.oncomplete?.());
        }
      })
    };
    return transaction;
  }
}

const previousDocument = globalThis.document;
const previousCustomEvent = globalThis.CustomEvent;
const previousIndexedDB = globalThis.indexedDB;
const previousURL = globalThis.URL;
const previousWindow = globalThis.window;
const downloads = [];
let nextUrl = 0;

globalThis.indexedDB = new MemoryIndexedDB();
globalThis.CustomEvent = class CustomEvent {
  constructor(type) {
    this.type = type;
  }
};
globalThis.URL = {
  createObjectURL(blob) {
    const url = `blob:provision-${nextUrl++}`;
    downloads.push({ url, blob });
    return url;
  },
  revokeObjectURL() {}
};
globalThis.document = {
  body: {
    appendChild() {}
  },
  createElement() {
    return {
      click() {},
      remove() {}
    };
  }
};
globalThis.window = {
  clearTimeout() {},
  dispatchEvent() {},
  setTimeout() { return 0; }
};

try {
  const { exportCSVs, importCatalog, importIssuesV702 } = await import('../src/services/importExportService.js');
  const stateModule = await import('../src/state.js');
  await stateModule.initState();
  stateModule.state.provisions = [];

  await importCatalog('provisions', [{
    nombre: 'Viaje histórico',
    saldo_conceptual: '50',
    planeacion_mensual: '20'
  }]);

  assert.deepEqual(
    stateModule.state.provisions.map(({ name, balance, monthlyAmount, targetAmount, releaseDate, events }) => ({
      name,
      balance,
      monthlyAmount,
      targetAmount,
      releaseDate,
      events
    })),
    [{
      name: 'Viaje histórico',
      balance: 50,
      monthlyAmount: 20,
      targetAmount: 0,
      releaseDate: '',
      events: []
    }],
    'historical provision imports must normalize absent optional planning fields without losing existing values'
  );

  const maliciousReleaseDate = '<img src=x onerror=alert(1)>';
  assert.deepEqual(
    importIssuesV702('provisions', [{ nombre: 'Ataque', fecha_liberacion: maliciousReleaseDate }], stateModule.state),
    [{
      row: { nombre: 'Ataque', fecha_liberacion: maliciousReleaseDate },
      fields: ['Fecha de liberación inválida']
    }],
    'the import preview must identify malformed release dates before import'
  );
  await importCatalog('provisions', [{
    nombre: 'Ataque',
    saldo_conceptual: '10',
    fecha_liberacion: maliciousReleaseDate
  }]);
  assert.equal(
    stateModule.state.provisions.find(provision => provision.name === 'Ataque').releaseDate,
    '',
    'malformed imported release dates must normalize to an empty optional value'
  );

  exportCSVs({
    transactions: [],
    budgets: [],
    accounts: [],
    categories: [],
    provisions: [{
      name: 'Viaje',
      balance: 50,
      monthlyAmount: 20,
      targetAmount: 500,
      releaseDate: '2026-12-15'
    }],
    recurring: []
  });

  const provisionBackup = downloads.find(download => download.blob);
  const csvs = await Promise.all(downloads.map(async download => ({
    url: download.url,
    text: await download.blob.text()
  })));
  const provisions = csvs.find(file => file.text.includes('saldo_conceptual'));
  assert.ok(provisionBackup, 'CSV export must create downloadable files');
  assert.equal(
    provisions.text,
    'nombre,saldo_conceptual,planeacion_mensual,monto_objetivo,fecha_liberacion\r\nViaje,50,20,500,2026-12-15',
    'provision CSV must preserve optional target and release-date fields'
  );
} finally {
  globalThis.CustomEvent = previousCustomEvent;
  globalThis.document = previousDocument;
  globalThis.indexedDB = previousIndexedDB;
  globalThis.URL = previousURL;
  globalThis.window = previousWindow;
}

console.log('import-export-provisions.test.mjs passed');
