import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDimensiones, LADO_MAXIMO } from '../js/comprimir.js';

test('el lado máximo por defecto es 1600', () => {
  assert.equal(LADO_MAXIMO, 1600);
});

test('reduce una foto apaisada de móvil manteniendo la proporción', () => {
  const r = calcularDimensiones(4032, 3024);
  assert.equal(r.ancho, 1600);
  assert.equal(r.alto, 1200);
});

test('reduce una foto vertical manteniendo la proporción', () => {
  const r = calcularDimensiones(3024, 4032);
  assert.equal(r.ancho, 1200);
  assert.equal(r.alto, 1600);
});

test('no agranda una foto que ya es pequeña', () => {
  const r = calcularDimensiones(800, 600);
  assert.equal(r.ancho, 800);
  assert.equal(r.alto, 600);
});

test('una foto cuadrada queda cuadrada', () => {
  const r = calcularDimensiones(3000, 3000);
  assert.equal(r.ancho, 1600);
  assert.equal(r.alto, 1600);
});

test('devuelve enteros, nunca decimales', () => {
  const r = calcularDimensiones(4001, 3001);
  assert.equal(Number.isInteger(r.ancho), true);
  assert.equal(Number.isInteger(r.alto), true);
});

test('acepta un lado máximo distinto', () => {
  const r = calcularDimensiones(4000, 2000, 800);
  assert.equal(r.ancho, 800);
  assert.equal(r.alto, 400);
});
