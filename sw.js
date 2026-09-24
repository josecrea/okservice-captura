// Cachea la aplicación para que arranque sin cobertura.
// Sube el número de CACHE cada vez que cambien los ficheros de la lista.
const CACHE = 'okservice-captura-v3';

const FICHEROS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/ejes.js',
  './js/guion.js',
  './js/compuerta.js',
  './js/comprimir.js',
  './js/almacen.js',
  './js/informe.js',
  './js/camara.js',
  './guiones/index.json',
  './guiones/irve.json',
  './guiones/cie.json',
  './guiones/aire.json',
  './guiones/averia.json',
  './guiones/suministro.json'
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHEROS)));
  self.skipWaiting();
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(claves =>
      Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    caches.match(evento.request).then(guardado => guardado ?? fetch(evento.request))
  );
});
