import assert from 'node:assert/strict';
import {
  APP_STORAGE_PREFIX,
  clearFinanceLocalStorage,
  getFinanceLocalStorageKeys,
  getOtherLocalStorageKeys
} from '../src/services/storageService.js';

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  get length() {
    return this.items.size;
  }

  key(index) {
    return Array.from(this.items.keys())[index] || null;
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(String(key), String(value));
  }

  removeItem(key) {
    this.items.delete(String(key));
  }
}

const storage = new MemoryStorage();
storage.setItem('rtg:test', 'do-not-delete');
storage.setItem(`${APP_STORAGE_PREFIX}debug:test`, '{"ok":true}');
storage.setItem('cfo_personal_v7_debug_test', '{"legacy":true}');

assert.deepEqual(getFinanceLocalStorageKeys(storage).sort(), [
  'cfo_personal_v7_debug_test',
  `${APP_STORAGE_PREFIX}debug:test`
].sort());
assert.deepEqual(getOtherLocalStorageKeys(storage), ['rtg:test']);

clearFinanceLocalStorage(storage);

assert.equal(storage.getItem('rtg:test'), 'do-not-delete');
assert.equal(storage.getItem(`${APP_STORAGE_PREFIX}debug:test`), null);
assert.equal(storage.getItem('cfo_personal_v7_debug_test'), null);
