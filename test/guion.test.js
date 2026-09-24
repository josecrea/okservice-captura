import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validarGuion } from '../js/guion.js';

test('acepta un guion mínimo correcto', () => {
  const guion = {
    id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['ZONA'],
    pasos: [{ id: 'p1', tipo: 'foto', titulo: 'Una foto', cierra: ['ZONA'], obligatorio: true }]
  };
  assert.deepEqual(validarGuion(guion), []);
});

test('rechaza un eje que no existe en la tarifa', () => {
  const guion = {
    id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['COLOR'],
    pasos: [{ id: 'p1', tipo: 'foto', titulo: 'Una foto', cierra: ['COLOR'], obligatorio: true }]
  };
  const fallos = validarGuion(guion);
  assert.ok(fallos.some(f => f.includes('COLOR')), `esperaba un fallo por COLOR, salió: ${JSON.stringify(fallos)}`);
});

test('rechaza un eje obligatorio que ningún paso cierra', () => {
  const guion = {
    id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['ZONA', 'METROS'],
    pasos: [{ id: 'p1', tipo: 'foto', titulo: 'Una foto', cierra: ['ZONA'], obligatorio: true }]
  };
  const fallos = validarGuion(guion);
  assert.ok(fallos.some(f => f.includes('METROS')), `esperaba un fallo por METROS, salió: ${JSON.stringify(fallos)}`);
});

test('rechaza dos pasos con el mismo identificador', () => {
  const guion = {
    id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['ZONA'],
    pasos: [
      { id: 'p1', tipo: 'foto', titulo: 'A', cierra: ['ZONA'], obligatorio: true },
      { id: 'p1', tipo: 'foto', titulo: 'B', cierra: [], obligatorio: false }
    ]
  };
  const fallos = validarGuion(guion);
  assert.ok(fallos.some(f => f.includes('p1')), `esperaba un fallo por p1 repetido, salió: ${JSON.stringify(fallos)}`);
});

test('rechaza un tipo de paso desconocido', () => {
  const guion = {
    id: 'prueba', titulo: 'Prueba', ejesObligatorios: ['ZONA'],
    pasos: [{ id: 'p1', tipo: 'video', titulo: 'A', cierra: ['ZONA'], obligatorio: true }]
  };
  const fallos = validarGuion(guion);
  assert.ok(fallos.some(f => f.includes('video')), `esperaba un fallo por tipo video, salió: ${JSON.stringify(fallos)}`);
});

test('el guion real de IRVE es válido', async () => {
  const texto = await readFile(new URL('../guiones/irve.json', import.meta.url), 'utf8');
  assert.deepEqual(validarGuion(JSON.parse(texto)), []);
});

test('el guion de IRVE declara los siete ejes obligatorios de la partida 13.1', async () => {
  const texto = await readFile(new URL('../guiones/irve.json', import.meta.url), 'utf8');
  assert.deepEqual(
    [...JSON.parse(texto).ejesObligatorios].sort(),
    ['CANALIZ', 'EQUIPO', 'METROS', 'OBRA', 'PAPELEO', 'POTENC', 'ZONA']
  );
});
