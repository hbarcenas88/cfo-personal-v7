const CACHE_NAME = 'cfo-personal-v7-cache-37';
const APP_BASE = new URL('./', self.location.href);
const appUrl = path => new URL(path, APP_BASE).href;
const APP_SHELL = [
  './',
  './index.html',
  './ui-kit.html',
  './manifest.webmanifest',
  './styles/base.css',
  './styles/components.css',
  './styles/screens.css',
  './src/main.js',
  './src/state.js',
  './src/icons.js',
  './src/utils/format.js',
  './src/services/storageService.js',
  './src/services/financeService.js',
  './src/services/importExportService.js',
  './src/services/backupService.js',
  './src/services/healthService.js',
  './src/services/periodService.js',
  './src/components/ui.js',
  './src/components/keypad.js',
  './src/components/calendar.js',
  './src/components/periodPicker.js',
  './src/screens/onboarding.js',
  './src/screens/balances.js',
  './src/screens/summary.js',
  './src/screens/categories.js',
  './src/screens/audit.js',
  './src/screens/settings.js',
  './src/screens/recordFlow.js',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
].map(appUrl);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(
      APP_SHELL.map(async asset => {
        const response = await fetch(asset, { cache: 'no-store' });
        if (!response.ok || response.status === 206) {
          throw new Error(`Precache failed (${response.status}) for ${asset}`);
        }
        await cache.put(asset, response);
      })
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('cfo-personal-v7-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(APP_BASE.href)) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(async response => {
      if (response.ok && response.status !== 206) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const copy = response.clone();
          await cache.put(event.request, copy);
        } catch {
          // A fresh network response remains usable even when its cache write fails.
        }
      }
      return response;
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match(appUrl('./index.html'));
      return caches.match(event.request);
    })
  );
});
