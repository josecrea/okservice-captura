import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirInforme } from '../js/informe.js';

const guion = {
  id: 'irve', titulo: 'Punto de recarga de vehículo eléctrico',
  ejesObligatorios: ['ZONA', 'METROS'],
  pasos: [
    { id: 'fachada', tipo: 'foto', titulo: 'Fachada', cierra: ['ZONA'], obligatorio: true },
    { id: 'metros', tipo: 'dato', titulo: 'Metros del recorrido', unidad: 'm', cierra: ['METROS'], obligatorio: true }
  ]
};

const sesionCompleta = {
  creada: '2026-09-24T10:30:00.000Z',
  cliente: 'Comunidad Los Cristianos',
  respuestas: {
    fachada: { valor: 'blob:foto1', origen: 'foto' },
    metros: { valor: 14, origen: 'tecleado' }
  }
};

test('el informe lleva el título de la actividad', () => {
  assert.equal(construirInforme(guion, sesionCompleta).titulo, 'Punto de recarga de vehículo eléctrico');
});

test('con todos los ejes cerrados, no declara huecos', () => {
  const inf = construirInforme(guion, sesionCompleta);
  assert.deepEqual(inf.huecos, []);
  assert.equal(inf.puedePresupuestar, true);
});

test('con un eje abierto, lo declara como hueco', () => {
  const inf = construirInforme(guion, { ...sesionCompleta, respuestas: { fachada: sesionCompleta.respuestas.fachada } });
  assert.deepEqual(inf.huecos, ['METROS']);
  assert.equal(inf.puedePresupuestar, false);
});

test('cada dato lleva su procedencia', () => {
  const inf = construirInforme(guion, sesionCompleta);
  assert.equal(inf.filas.find(f => f.id === 'metros').origen, 'tecleado');
  assert.equal(inf.filas.find(f => f.id === 'fachada').origen, 'foto');
});

test('un paso sin responder aparece marcado como sin resolver', () => {
  const inf = construirInforme(guion, { ...sesionCompleta, respuestas: { fachada: sesionCompleta.respuestas.fachada } });
  assert.equal(inf.filas.find(f => f.id === 'metros').origen, 'sin_resolver');
});

test('el dato numérico lleva su unidad', () => {
  assert.equal(construirInforme(guion, sesionCompleta).filas.find(f => f.id === 'metros').texto, '14 m');
});

test('el HTML pone los huecos antes que ninguna otra cosa', () => {
  const html = construirInforme(guion, { ...sesionCompleta, respuestas: { fachada: sesionCompleta.respuestas.fachada } }).html;
  const posHueco = html.indexOf('METROS');
  const posTabla = html.indexOf('<table');
  assert.ok(posHueco !== -1, 'el hueco tiene que aparecer en el HTML');
  assert.ok(posHueco < posTabla, 'el hueco va antes de la tabla, no enterrado al final');
});

test('el HTML escapa el nombre del cliente', () => {
  const html = construirInforme(guion, { ...sesionCompleta, cliente: 'Pepe & <Hijos>' }).html;
  assert.ok(html.includes('Pepe &amp; &lt;Hijos&gt;'));
  assert.ok(!html.includes('<Hijos>'));
});

test('"no se pudo" se distingue de "se quedó sin responder"', () => {
  const sesion = {
    ...sesionCompleta,
    respuestas: {
      fachada: sesionCompleta.respuestas.fachada,
      metros: { valor: null, origen: 'no_pudo' }
    }
  };
  const inf = construirInforme(guion, sesion);
  const fila = inf.filas.find(f => f.id === 'metros');
  assert.equal(fila.origen, 'no_pudo');
  assert.equal(fila.texto, 'No se pudo resolver');
  assert.deepEqual(inf.huecos, ['METROS'], 'sigue siendo un hueco: el eje no está cerrado');
  assert.equal(inf.puedePresupuestar, false);
});

test('el informe deja ver en el HTML que no se pudo', () => {
  const sesion = {
    ...sesionCompleta,
    respuestas: { fachada: sesionCompleta.respuestas.fachada, metros: { valor: null, origen: 'no_pudo' } }
  };
  assert.ok(construirInforme(guion, sesion).html.includes('no se pudo en la visita'));
});

// ── El informe como documento que se manda al cliente ──────────────────

const UNA_FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

test('las fotos van DENTRO del informe, no enlazadas', () => {
  const html = construirInforme(guion, sesionCompleta, { fachada: UNA_FOTO }).html;
  assert.ok(html.includes(`src="${UNA_FOTO}"`), 'el informe tiene que abrirse sin la app y sin cobertura');
  assert.ok(!html.includes('src="blob:'), 'un blob: muere al cerrar la pestaña');
});

test('cada foto lleva su pie con lo que se pedía fotografiar', () => {
  const html = construirInforme(guion, sesionCompleta, { fachada: UNA_FOTO }).html;
  assert.ok(html.includes('<figcaption>1. Fachada</figcaption>'));
});

test('sin fotos no se pinta una galería vacía', () => {
  const inf = construirInforme(guion, sesionCompleta);
  assert.equal(inf.fotos.length, 0);
  assert.ok(!inf.html.includes('Fotos de la visita'));
});

test('el nombre del fichero se entiende seis meses después', () => {
  const inf = construirInforme(guion, sesionCompleta);
  assert.equal(inf.nombreFichero, 'informe-punto-de-recarga-de-vehiculo-electrico-comunidad-los-cristianos-2026-09-24.html');
});

test('el nombre del fichero no lleva acentos ni espacios', () => {
  const inf = construirInforme(guion, { ...sesionCompleta, cliente: 'Peñón & Cía. (Adeje)' });
  assert.match(inf.nombreFichero, /^[a-z0-9.-]+$/, 'hay clientes de correo que rompen los nombres con acentos');
});

test('el informe lleva el CIF y el número de autorización', () => {
  const html = construirInforme(guion, sesionCompleta).html;
  assert.ok(html.includes('B19430115'), 'sin CIF no es un documento de empresa');
  assert.ok(html.includes('25094'), 'el número de instalador autorizado es lo que lo hace creíble');
});

test('con GPS, el informe enlaza el sitio en el mapa', () => {
  const conGps = { ...sesionCompleta, gps: { lat: 28.0876, lon: -16.6413 } };
  assert.ok(construirInforme(guion, conGps).html.includes('maps.google.com/?q=28.0876,-16.6413'));
});

test('CONTROL NEGATIVO · sin GPS no se inventa una ubicación', () => {
  assert.ok(!construirInforme(guion, sesionCompleta).html.includes('maps.google.com'));
});

test('CONTROL NEGATIVO · el pie de una foto también se escapa', () => {
  const malicioso = { ...guion, pasos: [{ ...guion.pasos[0], titulo: 'Fachada <script>alert(1)</script>' }, guion.pasos[1]] };
  const html = construirInforme(malicioso, sesionCompleta, { fachada: UNA_FOTO }).html;
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
