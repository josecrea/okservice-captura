import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contarDatos, tieneTrabajo, buscarPendiente, pasoAlQueVolver } from '../js/reanudar.js';

const guion = {
  id: 'irve',
  pasos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
};

const aMedias = {
  id: 'irve-100', guion: 'irve', creada: '2026-09-25T09:00:00.000Z', indice: 1,
  respuestas: { a: { valor: 'foto.jpg', origen: 'foto' } }
};

test('cuenta los datos que el técnico ya resolvió', () => {
  assert.equal(contarDatos(aMedias), 1);
  assert.equal(contarDatos({ respuestas: {} }), 0);
  assert.equal(contarDatos(undefined), 0);
});

test('un «no he podido» cuenta como trabajo hecho', () => {
  const s = { respuestas: { m: { valor: null, origen: 'no_pudo' } } };
  assert.equal(tieneTrabajo(s), true, 'declarar que no se pudo es una decisión de la visita, no un hueco');
});

test('un campo escrito y borrado NO cuenta como trabajo', () => {
  assert.equal(tieneTrabajo({ respuestas: { m: { valor: '', origen: 'tecleado' } } }), false);
});

test('ofrece continuar la visita a medias de esa actividad', () => {
  assert.equal(buscarPendiente([aMedias], 'irve').id, 'irve-100');
});

test('entre dos a medias, ofrece la más reciente', () => {
  const vieja = { ...aMedias, id: 'irve-1', creada: '2026-09-24T08:00:00.000Z' };
  assert.equal(buscarPendiente([vieja, aMedias], 'irve').id, 'irve-100');
});

test('reabre por el paso donde se salió', () => {
  assert.equal(pasoAlQueVolver(guion, aMedias), 1);
});

test('un índice fuera del guion se acota al último paso', () => {
  assert.equal(pasoAlQueVolver(guion, { ...aMedias, indice: 99 }), 2, 'un guion que encogió no puede dejar la pantalla en blanco');
  assert.equal(pasoAlQueVolver(guion, { ...aMedias, indice: -3 }), 0);
  assert.equal(pasoAlQueVolver(guion, { ...aMedias, indice: undefined }), 0);
});

test('CONTROL NEGATIVO · una visita TERMINADA no se ofrece', () => {
  assert.equal(buscarPendiente([aMedias], 'irve').id, 'irve-100', 'partimos de una que sí se ofrece');
  const cerrada = { ...aMedias, terminada: '2026-09-25T10:00:00.000Z' };
  assert.equal(buscarPendiente([cerrada], 'irve'), null, 'su informe ya salió: reabrirla juntaría dos visitas en una');
});

test('CONTROL NEGATIVO · una sesión vacía no se ofrece', () => {
  assert.equal(buscarPendiente([{ ...aMedias, respuestas: {} }], 'irve'), null);
});

test('CONTROL NEGATIVO · no se ofrece la visita de OTRA actividad', () => {
  assert.equal(buscarPendiente([aMedias], 'cie'), null, 'las fotos de un punto de recarga no pueden aparecer en un boletín');
});

test('CONTROL NEGATIVO · sin sesiones guardadas no inventa ninguna', () => {
  assert.equal(buscarPendiente([], 'irve'), null);
  assert.equal(buscarPendiente(undefined, 'irve'), null);
});
