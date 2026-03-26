const CACHE = 'catan-dice-v1.4';
const ASSETS = ['./', './index.html', './style.css', './catan.css', './app.js', './catan.js', './manifest.json', './icon.svg', './sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
