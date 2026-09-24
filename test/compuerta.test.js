import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar } from '../js/compuerta.js';

const guion = {
  id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['ZONA', 'METROS'],
  pasos: [
    { id: 'foto1', tipo: 'foto', titulo: 'Fachada', cierra: ['ZONA'], obligatorio: true },
    { id: 'm', tipo: 'dato', titulo: 'Metros', cierra: ['METROS'], obligatorio: true }
  ]
};

test('con todos los ejes resueltos, permite presupuesto', () => {
  const sesion = { respuestas: { foto1: { valor: 'foto.jpg', origen: 'foto' }, m: { valor: 12, origen: 'tecleado' } } };
  const r = evaluar(guion, sesion);
  assert.equal(r.puedePresupuestar, true);
  assert.deepEqual(r.ejesAbiertos, []);
});

test('si falta un eje obligatorio, NO permite presupuesto', () => {
  const r = evaluar(guion, { respuestas: { foto1: { valor: 'foto.jpg', origen: 'foto' } } });
  assert.equal(r.puedePresupuestar, false);
  assert.deepEqual(r.ejesAbiertos, ['METROS']);
});

test('nombra los pasos que hay que completar', () => {
  assert.deepEqual(evaluar(guion, { respuestas: {} }).pasosPendientes.sort(), ['foto1', 'm']);
});

test('una respuesta vacía NO cierra el eje', () => {
  const sesion = { respuestas: { foto1: { valor: 'foto.jpg', origen: 'foto' }, m: { valor: '', origen: 'tecleado' } } };
  assert.equal(evaluar(guion, sesion).puedePresupuestar, false, 'una cadena vacía no puede contar como metros medidos');
});

test('un cero SÍ es una respuesta válida', () => {
  const g = { ...guion, ejesObligatorios: ['METROS'], pasos: [guion.pasos[1]] };
  assert.equal(evaluar(g, { respuestas: { m: { valor: 0, origen: 'tecleado' } } }).puedePresupuestar, true);
});

test('el informe sale siempre, haya huecos o no', () => {
  assert.equal(evaluar(guion, { respuestas: {} }).puedeInformar, true);
  const completa = { respuestas: { foto1: { valor: 'f.jpg', origen: 'foto' }, m: { valor: 9, origen: 'tecleado' } } };
  assert.equal(evaluar(guion, completa).puedeInformar, true);
});

test('CONTROL NEGATIVO · quitar los metros tiene que bloquear el presupuesto', () => {
  const completa = { respuestas: { foto1: { valor: 'f.jpg', origen: 'foto' }, m: { valor: 12, origen: 'tecleado' } } };
  assert.equal(evaluar(guion, completa).puedePresupuestar, true, 'partimos de una sesión que sí presupuesta');
  const rota = { respuestas: { ...completa.respuestas } };
  delete rota.respuestas.m;
  assert.equal(evaluar(guion, rota).puedePresupuestar, false, 'sin metros NO puede presupuestar');
});

test('CONTROL NEGATIVO · un eje opcional sin resolver no bloquea nada', () => {
  const g = { ...guion, pasos: [...guion.pasos, { id: 'alt', tipo: 'foto', titulo: 'Techo', cierra: ['ALTURA'], obligatorio: false }] };
  const sesion = { respuestas: { foto1: { valor: 'f.jpg', origen: 'foto' }, m: { valor: 12, origen: 'tecleado' } } };
  assert.equal(evaluar(g, sesion).puedePresupuestar, true);
});
