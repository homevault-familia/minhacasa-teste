// MinhaCasa — service worker (funciona offline para abrir o app; dados vêm do Firebase)
var CACHE = 'minhacasa-v2.35.35';
var ARQUIVOS = ['./', 'index.html', 'app.js', 'banco.js', 'i18n.js', 'i18n-en.js', 'i18n-fr.js', 'config.js', 'manifest.json', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Rede primeiro (para pegar atualizações), cache se estiver offline. Só arquivos do próprio app.
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    // no-cache em TUDO, inclusive na página (24/11/2026): antes a página vinha da cópia do navegador (até 10 min)
    // enquanto o app.js vinha novo, e a tela aparecia sem o estilo novo
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
      return r;
    }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); }); })
  );
});
