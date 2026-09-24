import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarGuion } from '../js/guion.js';
import { evaluar, claveCampo } from '../js/compuerta.js';

const conCampos = {
  id: 'p', titulo: 'P', ejesObligatorios: ['POTENC', 'OBRA'],
  pasos: [{
    id: 'contador', tipo: 'foto', titulo: 'Contador', cierra: ['POTENC'], obligatorio: true,
    campos: [
      { id: 'ubicacion', titulo: 'Dónde está', opciones: ['Único en fachada', 'Armario de contadores', 'Dentro de la vivienda'], cierra: [], obligatorio: true },
      { id: 'espacio', titulo: '¿Queda hueco libre?', opciones: ['Sí', 'No', 'Justo'], cierra: ['OBRA'], obligatorio: true }
    ]
  }]
};

test('un guion con campos es válido', () => {
  assert.deepEqual(validarGuion(conCampos), []);
});

test('un campo con menos de dos opciones se rechaza', () => {
  const g = structuredClone(conCampos);
  g.pasos[0].campos[0].opciones = ['Solo una'];
  assert.ok(validarGuion(g).some(f => f.includes('dos opciones')));
});

test('un campo con un eje inventado se rechaza', () => {
  const g = structuredClone(conCampos);
  g.pasos[0].campos[0].cierra = ['COLOR'];
  assert.ok(validarGuion(g).some(f => f.includes('COLOR')));
});

test('dos campos con el mismo id en un paso se rechazan', () => {
  const g = structuredClone(conCampos);
  g.pasos[0].campos[1].id = 'ubicacion';
  assert.ok(validarGuion(g).some(f => f.includes('campo repetido')));
});

test('el eje de un campo cuenta para los obligatorios del guion', () => {
  // OBRA solo lo cierra el campo 'espacio', ningún paso. Tiene que valer.
  assert.deepEqual(validarGuion(conCampos), []);
});

test('la foto sola no basta: falta el desplegable', () => {
  const sesion = { respuestas: { contador: { valor: 'f.jpg', origen: 'foto' } } };
  const r = evaluar(conCampos, sesion);
  assert.equal(r.puedePresupuestar, false, 'OBRA lo cierra el desplegable, no la foto');
  assert.deepEqual(r.ejesAbiertos, ['OBRA']);
  assert.ok(r.pasosPendientes.includes('contador.espacio'));
});

test('foto más desplegables cierra todo', () => {
  const sesion = { respuestas: {
    contador: { valor: 'f.jpg', origen: 'foto' },
    'contador.ubicacion': { valor: 'Armario de contadores', origen: 'tecleado' },
    'contador.espacio': { valor: 'No', origen: 'tecleado' }
  } };
  const r = evaluar(conCampos, sesion);
  assert.equal(r.puedePresupuestar, true);
  assert.deepEqual(r.ejesAbiertos, []);
});

test('CONTROL NEGATIVO · el desplegable cierra su eje aunque la foto no se pudiera hacer', () => {
  // El técnico no pudo fotografiar el contador pero sí sabe si hay hueco.
  // OBRA debe quedar cerrado; POTENC, que dependía de la foto, no.
  const sesion = { respuestas: {
    contador: { valor: null, origen: 'no_pudo' },
    'contador.ubicacion': { valor: 'Armario de contadores', origen: 'tecleado' },
    'contador.espacio': { valor: 'Sí', origen: 'tecleado' }
  } };
  const r = evaluar(conCampos, sesion);
  assert.deepEqual(r.ejesAbiertos, ['POTENC'], 'OBRA lo cerró el desplegable; POTENC dependía de la foto');
});

test('claveCampo compone el identificador con un punto', () => {
  assert.equal(claveCampo({ id: 'contador' }, { id: 'espacio' }), 'contador.espacio');
});
