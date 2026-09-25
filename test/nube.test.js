import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estaSubida, pendientesDe } from '../js/nube.js';

const base = { id: 'a', guion: 'irve', creada: '2026-09-25T09:00:00.000Z', respuestas: {} };
const terminada = { ...base, terminada: '2026-09-25T10:00:00.000Z' };
const yaSubida = { ...terminada, id: 'b', subida: { commit: 'abc', ruta: 'visitas/…' } };

test('una visita con recibo de subida está subida', () => {
  assert.equal(estaSubida(yaSubida), true);
  assert.equal(estaSubida(terminada), false);
});

test('CONTROL NEGATIVO · un recibo sin commit no cuenta como subida', () => {
  assert.equal(estaSubida({ ...terminada, subida: { ruta: 'visitas/x' } }), false,
    'sin commit no hay nada en la oficina, por mucho que haya un objeto ahí');
});

test('las pendientes son las terminadas que aún no subieron', () => {
  assert.deepEqual(pendientesDe([terminada, yaSubida]).map(s => s.id), ['a']);
});

test('CONTROL NEGATIVO · una visita A MEDIAS no se sube', () => {
  assert.deepEqual(pendientesDe([base]), [],
    'subirla haría creer en la oficina que la instalación está vista entera');
});

test('la cola va en el orden en que se hicieron las visitas', () => {
  const tarde = { ...terminada, id: 'tarde', creada: '2026-09-25T16:00:00.000Z' };
  const pronto = { ...terminada, id: 'pronto', creada: '2026-09-25T07:00:00.000Z' };
  assert.deepEqual(pendientesDe([tarde, pronto]).map(s => s.id), ['pronto', 'tarde']);
});

test('CONTROL NEGATIVO · sin visitas no inventa cola', () => {
  assert.deepEqual(pendientesDe([]), []);
  assert.deepEqual(pendientesDe(undefined), []);
});
