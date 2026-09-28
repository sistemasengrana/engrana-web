/* Engrana · service worker
   Guarda la "cáscara" de la app (esta página, íconos y manifiesto) para que abra rápido
   y muestre un aviso si no hay internet. El sistema en sí (Google Apps Script) siempre
   se carga en línea; este archivo no toca sus datos. */
var VERSION = 'engrana-v1';
var CASCARA = ['/', '/index.html', '/manifest.webmanifest', '/icons/favicon.svg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
  '/manager/', '/manager/index.html', '/manager/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CASCARA); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Solo atiende archivos de este dominio. Primero intenta internet (siempre lo más nuevo);
   si no hay conexión, usa la copia guardada. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || caches.match(req.mode === 'navigate' && new URL(req.url).pathname.indexOf('/manager') === 0 ? '/manager/index.html' : '/index.html');
      });
    })
  );
});
