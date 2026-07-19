const CACHE_NAME = 'cfo-personal-v7-cache-34';
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
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
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
    fetch(event.request, { cache: 'no-store' }).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => {
      if (event.request.mode === 'navigate') return caches.match(appUrl('./index.html'));
      return caches.match(event.request);
    })
  );
});
