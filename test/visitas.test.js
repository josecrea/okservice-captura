import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirVisita, ordenarVisitas, pesoTotal, formatearPeso, fechaCorta } from '../js/visitas.js';

const catalogo = [
  { id: 'irve', titulo: 'Punto de recarga', icono: '🔌', partida: '13.1' },
  { id: 'cie', titulo: 'Boletín CIE', icono: '📄', partida: '9.1' }
];

const visita = {
  id: 'irve-100', guion: 'irve', cliente: 'Comunidad Los Cristianos',
  creada: '2026-09-25T09:00:00.000Z',
  respuestas: {
    fachada: { valor: {}, origen: 'foto', bytes: 350000 },
    cuadro: { valor: {}, origen: 'foto', bytes: 280000 },
    metros: { valor: 14, origen: 'tecleado' },
    altura: { valor: null, origen: 'no_pudo' }
  }
};

test('el resumen pone nombre y icono de la actividad', () => {
  const r = resumirVisita(visita, catalogo);
  assert.equal(r.titulo, 'Punto de recarga');
  assert.equal(r.icono, '🔌');
});

test('el resumen cuenta fotos, datos y lo que no se pudo', () => {
  const r = resumirVisita(visita, catalogo);
  assert.equal(r.fotos, 2);
  assert.equal(r.datos, 4, 'el «no he podido» también es un dato de la visita');
  assert.equal(r.sinResolver, 1);
});

test('el resumen suma lo que ocupan las fotos', () => {
  assert.equal(resumirVisita(visita, catalogo).bytes, 630000);
});

test('una visita de una actividad que ya no está en el catálogo no se pierde', () => {
  const r = resumirVisita({ ...visita, guion: 'retirada' }, catalogo);
  assert.equal(r.titulo, 'retirada', 'sigue siendo visible aunque no se reconozca la actividad');
  assert.equal(r.icono, '📋');
});

test('las visitas salen de la más reciente a la más vieja', () => {
  const vieja = { ...visita, id: 'irve-1', creada: '2026-09-20T08:00:00.000Z' };
  const orden = ordenarVisitas([vieja, visita]).map(v => v.id);
  assert.deepEqual(orden, ['irve-100', 'irve-1']);
});

test('ordenar no toca el array que recibe', () => {
  const vieja = { ...visita, id: 'irve-1', creada: '2026-09-20T08:00:00.000Z' };
  const original = [vieja, visita];
  ordenarVisitas(original);
  assert.equal(original[0].id, 'irve-1', 'ordenar devuelve una lista nueva, no reordena la de dentro');
});

test('el peso total suma todas las visitas', () => {
  assert.equal(pesoTotal([visita, visita]), 1260000);
});

test('el peso se lee en la unidad que toca', () => {
  assert.equal(formatearPeso(0), '0 KB');
  assert.equal(formatearPeso(900), '900 B');
  assert.equal(formatearPeso(350000), '342 KB');
  assert.equal(formatearPeso(4300000), '4,1 MB');
});

test('la fecha se lee como se habla en obra', () => {
  const ahora = new Date('2026-09-25T18:00:00');
  assert.match(fechaCorta('2026-09-25T09:30:00', ahora), /^hoy /);
  assert.match(fechaCorta('2026-09-24T09:30:00', ahora), /^ayer /);
  assert.equal(fechaCorta('2026-09-20T09:30:00', ahora), '20 sept');
});

test('CONTROL NEGATIVO · una fecha rota no revienta la lista', () => {
  assert.equal(fechaCorta('no es una fecha'), '');
  assert.equal(fechaCorta(null), '');
});

test('CONTROL NEGATIVO · una visita vacía se resume sin inventar nada', () => {
  const r = resumirVisita({ id: 'x', guion: 'irve' }, catalogo);
  assert.equal(r.fotos, 0);
  assert.equal(r.datos, 0);
  assert.equal(r.bytes, 0);
  assert.equal(r.terminada, false);
});

test('CONTROL NEGATIVO · una foto sin peso declarado no inventa bytes', () => {
  const sin = { ...visita, respuestas: { f: { valor: {}, origen: 'foto' } } };
  assert.equal(resumirVisita(sin, catalogo).bytes, 0, 'mejor 0 que un número inventado');
});
