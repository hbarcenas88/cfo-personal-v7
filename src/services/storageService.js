const DB_NAME = 'cfo_personal_v7';
const DB_VERSION = 1;
const STORE = 'app';
export const APP_STORAGE_PREFIX = 'financeDashboard:';
export const APP_STORAGE_KEYS = {
  debugTest: `${APP_STORAGE_PREFIX}debug:test`
};
const LEGACY_APP_STORAGE_KEYS = new Set([
  'cfo_personal_v7_debug_test'
]);
let dbPromise;

export function isFinanceStorageKey(key = '') {
  return String(key).startsWith(APP_STORAGE_PREFIX) || LEGACY_APP_STORAGE_KEYS.has(String(key));
}

function localStorageKeys(storage = globalThis.localStorage) {
  if (!storage) return [];
  if (typeof storage.key === 'function' && typeof storage.length === 'number') {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
  }
  return Object.keys(storage);
}

export function getFinanceLocalStorageKeys(storage = globalThis.localStorage) {
  return localStorageKeys(storage).filter(isFinanceStorageKey);
}

export function getOtherLocalStorageKeys(storage = globalThis.localStorage) {
  return localStorageKeys(storage).filter(key => !isFinanceStorageKey(key));
}

export function clearFinanceLocalStorage(storage = globalThis.localStorage) {
  if (!storage) return [];
  const keys = getFinanceLocalStorageKeys(storage);
  keys.forEach(key => storage.removeItem(key));
  return keys;
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function loadState() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('state');
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveState(state) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key: 'state', value: state, savedAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearState() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function debugStorageRoundTrip() {
  const db = await openDB();
  const value = { ok: true, at: new Date().toISOString() };
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key: 'debug-test', value, savedAt: value.at });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('debug-test');
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}
