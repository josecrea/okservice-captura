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
