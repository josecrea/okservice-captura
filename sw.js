// Cachea la aplicación para que arranque sin cobertura.
// Sube el número de CACHE cada vez que cambien los ficheros de la lista.
const CACHE = 'okservice-captura-v7';

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
  './js/reanudar.js',
  './js/fotos.js',
  './js/salidas.js',
  './js/visitas.js',
  './js/pantalla-visitas.js',
  './js/credencial.js',
  './js/destino.js',
  './js/destino-github.js',
  './js/nube.js',
  './js/pantalla-ajustes.js',
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

  // Solo se sirve de la caché lo que es de esta aplicación.
  //
  // Las llamadas a la oficina tienen que llegar a la oficina SIEMPRE. Si una
  // respuesta suya se quedara guardada, la aplicación podría dar por subida
  // una visita que no subió — y un respaldo que no existe y nadie sabe que no
  // existe es peor que no tener respaldo.
  const url = new URL(evento.request.url);
  if (url.origin !== self.location.origin) return;

  evento.respondWith(
    caches.match(evento.request).then(guardado => guardado ?? fetch(evento.request))
  );
});
